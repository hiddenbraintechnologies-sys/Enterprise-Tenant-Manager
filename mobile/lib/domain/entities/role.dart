enum UserRole {
  superAdmin('super_admin', 'Super Admin'),
  admin('admin', 'Admin'),
  manager('manager', 'Manager'),
  staff('staff', 'Staff'),
  customer('customer', 'Customer');

  final String value;
  final String displayName;

  const UserRole(this.value, this.displayName);

  static UserRole fromString(String value) {
    return UserRole.values.firstWhere(
      (role) => role.value == value,
      orElse: () => UserRole.customer,
    );
  }

  bool get isAdmin => this == UserRole.superAdmin || this == UserRole.admin;
  bool get isStaffOrAbove => isAdmin || this == UserRole.manager || this == UserRole.staff;
  bool get isManagerOrAbove => isAdmin || this == UserRole.manager;
}
