import { SettingsLayout } from "@/components/settings-layout";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsLayout title="Appearance">
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Appearance</h1>
          <p className="text-sm text-muted-foreground">
            Choose how MyBizStream looks for you
          </p>
        </header>

        <Separator />

        {/* Theme Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Theme</h2>
          <div className="max-w-xs">
            <Label htmlFor="theme" className="sr-only">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger data-testid="select-theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Select light, dark, or follow your system preference
            </p>
          </div>
        </section>
      </div>
    </SettingsLayout>
  );
}
