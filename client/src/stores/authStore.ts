import { create } from "zustand";
import type { Permission, Role } from "@shared/rbac";

type User = {
  id: string;
  role: Role;
  businessType: "CLINIC" | "GENERIC" | string;
  permissions: Permission[];
  onboardingCompleted?: boolean;
};

type AuthState = {
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "idle",

  refreshUser: async () => {
    set({ status: "loading" });

    try {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Unauthorized");

      const user = await res.json();

      set({
        user,
        status: "authenticated",
      });
    } catch {
      set({
        user: null,
        status: "unauthenticated",
      });
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { credentials: "include" });
    set({ user: null, status: "unauthenticated" });
  },
}));
