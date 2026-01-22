import { apiRequest } from "./queryClient";

export type FeatureEventType =
  | "gate_shown"
  | "gate_dismissed"
  | "cta_clicked"
  | "trial_started"
  | "upgrade_completed";

interface FeatureTrackingEvent {
  featureKey: string;
  eventType: FeatureEventType;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function trackFeatureEvent(event: FeatureTrackingEvent): Promise<void> {
  try {
    await apiRequest("POST", "/api/analytics/feature-event", {
      featureKey: event.featureKey,
      eventType: event.eventType,
      reason: event.reason,
      metadata: event.metadata,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Silently fail - tracking should not block UI functionality
  }
}

export function trackGateShown(featureKey: string, reason: string): void {
  trackFeatureEvent({
    featureKey,
    eventType: "gate_shown",
    reason,
  });
}

export function trackGateDismissed(featureKey: string): void {
  trackFeatureEvent({
    featureKey,
    eventType: "gate_dismissed",
  });
}

export function trackCtaClicked(featureKey: string, ctaType: string): void {
  trackFeatureEvent({
    featureKey,
    eventType: "cta_clicked",
    metadata: { ctaType },
  });
}

export function trackTrialStarted(featureKey: string, addonCode: string): void {
  trackFeatureEvent({
    featureKey,
    eventType: "trial_started",
    metadata: { addonCode },
  });
}

export function trackUpgradeCompleted(featureKey: string, planTier: string): void {
  trackFeatureEvent({
    featureKey,
    eventType: "upgrade_completed",
    metadata: { planTier },
  });
}
