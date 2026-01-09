import 'package:equatable/equatable.dart';

class SalonAppointment extends Equatable {
  final String id;
  final String tenantId;
  final String customerId;
  final String? customerName;
  final String? customerPhone;
  final String staffId;
  final String? staffName;
  final String serviceId;
  final String? serviceName;
  final DateTime dateTime;
  final String status;
  final String? notes;
  final double totalAmount;
  final DateTime createdAt;
  final DateTime updatedAt;

  const SalonAppointment({
    required this.id,
    required this.tenantId,
    required this.customerId,
    this.customerName,
    this.customerPhone,
    required this.staffId,
    this.staffName,
    required this.serviceId,
    this.serviceName,
    required this.dateTime,
    required this.status,
    this.notes,
    required this.totalAmount,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SalonAppointment.fromJson(Map<String, dynamic> json) {
    return SalonAppointment(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      customerId: json['customerId'] as String? ?? '',
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
      staffId: json['staffId'] as String? ?? '',
      staffName: json['staffName'] as String?,
      serviceId: json['serviceId'] as String,
      serviceName: json['serviceName'] as String?,
      dateTime: json['dateTime'] != null
          ? DateTime.parse(json['dateTime'] as String)
          : json['appointmentDate'] != null
              ? DateTime.parse(json['appointmentDate'] as String)
              : DateTime.now(),
      status: json['status'] as String? ?? 'scheduled',
      notes: json['notes'] as String?,
      totalAmount: _parseDouble(json['totalAmount'] ?? json['price']),
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
      'customerId': customerId,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'staffId': staffId,
      'staffName': staffName,
      'serviceId': serviceId,
      'serviceName': serviceName,
      'dateTime': dateTime.toIso8601String(),
      'status': status,
      'notes': notes,
      'totalAmount': totalAmount,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  SalonAppointment copyWith({
    String? id,
    String? tenantId,
    String? customerId,
    String? customerName,
    String? customerPhone,
    String? staffId,
    String? staffName,
    String? serviceId,
    String? serviceName,
    DateTime? dateTime,
    String? status,
    String? notes,
    double? totalAmount,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return SalonAppointment(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      staffId: staffId ?? this.staffId,
      staffName: staffName ?? this.staffName,
      serviceId: serviceId ?? this.serviceId,
      serviceName: serviceName ?? this.serviceName,
      dateTime: dateTime ?? this.dateTime,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      totalAmount: totalAmount ?? this.totalAmount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        customerId,
        customerName,
        customerPhone,
        staffId,
        staffName,
        serviceId,
        serviceName,
        dateTime,
        status,
        notes,
        totalAmount,
        createdAt,
        updatedAt,
      ];
}
