import 'package:equatable/equatable.dart';

class ClinicPatient extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String? phone;
  final String? email;
  final DateTime? dateOfBirth;
  final String? gender;
  final String? bloodGroup;
  final String? address;
  final List<String>? medicalHistory;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ClinicPatient({
    required this.id,
    required this.tenantId,
    required this.name,
    this.phone,
    this.email,
    this.dateOfBirth,
    this.gender,
    this.bloodGroup,
    this.address,
    this.medicalHistory,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ClinicPatient.fromJson(Map<String, dynamic> json) {
    return ClinicPatient(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.parse(json['dateOfBirth'] as String)
          : null,
      gender: json['gender'] as String?,
      bloodGroup: json['bloodGroup'] as String?,
      address: json['address'] as String?,
      medicalHistory: json['medicalHistory'] != null
          ? List<String>.from(json['medicalHistory'] as List)
          : null,
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
      'dateOfBirth': dateOfBirth?.toIso8601String(),
      'gender': gender,
      'bloodGroup': bloodGroup,
      'address': address,
      'medicalHistory': medicalHistory,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  ClinicPatient copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? phone,
    String? email,
    DateTime? dateOfBirth,
    String? gender,
    String? bloodGroup,
    String? address,
    List<String>? medicalHistory,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ClinicPatient(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      bloodGroup: bloodGroup ?? this.bloodGroup,
      address: address ?? this.address,
      medicalHistory: medicalHistory ?? this.medicalHistory,
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
        dateOfBirth,
        gender,
        bloodGroup,
        address,
        medicalHistory,
        createdAt,
        updatedAt,
      ];
}
