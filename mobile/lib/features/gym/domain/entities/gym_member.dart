import 'package:equatable/equatable.dart';

class GymMember extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String phone;
  final String? email;
  final String membershipType;
  final DateTime startDate;
  final DateTime endDate;
  final String status;
  final String? emergencyContact;
  final String? emergencyPhone;
  final String? address;
  final String? photoUrl;
  final DateTime createdAt;
  final DateTime updatedAt;

  const GymMember({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.phone,
    this.email,
    required this.membershipType,
    required this.startDate,
    required this.endDate,
    required this.status,
    this.emergencyContact,
    this.emergencyPhone,
    this.address,
    this.photoUrl,
    required this.createdAt,
    required this.updatedAt,
  });

  factory GymMember.fromJson(Map<String, dynamic> json) {
    return GymMember(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      membershipType: json['membershipType'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      status: json['status'] as String,
      emergencyContact: json['emergencyContact'] as String?,
      emergencyPhone: json['emergencyPhone'] as String?,
      address: json['address'] as String?,
      photoUrl: json['photoUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'phone': phone,
      'email': email,
      'membershipType': membershipType,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'status': status,
      'emergencyContact': emergencyContact,
      'emergencyPhone': emergencyPhone,
      'address': address,
      'photoUrl': photoUrl,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  bool get isActive => status == 'active';
  bool get isExpired => endDate.isBefore(DateTime.now());
  int get daysUntilExpiry => endDate.difference(DateTime.now()).inDays;

  GymMember copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? phone,
    String? email,
    String? membershipType,
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    String? emergencyContact,
    String? emergencyPhone,
    String? address,
    String? photoUrl,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return GymMember(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      membershipType: membershipType ?? this.membershipType,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      status: status ?? this.status,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      emergencyPhone: emergencyPhone ?? this.emergencyPhone,
      address: address ?? this.address,
      photoUrl: photoUrl ?? this.photoUrl,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        phone,
        email,
        membershipType,
        startDate,
        endDate,
        status,
        emergencyContact,
        emergencyPhone,
        address,
        photoUrl,
        createdAt,
        updatedAt,
      ];
}
