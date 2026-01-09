import 'package:equatable/equatable.dart';

class WorkingHours extends Equatable {
  final String dayOfWeek;
  final String? startTime;
  final String? endTime;
  final bool isWorking;

  const WorkingHours({
    required this.dayOfWeek,
    this.startTime,
    this.endTime,
    required this.isWorking,
  });

  factory WorkingHours.fromJson(Map<String, dynamic> json) {
    return WorkingHours(
      dayOfWeek: json['dayOfWeek'] as String,
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      isWorking: json['isWorking'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'dayOfWeek': dayOfWeek,
      'startTime': startTime,
      'endTime': endTime,
      'isWorking': isWorking,
    };
  }

  @override
  List<Object?> get props => [dayOfWeek, startTime, endTime, isWorking];
}

class SalonStaff extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String? phone;
  final String? email;
  final List<String> specializations;
  final List<WorkingHours> workingHours;
  final double commission;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const SalonStaff({
    required this.id,
    required this.tenantId,
    required this.name,
    this.phone,
    this.email,
    required this.specializations,
    required this.workingHours,
    required this.commission,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SalonStaff.fromJson(Map<String, dynamic> json) {
    List<String> specializations = [];
    if (json['specializations'] != null) {
      specializations = List<String>.from(json['specializations']);
    }

    List<WorkingHours> workingHours = [];
    if (json['workingHours'] != null) {
      workingHours = (json['workingHours'] as List)
          .map((e) => WorkingHours.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    String name = json['name'] as String? ?? '';
    if (name.isEmpty) {
      final firstName = json['firstName'] as String? ?? '';
      final lastName = json['lastName'] as String? ?? '';
      name = '$firstName $lastName'.trim();
    }

    return SalonStaff(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: name,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      specializations: specializations,
      workingHours: workingHours,
      commission: _parseDouble(json['commission']),
      isActive: json['isActive'] as bool? ?? json['status'] == 'active',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
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
      'specializations': specializations,
      'workingHours': workingHours.map((e) => e.toJson()).toList(),
      'commission': commission,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  SalonStaff copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? phone,
    String? email,
    List<String>? specializations,
    List<WorkingHours>? workingHours,
    double? commission,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return SalonStaff(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      specializations: specializations ?? this.specializations,
      workingHours: workingHours ?? this.workingHours,
      commission: commission ?? this.commission,
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
        phone,
        email,
        specializations,
        workingHours,
        commission,
        isActive,
        createdAt,
        updatedAt,
      ];
}
