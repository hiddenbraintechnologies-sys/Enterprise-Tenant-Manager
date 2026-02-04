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
    employee: "Employee",
    employees: "Employees",
  },

  userManagement: {
    publicDisplayNameLabel: "Public Display Name",
    publicDisplayNameHelp:
      "This name appears on invoices and customer-facing communications.",
    publicDisplayNamePlaceholder: "John D.",
  },

  clinic: {
    patient: "Patient",
    patients: "Patients",
    provider: "Provider",
  },

  forbiddenNonClinicTerms: ["patient", "patients", "doctor", "dr."],
} as const;
