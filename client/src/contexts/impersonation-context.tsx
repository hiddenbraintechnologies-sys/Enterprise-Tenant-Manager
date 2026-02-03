import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

type ImpersonatedUser = {
  staffId: string;
  fullName: string;
  aliasName?: string | null;
  email: string;
  roleName: string;
};

type ImpersonationContextType = {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  startImpersonation: (staffId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
};

const ImpersonationContext = createContext<ImpersonationContextType | null>(null);

const STORAGE_KEY = "impersonation_staff_id";

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  useEffect(() => {
    const savedStaffId = sessionStorage.getItem(STORAGE_KEY);
    if (savedStaffId) {
      const savedUser = sessionStorage.getItem(`${STORAGE_KEY}_user`);
      if (savedUser) {
        try {
          setImpersonatedUser(JSON.parse(savedUser));
        } catch {
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(`${STORAGE_KEY}_user`);
        }
      }
    }
  }, []);

  const startImpersonation = useCallback(async (staffId: string) => {
    try {
      const res = await apiRequest("POST", "/api/settings/impersonation/start", { staffId });
      const data = await res.json();
      
      if (data.success && data.impersonating) {
        const user: ImpersonatedUser = {
          staffId: data.impersonating.staffId,
          fullName: data.impersonating.fullName || "Unknown",
          aliasName: data.impersonating.aliasName,
          email: data.impersonating.email || "",
          roleName: data.impersonating.roleName || "Unknown",
        };
        
        setImpersonatedUser(user);
        sessionStorage.setItem(STORAGE_KEY, staffId);
        sessionStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(user));
      }
    } catch (error) {
      console.error("Failed to start impersonation:", error);
      throw error;
    }
  }, []);

  const endImpersonation = useCallback(async () => {
    try {
      const staffId = sessionStorage.getItem(STORAGE_KEY);
      await apiRequest("POST", "/api/settings/impersonation/end", { staffId });
      
      setImpersonatedUser(null);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(`${STORAGE_KEY}_user`);
    } catch (error) {
      console.error("Failed to end impersonation:", error);
      setImpersonatedUser(null);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(`${STORAGE_KEY}_user`);
    }
  }, []);

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating: !!impersonatedUser,
      impersonatedUser,
      startImpersonation,
      endImpersonation,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
}

export function getImpersonationHeader(): Record<string, string> {
  const staffId = sessionStorage.getItem(STORAGE_KEY);
  return staffId ? { "X-Impersonate-Staff-Id": staffId } : {};
}
