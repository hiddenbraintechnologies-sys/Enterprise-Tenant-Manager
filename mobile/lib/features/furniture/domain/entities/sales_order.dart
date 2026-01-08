class SalesOrder {
  final String id;
  final String tenantId;
  final String orderNumber;
  final String? customerId;
  final String? customerName;
  final String orderType;
  final String status;
  final double subtotal;
  final double taxAmount;
  final double discountAmount;
  final double totalAmount;
  final double advanceAmount;
  final double balanceAmount;
  final String currency;
  final DateTime? orderDate;
  final DateTime? expectedDeliveryDate;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  SalesOrder({
    required this.id,
    required this.tenantId,
    required this.orderNumber,
    this.customerId,
    this.customerName,
    required this.orderType,
    required this.status,
    required this.subtotal,
    required this.taxAmount,
    required this.discountAmount,
    required this.totalAmount,
    required this.advanceAmount,
    required this.balanceAmount,
    required this.currency,
    this.orderDate,
    this.expectedDeliveryDate,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SalesOrder.fromJson(Map<String, dynamic> json) {
    return SalesOrder(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      orderNumber: json['orderNumber'] as String,
      customerId: json['customerId'] as String?,
      customerName: json['customerName'] as String?,
      orderType: json['orderType'] as String? ?? 'retail',
      status: json['status'] as String? ?? 'draft',
      subtotal: _parseDouble(json['subtotal']),
      taxAmount: _parseDouble(json['taxAmount']),
      discountAmount: _parseDouble(json['discountAmount']),
      totalAmount: _parseDouble(json['totalAmount']),
      advanceAmount: _parseDouble(json['advanceAmount']),
      balanceAmount: _parseDouble(json['balanceAmount']),
      currency: json['currency'] as String? ?? 'INR',
      orderDate: json['orderDate'] != null 
          ? DateTime.parse(json['orderDate'] as String) 
          : null,
      expectedDeliveryDate: json['expectedDeliveryDate'] != null 
          ? DateTime.parse(json['expectedDeliveryDate'] as String) 
          : null,
      notes: json['notes'] as String?,
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
      'orderNumber': orderNumber,
      'customerId': customerId,
      'customerName': customerName,
      'orderType': orderType,
      'status': status,
      'subtotal': subtotal,
      'taxAmount': taxAmount,
      'discountAmount': discountAmount,
      'totalAmount': totalAmount,
      'advanceAmount': advanceAmount,
      'balanceAmount': balanceAmount,
      'currency': currency,
      'orderDate': orderDate?.toIso8601String(),
      'expectedDeliveryDate': expectedDeliveryDate?.toIso8601String(),
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
