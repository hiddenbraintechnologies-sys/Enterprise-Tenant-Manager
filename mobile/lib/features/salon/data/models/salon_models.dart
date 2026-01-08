/// Salon Module Models
library salon_models;

class SalonService {
  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final String category;
  final double price;
  final int durationMinutes;
  final String status;

  SalonService({
    required this.id,
    required this.tenantId,
    required this.name,
    this.description,
    required this.category,
    required this.price,
    required this.durationMinutes,
    required this.status,
  });

  factory SalonService.fromJson(Map<String, dynamic> json) => SalonService(
    id: json['id'],
    tenantId: json['tenantId'],
    name: json['name'],
    description: json['description'],
    category: json['category'] ?? 'general',
    price: (json['price'] ?? 0).toDouble(),
    durationMinutes: json['durationMinutes'] ?? 30,
    status: json['status'] ?? 'active',
  );
}

class SalonStaff {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String role;
  final List<String>? specializations;
  final String status;

  SalonStaff({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    required this.role,
    this.specializations,
    required this.status,
  });

  factory SalonStaff.fromJson(Map<String, dynamic> json) => SalonStaff(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    email: json['email'],
    phone: json['phone'],
    role: json['role'] ?? 'stylist',
    specializations: json['specializations'] != null ? List<String>.from(json['specializations']) : null,
    status: json['status'] ?? 'active',
  );

  String get fullName => '$firstName $lastName';
}

class SalonAppointment {
  final String id;
  final String tenantId;
  final String customerName;
  final String? customerPhone;
  final String serviceId;
  final String? serviceName;
  final String? staffId;
  final String? staffName;
  final DateTime appointmentDate;
  final String timeSlot;
  final String status;

  SalonAppointment({
    required this.id,
    required this.tenantId,
    required this.customerName,
    this.customerPhone,
    required this.serviceId,
    this.serviceName,
    this.staffId,
    this.staffName,
    required this.appointmentDate,
    required this.timeSlot,
    required this.status,
  });

  factory SalonAppointment.fromJson(Map<String, dynamic> json) => SalonAppointment(
    id: json['id'],
    tenantId: json['tenantId'],
    customerName: json['customerName'],
    customerPhone: json['customerPhone'],
    serviceId: json['serviceId'],
    serviceName: json['serviceName'],
    staffId: json['staffId'],
    staffName: json['staffName'],
    appointmentDate: DateTime.parse(json['appointmentDate']),
    timeSlot: json['timeSlot'],
    status: json['status'] ?? 'scheduled',
  );
}

class SalonDashboardStats {
  final int totalServices;
  final int totalStaff;
  final int todayAppointments;
  final int pendingAppointments;
  final double totalRevenue;
  final int activeMembers;

  SalonDashboardStats({
    required this.totalServices,
    required this.totalStaff,
    required this.todayAppointments,
    required this.pendingAppointments,
    required this.totalRevenue,
    required this.activeMembers,
  });

  factory SalonDashboardStats.fromJson(Map<String, dynamic> json) => SalonDashboardStats(
    totalServices: json['totalServices'] ?? 0,
    totalStaff: json['totalStaff'] ?? 0,
    todayAppointments: json['todayAppointments'] ?? 0,
    pendingAppointments: json['pendingAppointments'] ?? 0,
    totalRevenue: (json['totalRevenue'] ?? 0).toDouble(),
    activeMembers: json['activeMembers'] ?? 0,
  );
}
