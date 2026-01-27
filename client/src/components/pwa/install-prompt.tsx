import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 14 * 24 * 60 * 60 * 1000;

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return;
      }
      localStorage.removeItem(DISMISS_KEY);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
    
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const dismissPrompt = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setCanInstall(false);
  };

  return { canInstall, promptInstall, dismissPrompt };
}

export function InstallButton({ variant = "ghost" }: { variant?: "ghost" | "outline" | "default" }) {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={promptInstall}
      className="gap-2"
      data-testid="button-install-app"
    >
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
}
