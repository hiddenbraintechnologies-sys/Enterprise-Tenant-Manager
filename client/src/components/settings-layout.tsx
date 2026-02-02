import { DashboardLayout } from "@/components/dashboard-layout";

interface SettingsLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function SettingsLayout({ children, title }: SettingsLayoutProps) {
  return (
    <DashboardLayout 
      title={title}
      breadcrumbs={[
        { label: "Settings", href: "/settings" },
        { label: title }
      ]}
    >
      <div className="max-w-3xl">
        {children}
      </div>
    </DashboardLayout>
  );
}
