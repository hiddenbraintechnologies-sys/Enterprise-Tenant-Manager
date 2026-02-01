import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SettingsHome() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to Profile as the default settings page (Zoho-style)
    setLocation("/settings/profile");
  }, [setLocation]);

  return null;
}
