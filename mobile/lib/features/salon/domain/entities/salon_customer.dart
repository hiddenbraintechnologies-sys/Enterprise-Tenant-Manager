import 'package:equatable/equatable.dart';

class VisitHistory extends Equatable {
  final String appointmentId;
  final DateTime visitDate;
  final String serviceName;
  final double amount;

  const VisitHistory({
    required this.appointmentId,
    required this.visitDate,
    required this.serviceName,
    required this.amount,
  });

  factory VisitHistory.fromJson(Map<String, dynamic> json) {
    return VisitHistory(
      appointmentId: json['appointmentId'] as String,
      visitDate: DateTime.parse(json['visitDate'] as String),
      serviceName: json['serviceName'] as String,
      amount: _parseDouble(json['amount']),
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  Map<String, dynamic> toJson() {
    return {
      'appointmentId': appointmentId,
      'visitDate': visitDate.toIso8601String(),
      'serviceName': serviceName,
      'amount': amount,
    };
  }

  @override
  List<Object?> get props => [appointmentId, visitDate, serviceName, amount];
}

class SalonCustomer extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String? phone;
  final String? email;
  final Map<String, dynamic> preferences;
  final List<VisitHistory> visitHistory;
  final int loyaltyPoints;
  final DateTime createdAt;
  final DateTime updatedAt;

  const SalonCustomer({
    required this.id,
    required this.tenantId,
    required this.name,
    this.phone,
    this.email,
    required this.preferences,
    required this.visitHistory,
    required this.loyaltyPoints,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SalonCustomer.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> preferences = {};
    if (json['preferences'] != null) {
      preferences = Map<String, dynamic>.from(json['preferences']);
    }

    List<VisitHistory> visitHistory = [];
    if (json['visitHistory'] != null) {
      visitHistory = (json['visitHistory'] as List)
          .map((e) => VisitHistory.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    return SalonCustomer(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String? ?? json['customerName'] as String? ?? '',
      phone: json['phone'] as String? ?? json['customerPhone'] as String?,
      email: json['email'] as String?,
      preferences: preferences,
      visitHistory: visitHistory,
      loyaltyPoints: json['loyaltyPoints'] as int? ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'phone': phone,
      'email': email,
      'preferences': preferences,
      'visitHistory': visitHistory.map((e) => e.toJson()).toList(),
      'loyaltyPoints': loyaltyPoints,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  SalonCustomer copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? phone,
    String? email,
    Map<String, dynamic>? preferences,
    List<VisitHistory>? visitHistory,
    int? loyaltyPoints,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return SalonCustomer(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      preferences: preferences ?? this.preferences,
      visitHistory: visitHistory ?? this.visitHistory,
      loyaltyPoints: loyaltyPoints ?? this.loyaltyPoints,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  int get totalVisits => visitHistory.length;

  double get totalSpent =>
      visitHistory.fold(0.0, (sum, visit) => sum + visit.amount);

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        phone,
        email,
        preferences,
        visitHistory,
        loyaltyPoints,
        createdAt,
        updatedAt,
      ];
}
