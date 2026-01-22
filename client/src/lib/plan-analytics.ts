import { apiRequest } from "./queryClient";

export type PlanConversionEvent = 
  | "plan_upgrade_banner_shown"
  | "locked_feature_clicked"
  | "plan_upgrade_clicked"
  | "plan_upgraded_success"
  | "plan_comparison_viewed"
  | "upgrade_nudge_dismissed";

export interface PlanConversionEventData {
  event: PlanConversionEvent;
  fromPlan?: string;
  toPlan?: string;
  triggerReason?: string;
  featureKey?: string;
  limitKey?: string;
  country?: string;
  metadata?: Record<string, string | number | boolean>;
}

class PlanAnalyticsTracker {
  private country: string | null = null;

  setCountry(countryCode: string) {
    this.country = countryCode;
  }

  async track(eventData: PlanConversionEventData) {
    try {
      const payload = {
        ...eventData,
        country: eventData.country || this.country,
        timestamp: new Date().toISOString()
      };

      await apiRequest("POST", "/api/analytics/plan-conversion", payload);
    } catch (error) {
      console.warn("Failed to track plan conversion event:", error);
    }
  }

  trackBannerShown(fromPlan: string, triggerReason?: string) {
    this.track({
      event: "plan_upgrade_banner_shown",
      fromPlan,
      triggerReason
    });
  }

  trackLockedFeatureClicked(featureKey: string, fromPlan: string) {
    this.track({
      event: "locked_feature_clicked",
      featureKey,
      fromPlan
    });
  }

  trackUpgradeClicked(fromPlan: string, toPlan: string, triggerReason?: string) {
    this.track({
      event: "plan_upgrade_clicked",
      fromPlan,
      toPlan,
      triggerReason
    });
  }

  trackUpgradeSuccess(fromPlan: string, toPlan: string) {
    this.track({
      event: "plan_upgraded_success",
      fromPlan,
      toPlan
    });
  }

  trackComparisonViewed(fromPlan: string) {
    this.track({
      event: "plan_comparison_viewed",
      fromPlan
    });
  }

  trackNudgeDismissed(fromPlan: string) {
    this.track({
      event: "upgrade_nudge_dismissed",
      fromPlan
    });
  }
}

export const planAnalytics = new PlanAnalyticsTracker();
