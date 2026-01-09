import 'package:equatable/equatable.dart';

enum LogisticsOrderStatus {
  pending,
  pickedUp,
  inTransit,
  delivered,
  cancelled,
}

class LogisticsOrderItem extends Equatable {
  final String name;
  final int quantity;
  final double weight;
  final String? description;

  const LogisticsOrderItem({
    required this.name,
    required this.quantity,
    required this.weight,
    this.description,
  });

  factory LogisticsOrderItem.fromJson(Map<String, dynamic> json) {
    return LogisticsOrderItem(
      name: json['name'] as String,
      quantity: json['quantity'] as int,
      weight: _parseDouble(json['weight']),
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'quantity': quantity,
      'weight': weight,
      'description': description,
    };
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  @override
  List<Object?> get props => [name, quantity, weight, description];
}

class LogisticsOrder extends Equatable {
  final String id;
  final String orderNumber;
  final String customerId;
  final String? customerName;
  final String pickupAddress;
  final String deliveryAddress;
  final List<LogisticsOrderItem> items;
  final double weight;
  final LogisticsOrderStatus status;
  final String? driverId;
  final String? driverName;
  final String? vehicleId;
  final String? vehicleNumber;
  final DateTime? estimatedDelivery;
  final DateTime? actualDelivery;
  final String? proofOfDelivery;
  final String tenantId;
  final DateTime createdAt;
  final DateTime updatedAt;

  const LogisticsOrder({
    required this.id,
    required this.orderNumber,
    required this.customerId,
    this.customerName,
    required this.pickupAddress,
    required this.deliveryAddress,
    required this.items,
    required this.weight,
    required this.status,
    this.driverId,
    this.driverName,
    this.vehicleId,
    this.vehicleNumber,
    this.estimatedDelivery,
    this.actualDelivery,
    this.proofOfDelivery,
    required this.tenantId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LogisticsOrder.fromJson(Map<String, dynamic> json) {
    return LogisticsOrder(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      customerId: json['customerId'] as String,
      customerName: json['customerName'] as String?,
      pickupAddress: json['pickupAddress'] as String,
      deliveryAddress: json['deliveryAddress'] as String,
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => LogisticsOrderItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      weight: _parseDouble(json['weight']),
      status: _parseStatus(json['status'] as String?),
      driverId: json['driverId'] as String?,
      driverName: json['driverName'] as String?,
      vehicleId: json['vehicleId'] as String?,
      vehicleNumber: json['vehicleNumber'] as String?,
      estimatedDelivery: json['estimatedDelivery'] != null
          ? DateTime.parse(json['estimatedDelivery'] as String)
          : null,
      actualDelivery: json['actualDelivery'] != null
          ? DateTime.parse(json['actualDelivery'] as String)
          : null,
      proofOfDelivery: json['proofOfDelivery'] as String?,
      tenantId: json['tenantId'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static LogisticsOrderStatus _parseStatus(String? status) {
    switch (status) {
      case 'pending':
        return LogisticsOrderStatus.pending;
      case 'picked_up':
        return LogisticsOrderStatus.pickedUp;
      case 'in_transit':
        return LogisticsOrderStatus.inTransit;
      case 'delivered':
        return LogisticsOrderStatus.delivered;
      case 'cancelled':
        return LogisticsOrderStatus.cancelled;
      default:
        return LogisticsOrderStatus.pending;
    }
  }

  String get statusString {
    switch (status) {
      case LogisticsOrderStatus.pending:
        return 'pending';
      case LogisticsOrderStatus.pickedUp:
        return 'picked_up';
      case LogisticsOrderStatus.inTransit:
        return 'in_transit';
      case LogisticsOrderStatus.delivered:
        return 'delivered';
      case LogisticsOrderStatus.cancelled:
        return 'cancelled';
    }
  }

  String get statusDisplayName {
    switch (status) {
      case LogisticsOrderStatus.pending:
        return 'Pending';
      case LogisticsOrderStatus.pickedUp:
        return 'Picked Up';
      case LogisticsOrderStatus.inTransit:
        return 'In Transit';
      case LogisticsOrderStatus.delivered:
        return 'Delivered';
      case LogisticsOrderStatus.cancelled:
        return 'Cancelled';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderNumber': orderNumber,
      'customerId': customerId,
      'customerName': customerName,
      'pickupAddress': pickupAddress,
      'deliveryAddress': deliveryAddress,
      'items': items.map((e) => e.toJson()).toList(),
      'weight': weight,
      'status': statusString,
      'driverId': driverId,
      'driverName': driverName,
      'vehicleId': vehicleId,
      'vehicleNumber': vehicleNumber,
      'estimatedDelivery': estimatedDelivery?.toIso8601String(),
      'actualDelivery': actualDelivery?.toIso8601String(),
      'proofOfDelivery': proofOfDelivery,
      'tenantId': tenantId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  LogisticsOrder copyWith({
    String? id,
    String? orderNumber,
    String? customerId,
    String? customerName,
    String? pickupAddress,
    String? deliveryAddress,
    List<LogisticsOrderItem>? items,
    double? weight,
    LogisticsOrderStatus? status,
    String? driverId,
    String? driverName,
    String? vehicleId,
    String? vehicleNumber,
    DateTime? estimatedDelivery,
    DateTime? actualDelivery,
    String? proofOfDelivery,
    String? tenantId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return LogisticsOrder(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      items: items ?? this.items,
      weight: weight ?? this.weight,
      status: status ?? this.status,
      driverId: driverId ?? this.driverId,
      driverName: driverName ?? this.driverName,
      vehicleId: vehicleId ?? this.vehicleId,
      vehicleNumber: vehicleNumber ?? this.vehicleNumber,
      estimatedDelivery: estimatedDelivery ?? this.estimatedDelivery,
      actualDelivery: actualDelivery ?? this.actualDelivery,
      proofOfDelivery: proofOfDelivery ?? this.proofOfDelivery,
      tenantId: tenantId ?? this.tenantId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        orderNumber,
        customerId,
        customerName,
        pickupAddress,
        deliveryAddress,
        items,
        weight,
        status,
        driverId,
        driverName,
        vehicleId,
        vehicleNumber,
        estimatedDelivery,
        actualDelivery,
        proofOfDelivery,
        tenantId,
        createdAt,
        updatedAt,
      ];
}
