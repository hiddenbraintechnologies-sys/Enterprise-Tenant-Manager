/// Coworking Module Models
library coworking_models;

class CoworkingDesk {
  final String id;
  final String tenantId;
  final String deskNumber;
  final String deskType;
  final String? location;
  final double pricePerDay;
  final double pricePerMonth;
  final List<String>? amenities;
  final String status;

  CoworkingDesk({
    required this.id,
    required this.tenantId,
    required this.deskNumber,
    required this.deskType,
    this.location,
    required this.pricePerDay,
    required this.pricePerMonth,
    this.amenities,
    required this.status,
  });

  factory CoworkingDesk.fromJson(Map<String, dynamic> json) => CoworkingDesk(
    id: json['id'],
    tenantId: json['tenantId'],
    deskNumber: json['deskNumber'],
    deskType: json['deskType'] ?? 'hot_desk',
    location: json['location'],
    pricePerDay: (json['pricePerDay'] ?? 0).toDouble(),
    pricePerMonth: (json['pricePerMonth'] ?? 0).toDouble(),
    amenities: json['amenities'] != null ? List<String>.from(json['amenities']) : null,
    status: json['status'] ?? 'available',
  );
}

class MeetingRoom {
  final String id;
  final String tenantId;
  final String name;
  final int capacity;
  final double pricePerHour;
  final List<String>? equipment;
  final String status;

  MeetingRoom({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.capacity,
    required this.pricePerHour,
    this.equipment,
    required this.status,
  });

  factory MeetingRoom.fromJson(Map<String, dynamic> json) => MeetingRoom(
    id: json['id'],
    tenantId: json['tenantId'],
    name: json['name'],
    capacity: json['capacity'] ?? 4,
    pricePerHour: (json['pricePerHour'] ?? 0).toDouble(),
    equipment: json['equipment'] != null ? List<String>.from(json['equipment']) : null,
    status: json['status'] ?? 'available',
  );
}

class CoworkingMember {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? company;
  final String membershipType;
  final DateTime startDate;
  final DateTime? endDate;
  final String status;

  CoworkingMember({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.company,
    required this.membershipType,
    required this.startDate,
    this.endDate,
    required this.status,
  });

  factory CoworkingMember.fromJson(Map<String, dynamic> json) => CoworkingMember(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    email: json['email'],
    phone: json['phone'],
    company: json['company'],
    membershipType: json['membershipType'] ?? 'daily',
    startDate: DateTime.parse(json['startDate']),
    endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
    status: json['status'] ?? 'active',
  );

  String get fullName => '$firstName $lastName';
}

class CoworkingDashboardStats {
  final int totalDesks;
  final int occupiedDesks;
  final int availableDesks;
  final int totalMeetingRooms;
  final int todayBookings;
  final int activeMembers;

  CoworkingDashboardStats({
    required this.totalDesks,
    required this.occupiedDesks,
    required this.availableDesks,
    required this.totalMeetingRooms,
    required this.todayBookings,
    required this.activeMembers,
  });

  factory CoworkingDashboardStats.fromJson(Map<String, dynamic> json) => CoworkingDashboardStats(
    totalDesks: json['totalDesks'] ?? 0,
    occupiedDesks: json['occupiedDesks'] ?? 0,
    availableDesks: json['availableDesks'] ?? 0,
    totalMeetingRooms: json['totalMeetingRooms'] ?? 0,
    todayBookings: json['todayBookings'] ?? 0,
    activeMembers: json['activeMembers'] ?? 0,
  );
}
