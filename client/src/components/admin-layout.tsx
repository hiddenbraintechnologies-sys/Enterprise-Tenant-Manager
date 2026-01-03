import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminProvider } from "@/contexts/admin-context";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <AdminProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AdminSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-2 bg-background">
              <div className="flex items-center gap-2">
                <SidebarTrigger data-testid="button-admin-sidebar-toggle" />
                <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
              </div>
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto bg-muted/30">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AdminProvider>
  );
}
