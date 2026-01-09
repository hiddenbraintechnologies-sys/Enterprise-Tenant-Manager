import 'package:equatable/equatable.dart';

enum ResidentStatus { active, vacated }

class PgResident extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String phone;
  final String? email;
  final String? occupation;
  final String? employer;
  final String? idProof;
  final String? idProofNumber;
  final String roomId;
  final String? roomNumber;
  final DateTime checkInDate;
  final DateTime? checkOutDate;
  final ResidentStatus status;
  final int rentDueDate;
  final String? emergencyContact;
  final String? emergencyContactPhone;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PgResident({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.phone,
    this.email,
    this.occupation,
    this.employer,
    this.idProof,
    this.idProofNumber,
    required this.roomId,
    this.roomNumber,
    required this.checkInDate,
    this.checkOutDate,
    required this.status,
    required this.rentDueDate,
    this.emergencyContact,
    this.emergencyContactPhone,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PgResident.fromJson(Map<String, dynamic> json) {
    return PgResident(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      occupation: json['occupation'] as String?,
      employer: json['employer'] as String?,
      idProof: json['idProof'] as String?,
      idProofNumber: json['idProofNumber'] as String?,
      roomId: json['roomId'] as String,
      roomNumber: json['roomNumber'] as String?,
      checkInDate: DateTime.parse(json['checkInDate'] as String),
      checkOutDate: json['checkOutDate'] != null
          ? DateTime.parse(json['checkOutDate'] as String)
          : null,
      status: _parseStatus(json['status'] as String),
      rentDueDate: json['rentDueDate'] as int? ?? 1,
      emergencyContact: json['emergencyContact'] as String?,
      emergencyContactPhone: json['emergencyContactPhone'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static ResidentStatus _parseStatus(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return ResidentStatus.active;
      case 'vacated':
        return ResidentStatus.vacated;
      default:
        return ResidentStatus.active;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'phone': phone,
      'email': email,
      'occupation': occupation,
      'employer': employer,
      'idProof': idProof,
      'idProofNumber': idProofNumber,
      'roomId': roomId,
      'roomNumber': roomNumber,
      'checkInDate': checkInDate.toIso8601String(),
      'checkOutDate': checkOutDate?.toIso8601String(),
      'status': status.name,
      'rentDueDate': rentDueDate,
      'emergencyContact': emergencyContact,
      'emergencyContactPhone': emergencyContactPhone,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  PgResident copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? phone,
    String? email,
    String? occupation,
    String? employer,
    String? idProof,
    String? idProofNumber,
    String? roomId,
    String? roomNumber,
    DateTime? checkInDate,
    DateTime? checkOutDate,
    ResidentStatus? status,
    int? rentDueDate,
    String? emergencyContact,
    String? emergencyContactPhone,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PgResident(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      occupation: occupation ?? this.occupation,
      employer: employer ?? this.employer,
      idProof: idProof ?? this.idProof,
      idProofNumber: idProofNumber ?? this.idProofNumber,
      roomId: roomId ?? this.roomId,
      roomNumber: roomNumber ?? this.roomNumber,
      checkInDate: checkInDate ?? this.checkInDate,
      checkOutDate: checkOutDate ?? this.checkOutDate,
      status: status ?? this.status,
      rentDueDate: rentDueDate ?? this.rentDueDate,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      emergencyContactPhone: emergencyContactPhone ?? this.emergencyContactPhone,
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
        occupation,
        employer,
        idProof,
        idProofNumber,
        roomId,
        roomNumber,
        checkInDate,
        checkOutDate,
        status,
        rentDueDate,
        emergencyContact,
        emergencyContactPhone,
        createdAt,
        updatedAt,
      ];
}
