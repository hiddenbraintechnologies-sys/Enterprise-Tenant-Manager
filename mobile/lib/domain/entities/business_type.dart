enum BusinessType {
  pgHostel('pg_hostel', 'PG/Hostel'),
  salon('salon', 'Salon'),
  gym('gym', 'Gym'),
  coachingInstitute('coaching_institute', 'Coaching Institute'),
  clinic('clinic', 'Clinic'),
  diagnostics('diagnostics', 'Diagnostics'),
  restaurant('restaurant', 'Restaurant'),
  retail('retail', 'Retail'),
  general('general', 'General Service');

  final String value;
  final String displayName;

  const BusinessType(this.value, this.displayName);

  static BusinessType fromString(String value) {
    return BusinessType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => BusinessType.general,
    );
  }
}
