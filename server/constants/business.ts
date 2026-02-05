export const BUSINESS_TYPES = [
  "clinic",
  "clinic_healthcare",
  "salon",
  "salon_spa",
  "pg",
  "pg_hostel",
  "coworking",
  "gym",
  "service",
  "real_estate",
  "tourism",
  "education",
  "education_institute",
  "logistics",
  "logistics_fleet",
  "legal",
  "furniture_manufacturing",
  "furniture",
  "software_services",
  "consulting",
  "digital_agency",
  "retail_store",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const COUNTRY_CODES = ["IN", "MY", "SG", "GB", "AE", "US"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export function isValidBusinessType(value: string): value is BusinessType {
  return BUSINESS_TYPES.includes(value as BusinessType);
}

export function isValidCountryCode(value: string): value is CountryCode {
  return COUNTRY_CODES.includes(value as CountryCode);
}
