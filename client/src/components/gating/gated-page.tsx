import { useFeatureGate, isDismissed, setDismissed } from "@/hooks/use-feature-gate";
import { LockedFeaturePage, LockedFeatureModal } from "./locked-feature";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

interface GatedPageProps {
  featureKey: string;
  addonCode?: string;
  mode?: "page" | "modal";
  children: React.ReactNode;
}

export function GatedPage({ featureKey, addonCode, mode = "page", children }: GatedPageProps) {
  const { tenant } = useAuth();
  const gateResult = useFeatureGate(featureKey, addonCode);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);
  const tenantId = tenant?.id || "";

  useEffect(() => {
    if (mode === "modal" && !gateResult.allowed && !hasShownModal) {
      if (!tenantId || !isDismissed(tenantId, featureKey)) {
        setModalOpen(true);
        setHasShownModal(true);
      }
    }
  }, [gateResult.allowed, mode, hasShownModal, tenantId, featureKey]);

  if (gateResult.allowed) {
    return <>{children}</>;
  }

  const handleDismiss = () => {
    if (tenantId) {
      setDismissed(tenantId, featureKey);
    }
  };

  if (mode === "modal") {
    return (
      <>
        {children}
        <LockedFeatureModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          featureKey={featureKey}
          featureDisplayName={gateResult.featureDisplayName}
          reason={gateResult.reason!}
          requiredPlanTier={gateResult.requiredPlanTier}
          addonCode={gateResult.addonCode}
          trialDays={gateResult.trialDays}
          countryCode={gateResult.countryCode}
          onDismiss={handleDismiss}
        />
      </>
    );
  }

  return (
    <LockedFeaturePage
      featureKey={featureKey}
      featureDisplayName={gateResult.featureDisplayName}
      reason={gateResult.reason!}
      requiredPlanTier={gateResult.requiredPlanTier}
      addonCode={gateResult.addonCode}
      trialDays={gateResult.trialDays}
      countryCode={gateResult.countryCode}
    />
  );
}
