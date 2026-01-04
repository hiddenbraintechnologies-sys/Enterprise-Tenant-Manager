enum Permission {
  viewDashboard('dashboard:view'),
  viewCustomers('customers:view'),
  createCustomer('customers:create'),
  editCustomer('customers:edit'),
  deleteCustomer('customers:delete'),
  viewBookings('bookings:view'),
  createBooking('bookings:create'),
  editBooking('bookings:edit'),
  deleteBooking('bookings:delete'),
  viewInvoices('invoices:view'),
  createInvoice('invoices:create'),
  editInvoice('invoices:edit'),
  viewReports('reports:view'),
  viewInventory('inventory:view'),
  manageInventory('inventory:manage'),
  viewMemberships('memberships:view'),
  manageMemberships('memberships:manage'),
  viewPatients('patients:view'),
  managePatients('patients:manage'),
  viewAppointments('appointments:view'),
  manageAppointments('appointments:manage'),
  viewRooms('rooms:view'),
  manageRooms('rooms:manage'),
  viewServices('services:view'),
  manageServices('services:manage'),
  viewSettings('settings:view'),
  manageSettings('settings:manage'),
  viewStaff('staff:view'),
  manageStaff('staff:manage'),
  viewCompliance('compliance:view'),
  manageCompliance('compliance:manage');

  final String value;

  const Permission(this.value);

  static Permission? fromString(String value) {
    try {
      return Permission.values.firstWhere((p) => p.value == value);
    } catch (_) {
      return null;
    }
  }
}
