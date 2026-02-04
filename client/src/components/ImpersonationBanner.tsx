import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ImpersonationStatus {
  isImpersonating: boolean;
  realUserId: string | null;
  actingUserId: string | null;
}

export function ImpersonationBanner() {
  const queryClient = useQueryClient();

  const { data: status } = useQuery<ImpersonationStatus>({
    queryKey: ["/api/security/impersonate/status"],
  });

  const exitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/security/impersonate/exit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security/impersonate/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.reload();
    },
  });

  if (!status?.isImpersonating) {
    return null;
  }

  return (
    <div 
      className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100 px-4 py-2 flex items-center justify-between gap-4 border-b border-yellow-200 dark:border-yellow-800"
      data-testid="banner-impersonation"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          You are viewing as another user. Actions will be performed as them.
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => exitMutation.mutate()}
        disabled={exitMutation.isPending}
        className="bg-yellow-50 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-200 dark:hover:bg-yellow-800"
        data-testid="button-exit-impersonation"
      >
        <X className="h-4 w-4 mr-1" />
        Exit Impersonation
      </Button>
    </div>
  );
}
