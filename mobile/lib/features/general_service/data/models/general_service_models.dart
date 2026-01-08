/// General Service Module Models
library general_service_models;

class GenService {
  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final String category;
  final double price;
  final int durationMinutes;
  final String status;

  GenService({
    required this.id,
    required this.tenantId,
    required this.name,
    this.description,
    required this.category,
    required this.price,
    required this.durationMinutes,
    required this.status,
  });

  factory GenService.fromJson(Map<String, dynamic> json) => GenService(
    id: json['id'],
    tenantId: json['tenantId'],
    name: json['name'],
    description: json['description'],
    category: json['category'] ?? 'general',
    price: (json['price'] ?? 0).toDouble(),
    durationMinutes: json['durationMinutes'] ?? 60,
    status: json['status'] ?? 'active',
  );
}

class GenCustomer {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? address;
  final String status;

  GenCustomer({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.address,
    required this.status,
  });

  factory GenCustomer.fromJson(Map<String, dynamic> json) => GenCustomer(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    email: json['email'],
    phone: json['phone'],
    address: json['address'],
    status: json['status'] ?? 'active',
  );

  String get fullName => '$firstName $lastName';
}

class GenBooking {
  final String id;
  final String tenantId;
  final String customerId;
  final String? customerName;
  final String serviceId;
  final String? serviceName;
  final String? staffId;
  final DateTime bookingDate;
  final String? timeSlot;
  final double totalAmount;
  final String status;

  GenBooking({
    required this.id,
    required this.tenantId,
    required this.customerId,
    this.customerName,
    required this.serviceId,
    this.serviceName,
    this.staffId,
    required this.bookingDate,
    this.timeSlot,
    required this.totalAmount,
    required this.status,
  });

  factory GenBooking.fromJson(Map<String, dynamic> json) => GenBooking(
    id: json['id'],
    tenantId: json['tenantId'],
    customerId: json['customerId'],
    customerName: json['customerName'],
    serviceId: json['serviceId'],
    serviceName: json['serviceName'],
    staffId: json['staffId'],
    bookingDate: DateTime.parse(json['bookingDate']),
    timeSlot: json['timeSlot'],
    totalAmount: (json['totalAmount'] ?? 0).toDouble(),
    status: json['status'] ?? 'pending',
  );
}

class GenDashboardStats {
  final int totalServices;
  final int totalCustomers;
  final int todayBookings;
  final int pendingBookings;
  final int completedToday;
  final double monthlyRevenue;

  GenDashboardStats({
    required this.totalServices,
    required this.totalCustomers,
    required this.todayBookings,
    required this.pendingBookings,
    required this.completedToday,
    required this.monthlyRevenue,
  });

  factory GenDashboardStats.fromJson(Map<String, dynamic> json) => GenDashboardStats(
    totalServices: json['totalServices'] ?? 0,
    totalCustomers: json['totalCustomers'] ?? 0,
    todayBookings: json['todayBookings'] ?? 0,
    pendingBookings: json['pendingBookings'] ?? 0,
    completedToday: json['completedToday'] ?? 0,
    monthlyRevenue: (json['monthlyRevenue'] ?? 0).toDouble(),
  );
}
