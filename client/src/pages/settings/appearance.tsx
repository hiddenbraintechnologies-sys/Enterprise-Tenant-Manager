import { SettingsLayout } from "@/components/settings-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/theme-provider";
import { Palette, Monitor, Sun, Moon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsLayout title="Appearance">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle className="text-lg font-medium">Appearance</CardTitle>
          </div>
          <CardDescription>Customize how MyBizStream looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="theme">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-40" data-testid="select-theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            <button
              onClick={() => setTheme("light")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                theme === "light" ? "border-primary" : "border-border hover-elevate"
              }`}
              data-testid="button-theme-light"
            >
              <div className="h-16 rounded bg-white border mb-2" />
              <p className="text-sm font-medium">Light</p>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                theme === "dark" ? "border-primary" : "border-border hover-elevate"
              }`}
              data-testid="button-theme-dark"
            >
              <div className="h-16 rounded bg-zinc-900 border border-zinc-700 mb-2" />
              <p className="text-sm font-medium">Dark</p>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                theme === "system" ? "border-primary" : "border-border hover-elevate"
              }`}
              data-testid="button-theme-system"
            >
              <div className="h-16 rounded overflow-hidden border mb-2 flex">
                <div className="w-1/2 bg-white" />
                <div className="w-1/2 bg-zinc-900" />
              </div>
              <p className="text-sm font-medium">System</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
