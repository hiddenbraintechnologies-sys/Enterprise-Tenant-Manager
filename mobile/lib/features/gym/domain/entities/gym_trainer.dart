import 'package:equatable/equatable.dart';

class GymTrainer extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String phone;
  final String? email;
  final String specialization;
  final List<String> certifications;
  final Map<String, dynamic>? schedule;
  final double hourlyRate;
  final bool isActive;
  final String? photoUrl;
  final String? bio;
  final DateTime createdAt;
  final DateTime updatedAt;

  const GymTrainer({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.phone,
    this.email,
    required this.specialization,
    this.certifications = const [],
    this.schedule,
    required this.hourlyRate,
    this.isActive = true,
    this.photoUrl,
    this.bio,
    required this.createdAt,
    required this.updatedAt,
  });

  factory GymTrainer.fromJson(Map<String, dynamic> json) {
    return GymTrainer(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      specialization: json['specialization'] as String,
      certifications: (json['certifications'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      schedule: json['schedule'] as Map<String, dynamic>?,
      hourlyRate: _parseDouble(json['hourlyRate']),
      isActive: json['isActive'] as bool? ?? true,
      photoUrl: json['photoUrl'] as String?,
      bio: json['bio'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'phone': phone,
      'email': email,
      'specialization': specialization,
      'certifications': certifications,
      'schedule': schedule,
      'hourlyRate': hourlyRate,
      'isActive': isActive,
      'photoUrl': photoUrl,
      'bio': bio,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  GymTrainer copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? phone,
    String? email,
    String? specialization,
    List<String>? certifications,
    Map<String, dynamic>? schedule,
    double? hourlyRate,
    bool? isActive,
    String? photoUrl,
    String? bio,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return GymTrainer(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      specialization: specialization ?? this.specialization,
      certifications: certifications ?? this.certifications,
      schedule: schedule ?? this.schedule,
      hourlyRate: hourlyRate ?? this.hourlyRate,
      isActive: isActive ?? this.isActive,
      photoUrl: photoUrl ?? this.photoUrl,
      bio: bio ?? this.bio,
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
        specialization,
        certifications,
        schedule,
        hourlyRate,
        isActive,
        photoUrl,
        bio,
        createdAt,
        updatedAt,
      ];
}
