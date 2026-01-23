import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface DeleteSummaryTable {
  tableName: string;
  count: number;
  description: string;
}

interface TenantDeleteSummary {
  tenantId: string;
  tenantName: string;
  isProtected: boolean;
  tables: DeleteSummaryTable[];
  totalRecords: number;
}

interface DeleteJob {
  id: string;
  targetType: string;
  targetId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  currentStep: string | null;
  summary: Record<string, unknown> | null;
  errorMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface TenantWipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

export function TenantWipeModal({ open, onOpenChange, tenantId, tenantName }: TenantWipeModalProps) {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const expectedConfirmText = `DELETE ${tenantName}`;

  const { data: summary, isLoading: summaryLoading } = useQuery<TenantDeleteSummary>({
    queryKey: ["/api/super-admin/tenants", tenantId, "delete-summary"],
    queryFn: async () => {
      const adminToken = localStorage.getItem("mybizstream_admin_token");
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/delete-summary`, {
        credentials: "include",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch delete summary");
      return res.json();
    },
    enabled: open && !!tenantId,
  });

  const { data: jobStatus, isLoading: jobLoading } = useQuery<DeleteJob>({
    queryKey: ["/api/super-admin/delete-jobs", activeJobId],
    queryFn: async () => {
      const adminToken = localStorage.getItem("mybizstream_admin_token");
      const res = await fetch(`/api/super-admin/delete-jobs/${activeJobId}`, {
        credentials: "include",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch job status");
      return res.json();
    },
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!activeJobId || !status) return false;
      return ["queued", "running"].includes(status) ? 2000 : false;
    },
  });

  const wipeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/super-admin/tenants/${tenantId}/wipe`, {
        confirmText,
        reason,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({
        title: "Wipe Job Queued",
        description: "The tenant data wipe has been queued for processing.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to queue wipe job",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setReason("");
      setActiveJobId(null);
    }
  }, [open]);

  useEffect(() => {
    if (jobStatus?.status === "completed" || jobStatus?.status === "failed") {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tenants"] });
    }
  }, [jobStatus?.status, tenantId]);

  const isConfirmValid = confirmText.trim() === expectedConfirmText.trim() && reason.trim().length >= 10;
  const isProcessing = wipeMutation.isPending || Boolean(activeJobId && ["queued", "running"].includes(jobStatus?.status || ""));

  // Debug log for validation state
  console.log("[TenantWipeModal] Validation:", {
    confirmText: confirmText.trim(),
    expectedConfirmText: expectedConfirmText.trim(),
    confirmMatch: confirmText.trim() === expectedConfirmText.trim(),
    reasonLength: reason.trim().length,
    isConfirmValid,
    isProcessing,
    summaryProtected: summary?.isProtected,
  });

  const getJobStatusIcon = () => {
    if (!jobStatus) return <Clock className="h-5 w-5 text-muted-foreground" />;
    switch (jobStatus.status) {
      case "queued": return <Clock className="h-5 w-5 text-yellow-500" />;
      case "running": return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "completed": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Wipe Tenant Data
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete ALL data for this tenant. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {summaryLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
          </div>
        ) : summary?.isProtected ? (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              This tenant is protected and cannot be wiped.
            </p>
          </div>
        ) : activeJobId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {getJobStatusIcon()}
              <div className="flex-1">
                <p className="font-medium">
                  {jobStatus?.status === "completed" ? "Wipe Complete" :
                   jobStatus?.status === "failed" ? "Wipe Failed" :
                   jobStatus?.status === "running" ? "Wiping Data..." :
                   "Queued for Processing"}
                </p>
                {jobStatus?.currentStep && (
                  <p className="text-sm text-muted-foreground">{jobStatus.currentStep}</p>
                )}
              </div>
            </div>
            <Progress value={jobStatus?.progress || 0} className="h-2" />
            {jobStatus?.errorMessage && (
              <p className="text-sm text-destructive">{jobStatus.errorMessage}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                Data to be Deleted ({summary?.totalRecords || 0} records)
              </h4>
              <div className="space-y-1">
                {summary?.tables.map((table) => (
                  <div key={table.tableName} className="flex justify-between text-sm">
                    <span className="text-red-700 dark:text-red-300">{table.description}</span>
                    <Badge variant="destructive" className="text-xs">{table.count}</Badge>
                  </div>
                ))}
                {(!summary?.tables || summary.tables.length === 0) && (
                  <p className="text-sm text-muted-foreground">No data found to delete.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for deletion (min 10 characters)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this tenant data is being deleted..."
                className="min-h-[80px]"
                data-testid="textarea-wipe-reason"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <code className="bg-muted px-1 py-0.5 rounded">{expectedConfirmText}</code> to confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => {
                  console.log("[TenantWipeModal] Confirm input changed:", e.target.value);
                  setConfirmText(e.target.value);
                }}
                placeholder="Type the confirmation text above..."
                className={`font-mono ${isConfirmValid ? 'border-green-500' : confirmText.length > 0 ? 'border-yellow-500' : ''}`}
                data-testid="input-wipe-confirm"
              />
              {confirmText.length > 0 && !isConfirmValid && (
                <p className="text-xs text-muted-foreground">
                  {confirmText.trim() === expectedConfirmText.trim() 
                    ? "Confirmation matches! Ensure reason has at least 10 characters." 
                    : `Current input: "${confirmText}"`}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-wipe-cancel"
          >
            {activeJobId && jobStatus?.status === "completed" ? "Close" : "Cancel"}
          </Button>
          {!activeJobId && !summary?.isProtected && (
            <Button
              variant="destructive"
              onClick={() => wipeMutation.mutate()}
              disabled={!isConfirmValid || isProcessing}
              data-testid="button-wipe-confirm"
            >
              {wipeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Queueing...
                </>
              ) : (
                "Wipe All Data"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
