/**
 * CENTRALIZED COPY CONSTANTS
 * ==========================
 * IMPORTANT:
 * - Do not introduce industry-specific terms outside COPY.clinic
 * - All core UI text must come from this file
 * - CI will fail on forbidden terms (patient, patients, doctor, dr.)
 * - Run `npm run lint:terminology` to validate
 *
 * Global Terminology Standard:
 * - Public-facing: Customer
 * - Internal record: Contact
 * - Auth/access: User
 * - Internal team: Staff / Employee
 * - Clinic-only (restricted to COPY.clinic): Patient, Doctor
 */
export const COPY = {
  product: {
    name: "MyBizStream",
  },

  nouns: {
    customer: "Customer",
    customers: "Customers",
    contact: "Contact",
    contacts: "Contacts",
    user: "User",
    users: "Users",
    staff: "Staff",
    staffPlural: "Staff Members",
    employee: "Employee",
    employees: "Employees",
    team: "Team",
    teamMember: "Team Member",
    teamMembers: "Team Members",
  },

  labels: {
    name: "Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    status: "Status",
    actions: "Actions",
    notes: "Notes",
    description: "Description",
    dateOfBirth: "Date of Birth",
    createdAt: "Created",
    updatedAt: "Updated",
  },

  userManagement: {
    publicDisplayNameLabel: "Public Display Name",
    publicDisplayNameHelp:
      "This name appears on invoices and customer-facing communications.",
    publicDisplayNamePlaceholder: "John D.",
    addUser: "Add User",
    editUser: "Edit User",
    inviteUser: "Invite User",
    userDetails: "User Details",
    userProfile: "User Profile",
  },

  customers: {
    title: "Customers",
    singular: "Customer",
    addNew: "Add Customer",
    editCustomer: "Edit Customer",
    customerDetails: "Customer Details",
    noCustomers: "No customers yet",
    noCustomersDescription: "Add your first customer to get started.",
    searchPlaceholder: "Search customers...",
    importCustomers: "Import Customers",
    exportCustomers: "Export Customers",
  },

  contacts: {
    title: "Contacts",
    singular: "Contact",
    addNew: "Add Contact",
    editContact: "Edit Contact",
    contactDetails: "Contact Details",
    noContacts: "No contacts yet",
    noContactsDescription: "Add your first contact to get started.",
    searchPlaceholder: "Search contacts...",
  },

  staff: {
    title: "Staff",
    singular: "Staff Member",
    addNew: "Add Staff Member",
    editStaff: "Edit Staff Member",
    staffDetails: "Staff Details",
    noStaff: "No staff members yet",
    noStaffDescription: "Add your first staff member to get started.",
    searchPlaceholder: "Search staff...",
    inviteStaff: "Invite Staff Member",
    manageRoles: "Manage Roles",
    permissions: "Permissions",
  },

  bookings: {
    title: "Bookings",
    singular: "Booking",
    addNew: "New Booking",
    editBooking: "Edit Booking",
    bookingDetails: "Booking Details",
    noBookings: "No bookings yet",
    noBookingsDescription: "Create your first booking to get started.",
    searchPlaceholder: "Search bookings...",
    upcomingBookings: "Upcoming Bookings",
    pastBookings: "Past Bookings",
    cancelBooking: "Cancel Booking",
    rescheduleBooking: "Reschedule",
  },

  services: {
    title: "Services",
    singular: "Service",
    addNew: "Add Service",
    editService: "Edit Service",
    serviceDetails: "Service Details",
    noServices: "No services yet",
    noServicesDescription: "Add your first service to get started.",
    searchPlaceholder: "Search services...",
  },

  invoices: {
    title: "Invoices",
    singular: "Invoice",
    addNew: "Create Invoice",
    editInvoice: "Edit Invoice",
    invoiceDetails: "Invoice Details",
    noInvoices: "No invoices yet",
    noInvoicesDescription: "Create your first invoice to get started.",
    searchPlaceholder: "Search invoices...",
    sendInvoice: "Send Invoice",
    markAsPaid: "Mark as Paid",
    downloadPdf: "Download PDF",
  },

  settings: {
    title: "Settings",
    general: "General",
    business: "Business",
    billing: "Billing",
    security: "Security",
    notifications: "Notifications",
    integrations: "Integrations",
    branding: "Branding",
    users: "Users & Permissions",
  },

  actions: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    add: "Add",
    create: "Create",
    update: "Update",
    remove: "Remove",
    search: "Search",
    filter: "Filter",
    export: "Export",
    import: "Import",
    download: "Download",
    upload: "Upload",
    submit: "Submit",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    close: "Close",
    refresh: "Refresh",
    retry: "Retry",
  },

  status: {
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
    expired: "Expired",
  },

  empty: {
    noResults: "No results found",
    noResultsDescription: "Try adjusting your search or filter criteria.",
    noData: "No data available",
    noDataDescription: "There's nothing to display here yet.",
  },

  errors: {
    generic: "Something went wrong. Please try again.",
    notFound: "Not found",
    unauthorized: "You don't have permission to access this.",
    networkError: "Network error. Please check your connection.",
    validationError: "Please check your input and try again.",
  },

  clinic: {
    patient: "Patient",
    patients: "Patients",
    provider: "Provider",
    providers: "Providers",
    appointment: "Appointment",
    appointments: "Appointments",
    medicalRecord: "Medical Record",
    prescription: "Prescription",
  },

  forbiddenNonClinicTerms: ["patient", "patients", "doctor", "dr."],
} as const;

export type CopyKeys = keyof typeof COPY;
