import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 days instead of 14

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

import { X } from "lucide-react";

export function InstallBanner() {
  const { canInstall, promptInstall, dismissPrompt } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-primary text-primary-foreground shadow-lg md:hidden"
      data-testid="install-banner"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Install MyBizStream</p>
            <p className="text-xs opacity-80">Add to home screen for quick access</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={promptInstall}
            className="whitespace-nowrap"
            data-testid="button-install-banner"
          >
            Install
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismissPrompt}
            className="h-8 w-8 text-primary-foreground hover:bg-white/20"
            data-testid="button-dismiss-install"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
