import { DashboardLayout } from "@/components/dashboard-layout";
import { MyAddons } from "@/components/my-addons";

export default function MyAddonsPage() {
  return (
    <DashboardLayout 
      title="My Add-ons" 
      breadcrumbs={[{ label: "My Add-ons" }]}
    >
      <div className="space-y-6">
        <MyAddons />
      </div>
    </DashboardLayout>
  );
}
