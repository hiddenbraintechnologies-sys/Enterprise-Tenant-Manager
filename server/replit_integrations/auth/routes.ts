import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { db } from "../../db";
import { userTenants, tenants } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getCanonicalDashboardRoute } from "../../core/dashboard-access";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user with tenant info
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [defaultTenantRelation] = await db.select()
        .from(userTenants)
        .where(and(
          eq(userTenants.userId, userId),
          eq(userTenants.isDefault, true)
        ));

      let tenant = null;
      let dashboardRoute = "/dashboard/service";
      if (defaultTenantRelation) {
        const [tenantData] = await db.select()
          .from(tenants)
          .where(eq(tenants.id, defaultTenantRelation.tenantId));
        if (tenantData) {
          tenant = {
            id: tenantData.id,
            name: tenantData.name,
            businessType: tenantData.businessType,
            businessTypeLocked: tenantData.businessTypeLocked,
            onboardingCompleted: tenantData.onboardingCompleted,
          };
          dashboardRoute = getCanonicalDashboardRoute(tenantData.businessType || "service");
        }
      }

      res.json({ ...user, tenant, dashboardRoute });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
