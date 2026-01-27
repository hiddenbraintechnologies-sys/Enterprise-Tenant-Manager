import { useState, useEffect } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;

  return (
    <div 
      className="w-full px-3 py-2 text-sm bg-amber-500/20 border-b border-amber-500/30 text-amber-200"
      role="alert"
      data-testid="banner-offline"
    >
      You're offline. Some actions may not work until you reconnect.
    </div>
  );
}
