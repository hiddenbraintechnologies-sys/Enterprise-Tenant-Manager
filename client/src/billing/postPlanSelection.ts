import { getDefaultDashboardRoute } from "@shared/defaultRoute";
import { useAuthStore } from "@/stores/authStore";

/**
 * Safe post-plan-selection handler
 * 
 * RULE: Never redirect to /dashboard/service or any module after payment.
 * Always go through getDefaultDashboardRoute(user).
 */
export async function handlePlanSelectionSuccess(router: { replace: (path: string) => void }) {
  const auth = useAuthStore.getState();

  try {
    await fetch("/api/auth/finalize-session", {
      method: "POST",
      credentials: "include",
    });

    await auth.refreshUser();

    const user = useAuthStore.getState().user;
    if (!user) {
      router.replace("/login");
      return;
    }

    const target = getDefaultDashboardRoute(user);

    router.replace(target);

  } catch (err) {
    console.error("Post-plan redirect failed", err);
    router.replace("/dashboard");
  }
}
