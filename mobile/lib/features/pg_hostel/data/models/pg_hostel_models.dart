/// PG/Hostel Module Models
library pg_hostel_models;

class PgRoom {
  final String id;
  final String tenantId;
  final String roomNumber;
  final String roomType;
  final int totalBeds;
  final int occupiedBeds;
  final double rentPerBed;
  final List<String>? amenities;
  final String status;

  PgRoom({
    required this.id,
    required this.tenantId,
    required this.roomNumber,
    required this.roomType,
    required this.totalBeds,
    required this.occupiedBeds,
    required this.rentPerBed,
    this.amenities,
    required this.status,
  });

  factory PgRoom.fromJson(Map<String, dynamic> json) => PgRoom(
    id: json['id'],
    tenantId: json['tenantId'],
    roomNumber: json['roomNumber'],
    roomType: json['roomType'] ?? 'standard',
    totalBeds: json['totalBeds'] ?? 1,
    occupiedBeds: json['occupiedBeds'] ?? 0,
    rentPerBed: (json['rentPerBed'] ?? 0).toDouble(),
    amenities: json['amenities'] != null ? List<String>.from(json['amenities']) : null,
    status: json['status'] ?? 'available',
  );

  int get availableBeds => totalBeds - occupiedBeds;
}

class PgResident {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String? email;
  final String phone;
  final String roomId;
  final String? roomNumber;
  final DateTime checkInDate;
  final DateTime? checkOutDate;
  final double monthlyRent;
  final String status;

  PgResident({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    this.email,
    required this.phone,
    required this.roomId,
    this.roomNumber,
    required this.checkInDate,
    this.checkOutDate,
    required this.monthlyRent,
    required this.status,
  });

  factory PgResident.fromJson(Map<String, dynamic> json) => PgResident(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    email: json['email'],
    phone: json['phone'],
    roomId: json['roomId'],
    roomNumber: json['roomNumber'],
    checkInDate: DateTime.parse(json['checkInDate']),
    checkOutDate: json['checkOutDate'] != null ? DateTime.parse(json['checkOutDate']) : null,
    monthlyRent: (json['monthlyRent'] ?? 0).toDouble(),
    status: json['status'] ?? 'active',
  );

  String get fullName => '$firstName $lastName';
}

class PgDashboardStats {
  final int totalRooms;
  final int occupiedBeds;
  final int availableBeds;
  final int totalResidents;
  final double pendingRent;
  final int maintenanceRequests;

  PgDashboardStats({
    required this.totalRooms,
    required this.occupiedBeds,
    required this.availableBeds,
    required this.totalResidents,
    required this.pendingRent,
    required this.maintenanceRequests,
  });

  factory PgDashboardStats.fromJson(Map<String, dynamic> json) => PgDashboardStats(
    totalRooms: json['totalRooms'] ?? 0,
    occupiedBeds: json['occupiedBeds'] ?? 0,
    availableBeds: json['availableBeds'] ?? 0,
    totalResidents: json['totalResidents'] ?? 0,
    pendingRent: (json['pendingRent'] ?? 0).toDouble(),
    maintenanceRequests: json['maintenanceRequests'] ?? 0,
  );
}
