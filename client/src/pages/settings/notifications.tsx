import { SettingsLayout } from "@/components/settings-layout";
import { NotificationPreferences } from "@/components/notification-preferences";

export default function NotificationsSettings() {
  return (
    <SettingsLayout title="Notifications">
      <NotificationPreferences />
    </SettingsLayout>
  );
}
