import 'package:equatable/equatable.dart';

enum DriverStatus {
  available,
  onDelivery,
  offDuty,
}

class LogisticsDriver extends Equatable {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String licenseNumber;
  final String? vehicleId;
  final String? vehicleNumber;
  final DriverStatus status;
  final double rating;
  final int completedDeliveries;
  final String tenantId;
  final String? profileImage;
  final DateTime createdAt;
  final DateTime updatedAt;

  const LogisticsDriver({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    required this.licenseNumber,
    this.vehicleId,
    this.vehicleNumber,
    required this.status,
    required this.rating,
    required this.completedDeliveries,
    required this.tenantId,
    this.profileImage,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LogisticsDriver.fromJson(Map<String, dynamic> json) {
    return LogisticsDriver(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      licenseNumber: json['licenseNumber'] as String,
      vehicleId: json['vehicleId'] as String?,
      vehicleNumber: json['vehicleNumber'] as String?,
      status: _parseDriverStatus(json['status'] as String?),
      rating: _parseDouble(json['rating']),
      completedDeliveries: json['completedDeliveries'] as int? ?? 0,
      tenantId: json['tenantId'] as String,
      profileImage: json['profileImage'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static DriverStatus _parseDriverStatus(String? status) {
    switch (status) {
      case 'available':
        return DriverStatus.available;
      case 'on_delivery':
        return DriverStatus.onDelivery;
      case 'off_duty':
        return DriverStatus.offDuty;
      default:
        return DriverStatus.available;
    }
  }

  String get statusString {
    switch (status) {
      case DriverStatus.available:
        return 'available';
      case DriverStatus.onDelivery:
        return 'on_delivery';
      case DriverStatus.offDuty:
        return 'off_duty';
    }
  }

  String get statusDisplayName {
    switch (status) {
      case DriverStatus.available:
        return 'Available';
      case DriverStatus.onDelivery:
        return 'On Delivery';
      case DriverStatus.offDuty:
        return 'Off Duty';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'licenseNumber': licenseNumber,
      'vehicleId': vehicleId,
      'vehicleNumber': vehicleNumber,
      'status': statusString,
      'rating': rating,
      'completedDeliveries': completedDeliveries,
      'tenantId': tenantId,
      'profileImage': profileImage,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  LogisticsDriver copyWith({
    String? id,
    String? name,
    String? phone,
    String? email,
    String? licenseNumber,
    String? vehicleId,
    String? vehicleNumber,
    DriverStatus? status,
    double? rating,
    int? completedDeliveries,
    String? tenantId,
    String? profileImage,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return LogisticsDriver(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      vehicleId: vehicleId ?? this.vehicleId,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
      status: status ?? this.status,
      rating: rating ?? this.rating,
      completedDeliveries: completedDeliveries ?? this.completedDeliveries,
      tenantId: tenantId ?? this.tenantId,
      profileImage: profileImage ?? this.profileImage,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        phone,
        email,
        licenseNumber,
        vehicleId,
        vehicleNumber,
        status,
        rating,
        completedDeliveries,
        tenantId,
        profileImage,
        createdAt,
        updatedAt,
      ];
}
