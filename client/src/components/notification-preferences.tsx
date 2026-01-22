import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, Info, AlertCircle, CheckCircle2, AlertTriangle, 
  Clock, Mail, MessageCircle, Smartphone,
  Moon
} from "lucide-react";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferencesData {
  systemEnabled: boolean;
  alertEnabled: boolean;
  infoEnabled: boolean;
  successEnabled: boolean;
  warningEnabled: boolean;
  actionEnabled: boolean;
  reminderEnabled: boolean;
  lowSeverityEnabled: boolean;
  mediumSeverityEnabled: boolean;
  highSeverityEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

const NOTIFICATION_TYPES = [
  { key: "systemEnabled", label: "System Announcements", description: "Platform-wide updates and announcements", icon: Bell },
  { key: "alertEnabled", label: "Alerts", description: "Important alerts requiring your attention", icon: AlertCircle },
  { key: "infoEnabled", label: "Information", description: "General informational messages", icon: Info },
  { key: "successEnabled", label: "Success", description: "Confirmation of completed actions", icon: CheckCircle2 },
  { key: "warningEnabled", label: "Warnings", description: "Warnings about potential issues", icon: AlertTriangle },
  { key: "actionEnabled", label: "Action Required", description: "Tasks that need your action", icon: Clock },
  { key: "reminderEnabled", label: "Reminders", description: "Scheduled reminders and follow-ups", icon: Bell },
] as const;

const SEVERITY_LEVELS = [
  { key: "lowSeverityEnabled", label: "Low Priority", description: "Minor updates and confirmations" },
  { key: "mediumSeverityEnabled", label: "Medium Priority", description: "Standard notifications" },
  { key: "highSeverityEnabled", label: "High Priority", description: "Important updates" },
] as const;

const CHANNELS = [
  { key: "emailEnabled", label: "Email", description: "Receive notifications via email", icon: Mail },
  { key: "whatsappEnabled", label: "WhatsApp", description: "Get instant messages on WhatsApp", icon: MessageCircle },
  { key: "smsEnabled", label: "SMS", description: "Text message notifications", icon: Smartphone },
] as const;

export function NotificationPreferences() {
  const { toast } = useToast();
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferencesData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: preferences, isLoading, isError } = useQuery<NotificationPreferencesData>({
    queryKey: ["/api/notifications/preferences"],
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
      setHasChanges(false);
    }
  }, [preferences]);

  const updateMutation = useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferencesData>) => {
      return apiRequest("PUT", "/api/notifications/preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
      setHasChanges(false);
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof NotificationPreferencesData) => {
    if (!localPrefs) return;
    const newPrefs = { ...localPrefs, [key]: !localPrefs[key] };
    setLocalPrefs(newPrefs);
    setHasChanges(true);
  };

  const handleTimeChange = (key: "quietHoursStart" | "quietHoursEnd", value: string) => {
    if (!localPrefs) return;
    const newPrefs = { ...localPrefs, [key]: value };
    setLocalPrefs(newPrefs);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (localPrefs) {
      updateMutation.mutate(localPrefs);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Failed to load notification preferences. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const prefs = localPrefs || preferences;
  if (!prefs) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-notification-types-title">
            <Bell className="h-5 w-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_TYPES.map(({ key, label, description, icon: Icon }) => (
            <div 
              key={key} 
              className="flex items-center justify-between py-2"
              data-testid={`toggle-${key}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor={key} className="font-medium">{label}</Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                id={key}
                checked={prefs[key] as boolean}
                onCheckedChange={() => handleToggle(key)}
                data-testid={`switch-${key}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-severity-levels-title">Priority Levels</CardTitle>
          <CardDescription>
            Filter notifications by importance (Critical notifications cannot be disabled)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SEVERITY_LEVELS.map(({ key, label, description }) => (
            <div 
              key={key} 
              className="flex items-center justify-between py-2"
              data-testid={`toggle-${key}`}
            >
              <div>
                <Label htmlFor={key} className="font-medium">{label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Switch
                id={key}
                checked={prefs[key] as boolean}
                onCheckedChange={() => handleToggle(key)}
                data-testid={`switch-${key}`}
              />
            </div>
          ))}
          <div className="flex items-center justify-between py-2 opacity-60">
            <div>
              <Label className="font-medium">Critical Priority</Label>
              <p className="text-sm text-muted-foreground">Always enabled for your safety</p>
            </div>
            <Switch checked disabled data-testid="switch-criticalSeverityEnabled" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-channels-title">
            <Mail className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 opacity-60">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="font-medium">In-App Notifications</Label>
                <p className="text-sm text-muted-foreground">Always enabled</p>
              </div>
            </div>
            <Switch checked disabled data-testid="switch-inAppEnabled" />
          </div>
          {CHANNELS.map(({ key, label, description, icon: Icon }) => (
            <div 
              key={key} 
              className="flex items-center justify-between py-2"
              data-testid={`toggle-${key}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor={key} className="font-medium">{label}</Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                id={key}
                checked={prefs[key] as boolean}
                onCheckedChange={() => handleToggle(key)}
                data-testid={`switch-${key}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-quiet-hours-title">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause non-critical notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="quietHoursEnabled" className="font-medium">Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">Only critical notifications will be sent during this time</p>
            </div>
            <Switch
              id="quietHoursEnabled"
              checked={prefs.quietHoursEnabled}
              onCheckedChange={() => handleToggle("quietHoursEnabled")}
              data-testid="switch-quietHoursEnabled"
            />
          </div>
          
          {prefs.quietHoursEnabled && (
            <div className="flex items-center gap-4 pl-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="quietHoursStart" className="text-sm">From</Label>
                <Input
                  id="quietHoursStart"
                  type="time"
                  value={prefs.quietHoursStart || "22:00"}
                  onChange={(e) => handleTimeChange("quietHoursStart", e.target.value)}
                  className="w-32"
                  data-testid="input-quietHoursStart"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="quietHoursEnd" className="text-sm">To</Label>
                <Input
                  id="quietHoursEnd"
                  type="time"
                  value={prefs.quietHoursEnd || "07:00"}
                  onChange={(e) => handleTimeChange("quietHoursEnd", e.target.value)}
                  className="w-32"
                  data-testid="input-quietHoursEnd"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex justify-end gap-3 sticky bottom-4 p-4 bg-background/80 backdrop-blur-sm rounded-lg border">
          <Button
            variant="outline"
            onClick={() => {
              setLocalPrefs(preferences || null);
              setHasChanges(false);
            }}
            data-testid="button-cancel-preferences"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-preferences"
          >
            {updateMutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      )}
    </div>
  );
}
