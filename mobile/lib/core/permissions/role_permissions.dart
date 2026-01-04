import '../../domain/entities/permission.dart';
import '../../domain/entities/role.dart';

class RolePermissions {
  static const Map<UserRole, Set<Permission>> _rolePermissions = {
    UserRole.superAdmin: {
      ...Permission.values,
    },
    UserRole.admin: {
      Permission.viewDashboard,
      Permission.viewCustomers,
      Permission.createCustomer,
      Permission.editCustomer,
      Permission.deleteCustomer,
      Permission.viewBookings,
      Permission.createBooking,
      Permission.editBooking,
      Permission.deleteBooking,
      Permission.viewInvoices,
      Permission.createInvoice,
      Permission.editInvoice,
      Permission.viewReports,
      Permission.viewInventory,
      Permission.manageInventory,
      Permission.viewMemberships,
      Permission.manageMemberships,
      Permission.viewPatients,
      Permission.managePatients,
      Permission.viewAppointments,
      Permission.manageAppointments,
      Permission.viewRooms,
      Permission.manageRooms,
      Permission.viewServices,
      Permission.manageServices,
      Permission.viewSettings,
      Permission.manageSettings,
      Permission.viewStaff,
      Permission.manageStaff,
      Permission.viewCompliance,
      Permission.manageCompliance,
    },
    UserRole.manager: {
      Permission.viewDashboard,
      Permission.viewCustomers,
      Permission.createCustomer,
      Permission.editCustomer,
      Permission.viewBookings,
      Permission.createBooking,
      Permission.editBooking,
      Permission.viewInvoices,
      Permission.createInvoice,
      Permission.viewReports,
      Permission.viewInventory,
      Permission.manageInventory,
      Permission.viewMemberships,
      Permission.manageMemberships,
      Permission.viewPatients,
      Permission.managePatients,
      Permission.viewAppointments,
      Permission.manageAppointments,
      Permission.viewRooms,
      Permission.manageRooms,
      Permission.viewServices,
      Permission.viewStaff,
    },
    UserRole.staff: {
      Permission.viewDashboard,
      Permission.viewCustomers,
      Permission.createCustomer,
      Permission.viewBookings,
      Permission.createBooking,
      Permission.editBooking,
      Permission.viewInvoices,
      Permission.viewInventory,
      Permission.viewMemberships,
      Permission.viewPatients,
      Permission.viewAppointments,
      Permission.viewRooms,
      Permission.viewServices,
    },
    UserRole.customer: {
      Permission.viewDashboard,
      Permission.viewBookings,
      Permission.createBooking,
      Permission.viewInvoices,
      Permission.viewMemberships,
      Permission.viewAppointments,
    },
  };

  static Set<Permission> getPermissions(UserRole role) {
    return _rolePermissions[role] ?? {};
  }

  static bool hasPermission(UserRole role, Permission permission) {
    return getPermissions(role).contains(permission);
  }

  static bool hasAnyPermission(UserRole role, List<Permission> permissions) {
    final rolePerms = getPermissions(role);
    return permissions.any((p) => rolePerms.contains(p));
  }

  static bool hasAllPermissions(UserRole role, List<Permission> permissions) {
    final rolePerms = getPermissions(role);
    return permissions.every((p) => rolePerms.contains(p));
  }
}
