import { db } from "../../db";
import { 
  cases, 
  legalDocuments, 
  caseNotes, 
  caseHearings, 
  caseSummaryJobs,
  type Case,
  type LegalDocument,
  type CaseNote,
  type CaseHearing,
  type CaseSummaryJob,
} from "@shared/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { aiService } from "../ai-service";
import { auditService } from "../audit";
import crypto from "crypto";
import OpenAI from "openai";

const openai = new OpenAI();

interface TimelineEntry {
  date: string;
  event: string;
  description: string;
  significance: "high" | "medium" | "low";
  sourceType: "document" | "note" | "hearing" | "case";
}

interface ActionItem {
  item: string;
  priority: "urgent" | "high" | "medium" | "low";
  dueDate?: string;
  assignee?: string;
  status: "pending" | "in_progress" | "completed";
  category: string;
}

interface KeyFinding {
  finding: string;
  relevance: string;
  sourceType: string;
}

interface RiskFactor {
  risk: string;
  severity: "high" | "medium" | "low";
  mitigation?: string;
}

interface CaseSummarizationResult {
  jobId: string;
  caseId: string;
  caseSummary: string;
  timeline: TimelineEntry[];
  actionItems: ActionItem[];
  keyFindings: KeyFinding[];
  riskFactors: RiskFactor[];
  aiGenerated: boolean;
  aiModel?: string;
  consentVersion?: string;
  cacheHit: boolean;
  documentCount: number;
  noteCount: number;
  hearingCount: number;
}

interface CaseMaterials {
  caseRecord: Case;
  documents: LegalDocument[];
  notes: CaseNote[];
  hearings: CaseHearing[];
}

class LegalCaseSummarizationService {
  private generateSnapshotHash(materials: CaseMaterials): string {
    const payload = {
      caseId: materials.caseRecord.id,
      caseUpdatedAt: materials.caseRecord.updatedAt?.toISOString(),
      documents: materials.documents.map(d => ({
        id: d.id,
        updatedAt: d.updatedAt?.toISOString(),
      })).sort((a, b) => a.id.localeCompare(b.id)),
      notes: materials.notes.map(n => ({
        id: n.id,
        updatedAt: n.updatedAt?.toISOString(),
      })).sort((a, b) => a.id.localeCompare(b.id)),
      hearings: materials.hearings.map(h => ({
        id: h.id,
        updatedAt: h.updatedAt?.toISOString(),
      })).sort((a, b) => a.id.localeCompare(b.id)),
    };
    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").substring(0, 64);
  }

  private async fetchCaseMaterials(tenantId: string, caseId: string): Promise<CaseMaterials | null> {
    const [caseRecord] = await db.select()
      .from(cases)
      .where(and(
        eq(cases.id, caseId),
        eq(cases.tenantId, tenantId),
        isNull(cases.deletedAt)
      ));

    if (!caseRecord) {
      return null;
    }

    const [documents, notes, hearings] = await Promise.all([
      db.select()
        .from(legalDocuments)
        .where(and(
          eq(legalDocuments.caseId, caseId),
          eq(legalDocuments.tenantId, tenantId),
          isNull(legalDocuments.deletedAt)
        ))
        .orderBy(desc(legalDocuments.createdAt)),
      
      db.select()
        .from(caseNotes)
        .where(and(
          eq(caseNotes.caseId, caseId),
          eq(caseNotes.tenantId, tenantId),
          isNull(caseNotes.deletedAt)
        ))
        .orderBy(desc(caseNotes.createdAt)),
      
      db.select()
        .from(caseHearings)
        .where(and(
          eq(caseHearings.caseId, caseId),
          eq(caseHearings.tenantId, tenantId),
          isNull(caseHearings.deletedAt)
        ))
        .orderBy(desc(caseHearings.hearingDate)),
    ]);

    return { caseRecord, documents, notes, hearings };
  }

  private async checkCachedResult(tenantId: string, caseId: string, snapshotHash: string): Promise<CaseSummaryJob | null> {
    const [cached] = await db.select()
      .from(caseSummaryJobs)
      .where(and(
        eq(caseSummaryJobs.tenantId, tenantId),
        eq(caseSummaryJobs.caseId, caseId),
        eq(caseSummaryJobs.inputSnapshotHash, snapshotHash),
        eq(caseSummaryJobs.status, "completed")
      ))
      .orderBy(desc(caseSummaryJobs.createdAt))
      .limit(1);

    return cached || null;
  }

  private composePrompt(materials: CaseMaterials): string {
    const c = materials.caseRecord;
    
    let prompt = `You are a legal assistant analyzing a case. Provide a comprehensive summary based ONLY on the information provided below. Do not fabricate any information or reference external sources.

## CASE INFORMATION
Case Number: ${c.caseNumber || "N/A"}
Title: ${c.title}
Description: ${c.description || "No description provided"}
Practice Area: ${c.practiceArea || "N/A"}
Case Type: ${c.caseType || "N/A"}
Court: ${c.courtName || "N/A"}
Court Case Number: ${c.courtCaseNumber || "N/A"}
Jurisdiction: ${c.jurisdiction || "N/A"}
Judge: ${c.judge || "N/A"}
Filing Date: ${c.filingDate || "N/A"}
Status: ${c.status || "N/A"}
Priority: ${c.priority || "N/A"}

`;

    if (materials.documents.length > 0) {
      prompt += `## CASE DOCUMENTS (${materials.documents.length} documents)\n`;
      materials.documents.forEach((doc, i) => {
        const isRedacted = doc.isPrivileged || doc.confidentialityLevel === "privileged" || doc.confidentialityLevel === "highly_restricted";
        prompt += `
Document ${i + 1}:
- Title: ${doc.title}
- Type: ${doc.documentType || "N/A"}
- Date: ${doc.documentDate || doc.createdAt?.toISOString().split("T")[0] || "N/A"}
- Description: ${isRedacted ? "[PRIVILEGED - CONTENT REDACTED]" : (doc.description || "No description")}
`;
      });
    }

    if (materials.notes.length > 0) {
      prompt += `\n## CASE NOTES (${materials.notes.length} notes)\n`;
      materials.notes.forEach((note, i) => {
        const isRedacted = note.isPrivileged || note.isConfidential;
        prompt += `
Note ${i + 1}:
- Title: ${note.title || "Untitled"}
- Type: ${note.noteType || "general"}
- Date: ${note.createdAt?.toISOString().split("T")[0] || "N/A"}
- Content: ${isRedacted ? "[PRIVILEGED - CONTENT REDACTED]" : note.content}
`;
      });
    }

    if (materials.hearings.length > 0) {
      prompt += `\n## HEARINGS HISTORY (${materials.hearings.length} hearings)\n`;
      materials.hearings.forEach((hearing, i) => {
        prompt += `
Hearing ${i + 1}:
- Date: ${hearing.hearingDate?.toISOString().split("T")[0] || "N/A"}
- Type: ${hearing.hearingType || "N/A"}
- Location: ${hearing.location || "N/A"}
- Judge: ${hearing.judgeName || "N/A"}
- Status: ${hearing.status || "N/A"}
- Outcome: ${hearing.outcome || "Pending/Not recorded"}
- Outcome Notes: ${hearing.outcomeNotes || "N/A"}
`;
      });
    }

    prompt += `
## INSTRUCTIONS
Based ONLY on the information above, provide:

1. CASE SUMMARY: A comprehensive 2-3 paragraph summary of the case, its current status, and key aspects.

2. TIMELINE: A chronological list of significant events with dates, descriptions, and significance (high/medium/low).

3. ACTION ITEMS: Recommended next steps with priority levels (urgent/high/medium/low), suggested due dates if applicable, and categories.

4. KEY FINDINGS: Important observations from the case materials with their relevance.

5. RISK FACTORS: Potential risks or concerns with severity levels and possible mitigations.

Respond in valid JSON format with this structure:
{
  "caseSummary": "string",
  "timeline": [{"date": "YYYY-MM-DD", "event": "string", "description": "string", "significance": "high|medium|low", "sourceType": "document|note|hearing|case"}],
  "actionItems": [{"item": "string", "priority": "urgent|high|medium|low", "dueDate": "YYYY-MM-DD or null", "category": "string", "status": "pending"}],
  "keyFindings": [{"finding": "string", "relevance": "string", "sourceType": "string"}],
  "riskFactors": [{"risk": "string", "severity": "high|medium|low", "mitigation": "string or null"}]
}

IMPORTANT: 
- Only use information from the provided context
- Do not fabricate dates, names, or events
- Mark timeline items with their source type
- Be specific and actionable in recommendations`;

    return prompt;
  }

  private async callAiForSummarization(prompt: string): Promise<{
    caseSummary: string;
    timeline: TimelineEntry[];
    actionItems: ActionItem[];
    keyFindings: KeyFinding[];
    riskFactors: RiskFactor[];
    tokensUsed: number;
  } | null> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a legal case analysis assistant. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      const tokensUsed = (response.usage?.total_tokens || 0);

      return {
        caseSummary: parsed.caseSummary || "Unable to generate summary",
        timeline: (parsed.timeline || []).map((t: any) => ({
          date: t.date || "",
          event: t.event || "",
          description: t.description || "",
          significance: t.significance || "medium",
          sourceType: t.sourceType || "case",
        })),
        actionItems: (parsed.actionItems || []).map((a: any) => ({
          item: a.item || "",
          priority: a.priority || "medium",
          dueDate: a.dueDate || undefined,
          assignee: a.assignee || undefined,
          status: a.status || "pending",
          category: a.category || "general",
        })),
        keyFindings: (parsed.keyFindings || []).map((k: any) => ({
          finding: k.finding || "",
          relevance: k.relevance || "",
          sourceType: k.sourceType || "case",
        })),
        riskFactors: (parsed.riskFactors || []).map((r: any) => ({
          risk: r.risk || "",
          severity: r.severity || "medium",
          mitigation: r.mitigation || undefined,
        })),
        tokensUsed,
      };
    } catch (error: any) {
      console.error("AI summarization error:", error);
      return null;
    }
  }

  private shouldMaskAiContent(jobConsentVersion: string | null | undefined, currentConsentVersion: string | null | undefined): boolean {
    if (!jobConsentVersion || !currentConsentVersion) return true;
    const jobMajor = parseInt(jobConsentVersion.split(".")[0] || "0");
    const currentMajor = parseInt(currentConsentVersion.split(".")[0] || "0");
    return currentMajor > jobMajor;
  }

  private maskJobContent(job: CaseSummaryJob): CaseSummaryJob {
    return {
      ...job,
      caseSummary: "[AI content masked - consent revoked]",
      timeline: [],
      actionItems: [],
      keyFindings: [],
      riskFactors: [],
    };
  }

  async summarizeCase(
    tenantId: string,
    caseId: string,
    requestedBy: string,
    accessReason?: string
  ): Promise<CaseSummarizationResult> {
    const consent = await aiService.checkAiConsent(tenantId);
    const featureAllowed = await aiService.checkFeatureAllowed(tenantId, "case_summarization");

    const materials = await this.fetchCaseMaterials(tenantId, caseId);
    if (!materials) {
      throw new Error("Case not found or access denied");
    }

    await auditService.logAsync({
      tenantId,
      userId: requestedBy,
      action: "access",
      resource: "legal_case_materials",
      resourceId: caseId,
      metadata: {
        documentCount: materials.documents.length,
        noteCount: materials.notes.length,
        hearingCount: materials.hearings.length,
        accessReason: accessReason || "case_summarization",
        hasPrivilegedDocs: materials.documents.some(d => d.isPrivileged),
        hasPrivilegedNotes: materials.notes.some(n => n.isPrivileged),
      },
    });

    const snapshotHash = this.generateSnapshotHash(materials);

    const cached = await this.checkCachedResult(tenantId, caseId, snapshotHash);
    if (cached && cached.aiGenerated) {
      if (this.shouldMaskAiContent(cached.consentVersion, consent.consentVersion)) {
        const maskedCached = this.maskJobContent(cached);
        return {
          jobId: maskedCached.id,
          caseId,
          caseSummary: maskedCached.caseSummary || "",
          timeline: maskedCached.timeline as TimelineEntry[],
          actionItems: maskedCached.actionItems as ActionItem[],
          keyFindings: maskedCached.keyFindings as KeyFinding[],
          riskFactors: maskedCached.riskFactors as RiskFactor[],
          aiGenerated: false,
          cacheHit: true,
          documentCount: cached.documentCount || 0,
          noteCount: cached.noteCount || 0,
          hearingCount: cached.hearingCount || 0,
        };
      }

      return {
        jobId: cached.id,
        caseId,
        caseSummary: cached.caseSummary || "",
        timeline: cached.timeline as TimelineEntry[],
        actionItems: cached.actionItems as ActionItem[],
        keyFindings: cached.keyFindings as KeyFinding[],
        riskFactors: cached.riskFactors as RiskFactor[],
        aiGenerated: cached.aiGenerated || false,
        aiModel: cached.aiModel || undefined,
        consentVersion: cached.consentVersion || undefined,
        cacheHit: true,
        documentCount: cached.documentCount || 0,
        noteCount: cached.noteCount || 0,
        hearingCount: cached.hearingCount || 0,
      };
    }

    const [pendingJob] = await db.insert(caseSummaryJobs).values({
      tenantId,
      caseId,
      status: "processing",
      inputSnapshotHash: snapshotHash,
      documentCount: materials.documents.length,
      noteCount: materials.notes.length,
      hearingCount: materials.hearings.length,
      requestedBy,
    }).returning();

    let result: CaseSummarizationResult;

    if (consent.allowed && featureAllowed) {
      const rateCheck = await aiService.checkRateLimit(tenantId);
      const tokenCheck = await aiService.checkTokenQuota(tenantId, 5000);

      if (rateCheck.allowed && tokenCheck) {
        const prompt = this.composePrompt(materials);
        const promptHash = crypto.createHash("sha256").update(prompt).digest("hex").substring(0, 64);
        
        const startTime = Date.now();
        const aiResult = await this.callAiForSummarization(prompt);
        const latencyMs = Date.now() - startTime;

        if (aiResult) {
          const responseHash = crypto.createHash("sha256")
            .update(JSON.stringify(aiResult))
            .digest("hex")
            .substring(0, 64);

          const usageLog = await aiService.logUsage({
            tenantId,
            feature: "case_summarization",
            model: "gpt-4o-mini",
            provider: "openai",
            totalTokens: aiResult.tokensUsed,
            success: true,
            latencyMs,
          });

          await db.update(caseSummaryJobs)
            .set({
              status: "completed",
              caseSummary: aiResult.caseSummary,
              timeline: aiResult.timeline as any,
              actionItems: aiResult.actionItems as any,
              keyFindings: aiResult.keyFindings as any,
              riskFactors: aiResult.riskFactors as any,
              aiGenerated: true,
              aiModel: "gpt-4o-mini",
              aiUsageLogId: usageLog.id,
              consentVersion: consent.consentVersion,
              promptHash,
              responseHash,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(caseSummaryJobs.id, pendingJob.id));

          result = {
            jobId: pendingJob.id,
            caseId,
            caseSummary: aiResult.caseSummary,
            timeline: aiResult.timeline,
            actionItems: aiResult.actionItems,
            keyFindings: aiResult.keyFindings,
            riskFactors: aiResult.riskFactors,
            aiGenerated: true,
            aiModel: "gpt-4o-mini",
            consentVersion: consent.consentVersion,
            cacheHit: false,
            documentCount: materials.documents.length,
            noteCount: materials.notes.length,
            hearingCount: materials.hearings.length,
          };
        } else {
          result = await this.generateFallbackSummary(pendingJob.id, caseId, materials);
        }
      } else {
        result = await this.generateFallbackSummary(pendingJob.id, caseId, materials);
      }
    } else {
      result = await this.generateFallbackSummary(pendingJob.id, caseId, materials);
    }

    await auditService.logAsync({
      tenantId,
      userId: requestedBy,
      action: "create",
      resource: "case_summary_job",
      resourceId: pendingJob.id,
      metadata: {
        caseId,
        aiGenerated: result.aiGenerated,
        aiModel: result.aiModel,
        consentVersion: result.consentVersion,
        documentCount: result.documentCount,
        noteCount: result.noteCount,
        hearingCount: result.hearingCount,
      },
    });

    return result;
  }

  private async generateFallbackSummary(
    jobId: string,
    caseId: string,
    materials: CaseMaterials
  ): Promise<CaseSummarizationResult> {
    const c = materials.caseRecord;
    
    const caseSummary = `Case "${c.title}" (${c.caseNumber || "No case number"}) is a ${c.caseType || "general"} matter in the ${c.practiceArea || "legal"} practice area. ` +
      `The case is currently ${c.status || "open"} with ${c.priority || "normal"} priority. ` +
      `It involves ${materials.documents.length} document(s), ${materials.notes.length} note(s), and ${materials.hearings.length} hearing(s). ` +
      (c.courtName ? `The case is being heard in ${c.courtName}${c.judge ? ` before ${c.judge}` : ""}.` : "") +
      ` AI-powered analysis is not available at this time.`;

    const timeline: TimelineEntry[] = [];

    if (c.filingDate) {
      timeline.push({
        date: c.filingDate,
        event: "Case Filed",
        description: "Case was filed with the court",
        significance: "high",
        sourceType: "case",
      });
    }

    materials.hearings.forEach(h => {
      if (h.hearingDate) {
        timeline.push({
          date: h.hearingDate.toISOString().split("T")[0],
          event: `${h.hearingType || "Hearing"} - ${h.status || "scheduled"}`,
          description: h.outcome || `${h.hearingType} hearing`,
          significance: h.status === "completed" ? "high" : "medium",
          sourceType: "hearing",
        });
      }
    });

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const actionItems: ActionItem[] = [];
    
    if (c.nextHearingDate) {
      actionItems.push({
        item: `Prepare for upcoming hearing on ${c.nextHearingDate}`,
        priority: "high",
        dueDate: c.nextHearingDate,
        status: "pending",
        category: "hearing_preparation",
      });
    }

    if (materials.documents.length === 0) {
      actionItems.push({
        item: "Upload relevant case documents",
        priority: "medium",
        status: "pending",
        category: "documentation",
      });
    }

    await db.update(caseSummaryJobs)
      .set({
        status: "completed",
        caseSummary,
        timeline: timeline as any,
        actionItems: actionItems as any,
        keyFindings: [],
        riskFactors: [],
        aiGenerated: false,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(caseSummaryJobs.id, jobId));

    return {
      jobId,
      caseId,
      caseSummary,
      timeline,
      actionItems,
      keyFindings: [],
      riskFactors: [],
      aiGenerated: false,
      cacheHit: false,
      documentCount: materials.documents.length,
      noteCount: materials.notes.length,
      hearingCount: materials.hearings.length,
    };
  }

  async getSummaryJob(tenantId: string, jobId: string): Promise<CaseSummaryJob | null> {
    const consent = await aiService.checkAiConsent(tenantId);

    const [job] = await db.select()
      .from(caseSummaryJobs)
      .where(and(
        eq(caseSummaryJobs.id, jobId),
        eq(caseSummaryJobs.tenantId, tenantId)
      ));

    if (!job) return null;

    if (job.aiGenerated && this.shouldMaskAiContent(job.consentVersion, consent.consentVersion)) {
      return this.maskJobContent(job);
    }

    return job;
  }

  async getCaseSummaries(tenantId: string, caseId: string): Promise<CaseSummaryJob[]> {
    const consent = await aiService.checkAiConsent(tenantId);

    const jobs = await db.select()
      .from(caseSummaryJobs)
      .where(and(
        eq(caseSummaryJobs.tenantId, tenantId),
        eq(caseSummaryJobs.caseId, caseId)
      ))
      .orderBy(desc(caseSummaryJobs.createdAt));

    return jobs.map(job => {
      if (job.aiGenerated && this.shouldMaskAiContent(job.consentVersion, consent.consentVersion)) {
        return this.maskJobContent(job);
      }
      return job;
    });
  }

  async updateActionItemStatus(
    tenantId: string,
    jobId: string,
    itemIndex: number,
    newStatus: "pending" | "in_progress" | "completed",
    updatedBy: string
  ): Promise<CaseSummaryJob | null> {
    const [job] = await db.select()
      .from(caseSummaryJobs)
      .where(and(
        eq(caseSummaryJobs.id, jobId),
        eq(caseSummaryJobs.tenantId, tenantId)
      ));

    if (!job) return null;

    const actionItems = (job.actionItems as ActionItem[]) || [];
    if (itemIndex < 0 || itemIndex >= actionItems.length) {
      throw new Error("Invalid action item index");
    }

    actionItems[itemIndex].status = newStatus;

    const [updated] = await db.update(caseSummaryJobs)
      .set({
        actionItems: actionItems as any,
        updatedAt: new Date(),
      })
      .where(eq(caseSummaryJobs.id, jobId))
      .returning();

    await auditService.logAsync({
      tenantId,
      userId: updatedBy,
      action: "update",
      resource: "case_summary_action_item",
      resourceId: jobId,
      metadata: {
        itemIndex,
        previousStatus: (job.actionItems as ActionItem[])?.[itemIndex]?.status,
        newStatus,
      },
    });

    return updated;
  }
}

export const caseSummarizationService = new LegalCaseSummarizationService();
