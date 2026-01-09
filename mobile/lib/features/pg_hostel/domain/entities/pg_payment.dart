import 'package:equatable/equatable.dart';

enum PaymentType { rent, deposit, maintenance, advance, refund }

enum PaymentStatus { pending, paid, overdue, partial }

class PgPayment extends Equatable {
  final String id;
  final String tenantId;
  final String residentId;
  final String? residentName;
  final String? roomNumber;
  final double amount;
  final PaymentType type;
  final int month;
  final int year;
  final PaymentStatus status;
  final DateTime? paidDate;
  final String? paymentMethod;
  final String? transactionId;
  final String? notes;
  final DateTime dueDate;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PgPayment({
    required this.id,
    required this.tenantId,
    required this.residentId,
    this.residentName,
    this.roomNumber,
    required this.amount,
    required this.type,
    required this.month,
    required this.year,
    required this.status,
    this.paidDate,
    this.paymentMethod,
    this.transactionId,
    this.notes,
    required this.dueDate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PgPayment.fromJson(Map<String, dynamic> json) {
    return PgPayment(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      residentId: json['residentId'] as String,
      residentName: json['residentName'] as String?,
      roomNumber: json['roomNumber'] as String?,
      amount: _parseDouble(json['amount']),
      type: _parsePaymentType(json['type'] as String),
      month: json['month'] as int,
      year: json['year'] as int,
      status: _parsePaymentStatus(json['status'] as String),
      paidDate: json['paidDate'] != null
          ? DateTime.parse(json['paidDate'] as String)
          : null,
      paymentMethod: json['paymentMethod'] as String?,
      transactionId: json['transactionId'] as String?,
      notes: json['notes'] as String?,
      dueDate: DateTime.parse(json['dueDate'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static PaymentType _parsePaymentType(String type) {
    switch (type.toLowerCase()) {
      case 'rent':
        return PaymentType.rent;
      case 'deposit':
        return PaymentType.deposit;
      case 'maintenance':
        return PaymentType.maintenance;
      case 'advance':
        return PaymentType.advance;
      case 'refund':
        return PaymentType.refund;
      default:
        return PaymentType.rent;
    }
  }

  static PaymentStatus _parsePaymentStatus(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return PaymentStatus.pending;
      case 'paid':
        return PaymentStatus.paid;
      case 'overdue':
        return PaymentStatus.overdue;
      case 'partial':
        return PaymentStatus.partial;
      default:
        return PaymentStatus.pending;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'residentId': residentId,
      'residentName': residentName,
      'roomNumber': roomNumber,
      'amount': amount,
      'type': type.name,
      'month': month,
      'year': year,
      'status': status.name,
      'paidDate': paidDate?.toIso8601String(),
      'paymentMethod': paymentMethod,
      'transactionId': transactionId,
      'notes': notes,
      'dueDate': dueDate.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  PgPayment copyWith({
    String? id,
    String? tenantId,
    String? residentId,
    String? residentName,
    String? roomNumber,
    double? amount,
    PaymentType? type,
    int? month,
    int? year,
    PaymentStatus? status,
    DateTime? paidDate,
    String? paymentMethod,
    String? transactionId,
    String? notes,
    DateTime? dueDate,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PgPayment(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      residentId: residentId ?? this.residentId,
      residentName: residentName ?? this.residentName,
      roomNumber: roomNumber ?? this.roomNumber,
      amount: amount ?? this.amount,
      type: type ?? this.type,
      month: month ?? this.month,
      year: year ?? this.year,
      status: status ?? this.status,
      paidDate: paidDate ?? this.paidDate,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      transactionId: transactionId ?? this.transactionId,
      notes: notes ?? this.notes,
      dueDate: dueDate ?? this.dueDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        residentId,
        residentName,
        roomNumber,
        amount,
        type,
        month,
        year,
        status,
        paidDate,
        paymentMethod,
        transactionId,
        notes,
        dueDate,
        createdAt,
        updatedAt,
      ];
}
