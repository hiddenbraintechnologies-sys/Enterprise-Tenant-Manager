/// Logistics Module Models
library logistics_models;

class LogisticsVehicle {
  final String id;
  final String tenantId;
  final String registrationNumber;
  final String vehicleType;
  final String? make;
  final String? model;
  final int? year;
  final double capacity;
  final String capacityUnit;
  final String status;

  LogisticsVehicle({
    required this.id,
    required this.tenantId,
    required this.registrationNumber,
    required this.vehicleType,
    this.make,
    this.model,
    this.year,
    required this.capacity,
    required this.capacityUnit,
    required this.status,
  });

  factory LogisticsVehicle.fromJson(Map<String, dynamic> json) => LogisticsVehicle(
    id: json['id'],
    tenantId: json['tenantId'],
    registrationNumber: json['registrationNumber'],
    vehicleType: json['vehicleType'],
    make: json['make'],
    model: json['model'],
    year: json['year'],
    capacity: (json['capacity'] ?? 0).toDouble(),
    capacityUnit: json['capacityUnit'] ?? 'kg',
    status: json['status'] ?? 'active',
  );
}

class LogisticsDriver {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String phone;
  final String? email;
  final String licenseNumber;
  final String status;

  LogisticsDriver({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    required this.phone,
    this.email,
    required this.licenseNumber,
    required this.status,
  });

  factory LogisticsDriver.fromJson(Map<String, dynamic> json) => LogisticsDriver(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    phone: json['phone'],
    email: json['email'],
    licenseNumber: json['licenseNumber'],
    status: json['status'] ?? 'active',
  );

  String get fullName => '$firstName $lastName';
}

class LogisticsShipment {
  final String id;
  final String tenantId;
  final String trackingNumber;
  final String senderName;
  final String receiverName;
  final String origin;
  final String destination;
  final String status;
  final DateTime? estimatedDelivery;
  final double weight;

  LogisticsShipment({
    required this.id,
    required this.tenantId,
    required this.trackingNumber,
    required this.senderName,
    required this.receiverName,
    required this.origin,
    required this.destination,
    required this.status,
    this.estimatedDelivery,
    required this.weight,
  });

  factory LogisticsShipment.fromJson(Map<String, dynamic> json) => LogisticsShipment(
    id: json['id'],
    tenantId: json['tenantId'],
    trackingNumber: json['trackingNumber'],
    senderName: json['senderName'],
    receiverName: json['receiverName'],
    origin: json['origin'],
    destination: json['destination'],
    status: json['status'] ?? 'pending',
    estimatedDelivery: json['estimatedDelivery'] != null ? DateTime.parse(json['estimatedDelivery']) : null,
    weight: (json['weight'] ?? 0).toDouble(),
  );
}

class LogisticsDashboardStats {
  final int totalVehicles;
  final int activeVehicles;
  final int totalDrivers;
  final int activeTrips;
  final int pendingShipments;
  final int deliveredToday;

  LogisticsDashboardStats({
    required this.totalVehicles,
    required this.activeVehicles,
    required this.totalDrivers,
    required this.activeTrips,
    required this.pendingShipments,
    required this.deliveredToday,
  });

  factory LogisticsDashboardStats.fromJson(Map<String, dynamic> json) => LogisticsDashboardStats(
    totalVehicles: json['totalVehicles'] ?? 0,
    activeVehicles: json['activeVehicles'] ?? 0,
    totalDrivers: json['totalDrivers'] ?? 0,
    activeTrips: json['activeTrips'] ?? 0,
    pendingShipments: json['pendingShipments'] ?? 0,
    deliveredToday: json['deliveredToday'] ?? 0,
  );
}
