import { useImpersonation } from "@/contexts/impersonation-context";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

const BANNER_HEIGHT = "40px";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, endImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <>
      <div style={{ height: BANNER_HEIGHT }} />
      <div 
        className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-4"
        style={{ height: BANNER_HEIGHT }}
        data-testid="impersonation-banner"
      >
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium" data-testid="text-impersonation-user">
          Viewing as: {impersonatedUser.aliasName || impersonatedUser.fullName} ({impersonatedUser.roleName})
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="h-7"
          onClick={() => endImpersonation()}
          data-testid="button-exit-impersonation"
        >
          <X className="h-4 w-4 mr-1" />
          Exit
        </Button>
      </div>
    </>
  );
}

export function useImpersonationOffset() {
  const { isImpersonating } = useImpersonation();
  return isImpersonating ? BANNER_HEIGHT : "0px";
}
