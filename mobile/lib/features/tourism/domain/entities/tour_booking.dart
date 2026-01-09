import 'package:equatable/equatable.dart';

enum BookingStatus { pending, confirmed, cancelled, completed }

enum PaymentStatus { pending, partial, paid, refunded }

class TourBooking extends Equatable {
  final String id;
  final String tenantId;
  final String packageId;
  final String? packageName;
  final String customerId;
  final String? customerName;
  final DateTime travelDate;
  final int numberOfAdults;
  final int numberOfChildren;
  final double totalAmount;
  final BookingStatus status;
  final PaymentStatus paymentStatus;
  final String? specialRequests;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TourBooking({
    required this.id,
    required this.tenantId,
    required this.packageId,
    this.packageName,
    required this.customerId,
    this.customerName,
    required this.travelDate,
    required this.numberOfAdults,
    this.numberOfChildren = 0,
    required this.totalAmount,
    required this.status,
    required this.paymentStatus,
    this.specialRequests,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TourBooking.fromJson(Map<String, dynamic> json) {
    return TourBooking(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      packageId: json['packageId'] as String,
      packageName: json['packageName'] as String?,
      customerId: json['customerId'] as String,
      customerName: json['customerName'] as String?,
      travelDate: DateTime.parse(json['travelDate'] as String),
      numberOfAdults: json['numberOfAdults'] as int? ?? 1,
      numberOfChildren: json['numberOfChildren'] as int? ?? 0,
      totalAmount: _parseDouble(json['totalAmount']),
      status: _parseBookingStatus(json['status']),
      paymentStatus: _parsePaymentStatus(json['paymentStatus']),
      specialRequests: json['specialRequests'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static BookingStatus _parseBookingStatus(dynamic value) {
    switch (value?.toString().toLowerCase()) {
      case 'confirmed':
        return BookingStatus.confirmed;
      case 'cancelled':
        return BookingStatus.cancelled;
      case 'completed':
        return BookingStatus.completed;
      default:
        return BookingStatus.pending;
    }
  }

  static PaymentStatus _parsePaymentStatus(dynamic value) {
    switch (value?.toString().toLowerCase()) {
      case 'partial':
        return PaymentStatus.partial;
      case 'paid':
        return PaymentStatus.paid;
      case 'refunded':
        return PaymentStatus.refunded;
      default:
        return PaymentStatus.pending;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'packageId': packageId,
      'packageName': packageName,
      'customerId': customerId,
      'customerName': customerName,
      'travelDate': travelDate.toIso8601String(),
      'numberOfAdults': numberOfAdults,
      'numberOfChildren': numberOfChildren,
      'totalAmount': totalAmount,
      'status': status.name,
      'paymentStatus': paymentStatus.name,
      'specialRequests': specialRequests,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  TourBooking copyWith({
    String? id,
    String? tenantId,
    String? packageId,
    String? packageName,
    String? customerId,
    String? customerName,
    DateTime? travelDate,
    int? numberOfAdults,
    int? numberOfChildren,
    double? totalAmount,
    BookingStatus? status,
    PaymentStatus? paymentStatus,
    String? specialRequests,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return TourBooking(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      packageId: packageId ?? this.packageId,
      packageName: packageName ?? this.packageName,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      travelDate: travelDate ?? this.travelDate,
      numberOfAdults: numberOfAdults ?? this.numberOfAdults,
      numberOfChildren: numberOfChildren ?? this.numberOfChildren,
      totalAmount: totalAmount ?? this.totalAmount,
      status: status ?? this.status,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      specialRequests: specialRequests ?? this.specialRequests,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  int get totalTravelers => numberOfAdults + numberOfChildren;

  @override
  List<Object?> get props => [
        id,
        tenantId,
        packageId,
        packageName,
        customerId,
        customerName,
        travelDate,
        numberOfAdults,
        numberOfChildren,
        totalAmount,
        status,
        paymentStatus,
        specialRequests,
        createdAt,
        updatedAt,
      ];
}
