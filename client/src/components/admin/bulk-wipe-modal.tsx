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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
}

interface WipeResult {
  tenantId: string;
  tenantName: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

interface BulkWipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  reason: string;
}

export function BulkWipeModal({ open, onOpenChange, tenants, reason }: BulkWipeModalProps) {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [wipeResults, setWipeResults] = useState<WipeResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const expectedConfirmText = `WIPE ${tenants.length} TENANTS`;

  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setIsProcessing(false);
      setWipeResults([]);
      setCurrentIndex(0);
    } else {
      setWipeResults(tenants.map(t => ({
        tenantId: t.id,
        tenantName: t.name,
        status: "pending" as const,
      })));
    }
  }, [open, tenants]);

  const isConfirmValid = confirmText.trim() === expectedConfirmText.trim();

  const processNextTenant = async () => {
    if (currentIndex >= tenants.length) {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tenants"] });
      toast({
        title: "Bulk Wipe Complete",
        description: `Processed ${tenants.length} tenant${tenants.length !== 1 ? 's' : ''}.`,
      });
      return;
    }

    const tenant = tenants[currentIndex];
    
    setWipeResults(prev => prev.map((r, i) => 
      i === currentIndex ? { ...r, status: "processing" as const } : r
    ));

    try {
      const adminToken = localStorage.getItem("mybizstream_admin_token");
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/wipe`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
        body: JSON.stringify({
          confirmText: `DELETE ${tenant.name}`,
          reason,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to wipe tenant: ${res.statusText}`);
      }

      setWipeResults(prev => prev.map((r, i) => 
        i === currentIndex ? { ...r, status: "completed" as const } : r
      ));
    } catch (error) {
      setWipeResults(prev => prev.map((r, i) => 
        i === currentIndex ? { 
          ...r, 
          status: "failed" as const, 
          error: error instanceof Error ? error.message : "Unknown error" 
        } : r
      ));
    }

    setCurrentIndex(prev => prev + 1);
  };

  useEffect(() => {
    if (isProcessing && currentIndex < tenants.length) {
      const timer = setTimeout(processNextTenant, 500);
      return () => clearTimeout(timer);
    } else if (isProcessing && currentIndex >= tenants.length) {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/tenants"] });
    }
  }, [isProcessing, currentIndex]);

  const startBulkWipe = () => {
    setIsProcessing(true);
    setCurrentIndex(0);
    processNextTenant();
  };

  const completedCount = wipeResults.filter(r => r.status === "completed").length;
  const failedCount = wipeResults.filter(r => r.status === "failed").length;
  const progressPercent = tenants.length > 0 ? (completedCount + failedCount) / tenants.length * 100 : 0;

  const getStatusIcon = (status: WipeResult["status"]) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "processing": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isProcessing && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Bulk Wipe Tenant Data
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete ALL data for {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {!isProcessing && wipeResults.every(r => r.status === "pending") ? (
          <div className="space-y-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">
                Tenants to be wiped ({tenants.length}):
              </p>
              <ScrollArea className="h-[120px]">
                <div className="space-y-1">
                  {tenants.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">{t.id.slice(0, 8)}</Badge>
                      <span className="text-destructive">{t.name}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-confirm">
                Type <code className="bg-muted px-1 py-0.5 rounded">{expectedConfirmText}</code> to confirm
              </Label>
              <Input
                id="bulk-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type the confirmation text above..."
                className={`font-mono ${isConfirmValid ? 'border-green-500' : confirmText.length > 0 ? 'border-yellow-500' : ''}`}
                data-testid="input-bulk-wipe-confirm"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{completedCount + failedCount} / {tenants.length}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
            
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              <div className="space-y-2">
                {wipeResults.map((result) => (
                  <div key={result.tenantId} className="flex items-center gap-2 text-sm">
                    {getStatusIcon(result.status)}
                    <span className={result.status === "failed" ? "text-destructive" : ""}>
                      {result.tenantName}
                    </span>
                    {result.error && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        {result.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {!isProcessing && (
              <div className="flex gap-2 text-sm">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {completedCount} completed
                </Badge>
                {failedCount > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {failedCount} failed
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            data-testid="button-bulk-wipe-cancel"
          >
            {isProcessing ? "Processing..." : wipeResults.some(r => r.status !== "pending") ? "Close" : "Cancel"}
          </Button>
          {wipeResults.every(r => r.status === "pending") && (
            <Button
              variant="destructive"
              onClick={startBulkWipe}
              disabled={!isConfirmValid || isProcessing}
              data-testid="button-bulk-wipe-confirm"
            >
              Wipe All {tenants.length} Tenant{tenants.length !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
