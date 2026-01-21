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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Loader2, CheckCircle2, XCircle, Clock, User } from "lucide-react";

interface DeleteSummaryTable {
  tableName: string;
  count: number;
  description: string;
}

interface UserDeleteSummary {
  userId: string;
  userEmail: string;
  tenantId: string;
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

type DeleteMode = "deactivate" | "deleteUserOnly" | "deleteUserAndData";

interface UserDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  userId: string;
  userEmail: string;
}

export function UserDeleteModal({ open, onOpenChange, tenantId, userId, userEmail }: UserDeleteModalProps) {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<DeleteMode>("deactivate");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const expectedConfirmText = "DELETE USER";

  const { data: summary, isLoading: summaryLoading } = useQuery<UserDeleteSummary>({
    queryKey: ["/api/super-admin/tenants", tenantId, "users", userId, "delete-summary"],
    queryFn: async () => {
      const adminToken = localStorage.getItem("mybizstream_admin_token");
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/users/${userId}/delete-summary`, {
        credentials: "include",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch delete summary");
      return res.json();
    },
    enabled: open && !!tenantId && !!userId,
  });

  const { data: jobStatus } = useQuery<DeleteJob>({
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/super-admin/tenants/${tenantId}/users/${userId}/delete`, {
        mode,
        confirmText,
        reason,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({
        title: "Delete Job Queued",
        description: `The user ${mode === "deactivate" ? "deactivation" : "deletion"} has been queued.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to queue delete job",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setReason("");
      setMode("deactivate");
      setActiveJobId(null);
    }
  }, [open]);

  useEffect(() => {
    if (jobStatus?.status === "completed" || jobStatus?.status === "failed") {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/tenants", tenantId, "users"] });
    }
  }, [jobStatus?.status, tenantId]);

  const isConfirmValid = confirmText === expectedConfirmText && reason.trim().length >= 10;
  const isProcessing = deleteMutation.isPending || Boolean(activeJobId && ["queued", "running"].includes(jobStatus?.status || ""));

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

  const getModeDescription = (m: DeleteMode) => {
    switch (m) {
      case "deactivate":
        return "Disable access without deleting data. User can be reactivated later.";
      case "deleteUserOnly":
        return "Remove user from tenant but keep their created data.";
      case "deleteUserAndData":
        return "Remove user AND all data they created (projects, invoices, etc).";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <User className="h-5 w-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            Delete or deactivate user: <strong>{userEmail}</strong>
          </DialogDescription>
        </DialogHeader>

        {summaryLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24" />
          </div>
        ) : activeJobId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {getJobStatusIcon()}
              <div className="flex-1">
                <p className="font-medium">
                  {jobStatus?.status === "completed" ? "Operation Complete" :
                   jobStatus?.status === "failed" ? "Operation Failed" :
                   jobStatus?.status === "running" ? "Processing..." :
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
            <div className="space-y-3">
              <Label>Delete Mode</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as DeleteMode)}>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 border rounded-lg hover-elevate cursor-pointer" onClick={() => setMode("deactivate")}>
                    <RadioGroupItem value="deactivate" id="mode-deactivate" />
                    <div>
                      <Label htmlFor="mode-deactivate" className="font-medium cursor-pointer">Deactivate Only</Label>
                      <p className="text-sm text-muted-foreground">{getModeDescription("deactivate")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded-lg hover-elevate cursor-pointer" onClick={() => setMode("deleteUserOnly")}>
                    <RadioGroupItem value="deleteUserOnly" id="mode-deleteUserOnly" />
                    <div>
                      <Label htmlFor="mode-deleteUserOnly" className="font-medium cursor-pointer">Remove from Tenant</Label>
                      <p className="text-sm text-muted-foreground">{getModeDescription("deleteUserOnly")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border border-red-200 dark:border-red-800 rounded-lg hover-elevate cursor-pointer" onClick={() => setMode("deleteUserAndData")}>
                    <RadioGroupItem value="deleteUserAndData" id="mode-deleteUserAndData" />
                    <div>
                      <Label htmlFor="mode-deleteUserAndData" className="font-medium cursor-pointer text-red-600 dark:text-red-400">
                        Delete User + Data
                      </Label>
                      <p className="text-sm text-muted-foreground">{getModeDescription("deleteUserAndData")}</p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {mode === "deleteUserAndData" && summary && summary.tables.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                  Data to be Deleted ({summary.totalRecords} records)
                </h4>
                <div className="space-y-1">
                  {summary.tables.map((table) => (
                    <div key={table.tableName} className="flex justify-between text-sm">
                      <span className="text-red-700 dark:text-red-300">{table.description}</span>
                      <Badge variant="destructive" className="text-xs">{table.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (min 10 characters)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this user is being deleted..."
                className="min-h-[80px]"
                data-testid="textarea-delete-reason"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <code className="bg-muted px-1 py-0.5 rounded">{expectedConfirmText}</code> to confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={expectedConfirmText}
                className="font-mono"
                data-testid="input-delete-confirm"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-delete-cancel"
          >
            {activeJobId && jobStatus?.status === "completed" ? "Close" : "Cancel"}
          </Button>
          {!activeJobId && (
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={!isConfirmValid || isProcessing}
              data-testid="button-delete-confirm"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Queueing...
                </>
              ) : (
                mode === "deactivate" ? "Deactivate User" : "Delete User"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
