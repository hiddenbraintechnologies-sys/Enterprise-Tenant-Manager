import 'package:equatable/equatable.dart';

class ClinicDoctor extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String? specialization;
  final String? qualification;
  final String? phone;
  final String? email;
  final List<String>? availableDays;
  final double? consultationFee;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ClinicDoctor({
    required this.id,
    required this.tenantId,
    required this.name,
    this.specialization,
    this.qualification,
    this.phone,
    this.email,
    this.availableDays,
    this.consultationFee,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ClinicDoctor.fromJson(Map<String, dynamic> json) {
    return ClinicDoctor(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      specialization: json['specialization'] as String?,
      qualification: json['qualification'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      availableDays: json['availableDays'] != null
          ? List<String>.from(json['availableDays'] as List)
          : null,
      consultationFee: _parseDouble(json['consultationFee']),
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'specialization': specialization,
      'qualification': qualification,
      'phone': phone,
      'email': email,
      'availableDays': availableDays,
      'consultationFee': consultationFee,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  ClinicDoctor copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? specialization,
    String? qualification,
    String? phone,
    String? email,
    List<String>? availableDays,
    double? consultationFee,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ClinicDoctor(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      specialization: specialization ?? this.specialization,
      qualification: qualification ?? this.qualification,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      availableDays: availableDays ?? this.availableDays,
      consultationFee: consultationFee ?? this.consultationFee,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        specialization,
        qualification,
        phone,
        email,
        availableDays,
        consultationFee,
        isActive,
        createdAt,
        updatedAt,
      ];
}
