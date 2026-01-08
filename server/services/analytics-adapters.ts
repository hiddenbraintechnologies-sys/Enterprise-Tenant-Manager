/**
 * Analytics Adapters Barrel Export
 * 
 * Central export for all module-specific analytics adapters.
 * Import this file to register all adapters with baseAnalyticsService.
 * 
 * @module server/services/analytics-adapters
 */

export * from "./base-analytics";
export { hrmsAnalyticsAdapter, getHrmsAnalytics } from "./hrms-analytics-adapter";
export { legalAnalyticsAdapter, getLegalAnalytics } from "./legal-analytics-adapter";
export { educationAnalyticsAdapter, getEducationAnalytics } from "./education-analytics-adapter";
export { tourismAnalyticsAdapter, getTourismAnalytics } from "./tourism-analytics-adapter";
export { logisticsAnalyticsAdapter, getLogisticsAnalytics } from "./logistics-analytics-adapter";
export { realEstateAnalyticsAdapter, getRealEstateAnalytics } from "./realestate-analytics-adapter";
