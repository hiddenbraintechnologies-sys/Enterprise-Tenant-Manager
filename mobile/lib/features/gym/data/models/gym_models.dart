/// Gym Module Models
library gym_models;

class GymMember {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final DateTime? dateOfBirth;
  final String membershipId;
  final String? membershipName;
  final DateTime joinDate;
  final DateTime? expiryDate;
  final String status;

  GymMember({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.dateOfBirth,
    required this.membershipId,
    this.membershipName,
    required this.joinDate,
    this.expiryDate,
    required this.status,
  });

  factory GymMember.fromJson(Map<String, dynamic> json) => GymMember(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    email: json['email'],
    phone: json['phone'],
    dateOfBirth: json['dateOfBirth'] != null ? DateTime.parse(json['dateOfBirth']) : null,
    membershipId: json['membershipId'],
    membershipName: json['membershipName'],
    joinDate: DateTime.parse(json['joinDate']),
    expiryDate: json['expiryDate'] != null ? DateTime.parse(json['expiryDate']) : null,
    status: json['status'] ?? 'active',
  );

  String get fullName => '$firstName $lastName';
}

class GymMembership {
  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final double price;
  final int durationMonths;
  final List<String>? features;
  final String status;

  GymMembership({
    required this.id,
    required this.tenantId,
    required this.name,
    this.description,
    required this.price,
    required this.durationMonths,
    this.features,
    required this.status,
  });

  factory GymMembership.fromJson(Map<String, dynamic> json) => GymMembership(
    id: json['id'],
    tenantId: json['tenantId'],
    name: json['name'],
    description: json['description'],
    price: (json['price'] ?? 0).toDouble(),
    durationMonths: json['durationMonths'] ?? 1,
    features: json['features'] != null ? List<String>.from(json['features']) : null,
    status: json['status'] ?? 'active',
  );
}

class GymTrainer {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final List<String>? specializations;
  final String status;

  GymTrainer({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.specializations,
    required this.status,
  });

  factory GymTrainer.fromJson(Map<String, dynamic> json) => GymTrainer(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    email: json['email'],
    phone: json['phone'],
    specializations: json['specializations'] != null ? List<String>.from(json['specializations']) : null,
    status: json['status'] ?? 'active',
  );

  String get fullName => '$firstName $lastName';
}

class GymDashboardStats {
  final int totalMembers;
  final int activeMembers;
  final int expiringMemberships;
  final int totalTrainers;
  final int todayCheckIns;
  final double monthlyRevenue;

  GymDashboardStats({
    required this.totalMembers,
    required this.activeMembers,
    required this.expiringMemberships,
    required this.totalTrainers,
    required this.todayCheckIns,
    required this.monthlyRevenue,
  });

  factory GymDashboardStats.fromJson(Map<String, dynamic> json) => GymDashboardStats(
    totalMembers: json['totalMembers'] ?? 0,
    activeMembers: json['activeMembers'] ?? 0,
    expiringMemberships: json['expiringMemberships'] ?? 0,
    totalTrainers: json['totalTrainers'] ?? 0,
    todayCheckIns: json['todayCheckIns'] ?? 0,
    monthlyRevenue: (json['monthlyRevenue'] ?? 0).toDouble(),
  );
}
