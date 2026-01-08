/// Tourism Module Models
library tourism_models;

class TourPackage {
  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final String destination;
  final int durationDays;
  final double price;
  final String status;
  final List<String>? inclusions;

  TourPackage({
    required this.id,
    required this.tenantId,
    required this.name,
    this.description,
    required this.destination,
    required this.durationDays,
    required this.price,
    required this.status,
    this.inclusions,
  });

  factory TourPackage.fromJson(Map<String, dynamic> json) => TourPackage(
    id: json['id'],
    tenantId: json['tenantId'],
    name: json['name'],
    description: json['description'],
    destination: json['destination'],
    durationDays: json['durationDays'] ?? 0,
    price: (json['price'] ?? 0).toDouble(),
    status: json['status'] ?? 'active',
    inclusions: json['inclusions'] != null ? List<String>.from(json['inclusions']) : null,
  );
}

class TourBooking {
  final String id;
  final String tenantId;
  final String packageId;
  final String? packageName;
  final String customerName;
  final String customerEmail;
  final String? customerPhone;
  final DateTime travelDate;
  final int travelers;
  final double totalAmount;
  final String status;

  TourBooking({
    required this.id,
    required this.tenantId,
    required this.packageId,
    this.packageName,
    required this.customerName,
    required this.customerEmail,
    this.customerPhone,
    required this.travelDate,
    required this.travelers,
    required this.totalAmount,
    required this.status,
  });

  factory TourBooking.fromJson(Map<String, dynamic> json) => TourBooking(
    id: json['id'],
    tenantId: json['tenantId'],
    packageId: json['packageId'],
    packageName: json['packageName'],
    customerName: json['customerName'],
    customerEmail: json['customerEmail'],
    customerPhone: json['customerPhone'],
    travelDate: DateTime.parse(json['travelDate']),
    travelers: json['travelers'] ?? 1,
    totalAmount: (json['totalAmount'] ?? 0).toDouble(),
    status: json['status'] ?? 'pending',
  );
}

class TourDashboardStats {
  final int totalPackages;
  final int activePackages;
  final int totalBookings;
  final int confirmedBookings;
  final double totalRevenue;
  final int upcomingTrips;

  TourDashboardStats({
    required this.totalPackages,
    required this.activePackages,
    required this.totalBookings,
    required this.confirmedBookings,
    required this.totalRevenue,
    required this.upcomingTrips,
  });

  factory TourDashboardStats.fromJson(Map<String, dynamic> json) => TourDashboardStats(
    totalPackages: json['totalPackages'] ?? 0,
    activePackages: json['activePackages'] ?? 0,
    totalBookings: json['totalBookings'] ?? 0,
    confirmedBookings: json['confirmedBookings'] ?? 0,
    totalRevenue: (json['totalRevenue'] ?? 0).toDouble(),
    upcomingTrips: json['upcomingTrips'] ?? 0,
  );
}
