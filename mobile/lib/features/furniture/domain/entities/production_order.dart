class ProductionOrder {
  final String id;
  final String tenantId;
  final String orderNumber;
  final String productId;
  final String? productName;
  final int quantity;
  final String status;
  final String priority;
  final DateTime? scheduledStartDate;
  final DateTime? scheduledEndDate;
  final DateTime? actualStartDate;
  final DateTime? actualEndDate;
  final String? notes;
  final double? wastageQuantity;
  final DateTime createdAt;
  final DateTime updatedAt;

  ProductionOrder({
    required this.id,
    required this.tenantId,
    required this.orderNumber,
    required this.productId,
    this.productName,
    required this.quantity,
    required this.status,
    required this.priority,
    this.scheduledStartDate,
    this.scheduledEndDate,
    this.actualStartDate,
    this.actualEndDate,
    this.notes,
    this.wastageQuantity,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProductionOrder.fromJson(Map<String, dynamic> json) {
    return ProductionOrder(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      orderNumber: json['orderNumber'] as String,
      productId: json['productId'] as String,
      productName: json['productName'] as String?,
      quantity: json['quantity'] as int? ?? 1,
      status: json['status'] as String? ?? 'draft',
      priority: json['priority'] as String? ?? 'normal',
      scheduledStartDate: json['scheduledStartDate'] != null 
          ? DateTime.parse(json['scheduledStartDate'] as String) 
          : null,
      scheduledEndDate: json['scheduledEndDate'] != null 
          ? DateTime.parse(json['scheduledEndDate'] as String) 
          : null,
      actualStartDate: json['actualStartDate'] != null 
          ? DateTime.parse(json['actualStartDate'] as String) 
          : null,
      actualEndDate: json['actualEndDate'] != null 
          ? DateTime.parse(json['actualEndDate'] as String) 
          : null,
      notes: json['notes'] as String?,
      wastageQuantity: json['wastageQuantity'] != null 
          ? (json['wastageQuantity'] as num).toDouble() 
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'orderNumber': orderNumber,
      'productId': productId,
      'productName': productName,
      'quantity': quantity,
      'status': status,
      'priority': priority,
      'scheduledStartDate': scheduledStartDate?.toIso8601String(),
      'scheduledEndDate': scheduledEndDate?.toIso8601String(),
      'actualStartDate': actualStartDate?.toIso8601String(),
      'actualEndDate': actualEndDate?.toIso8601String(),
      'notes': notes,
      'wastageQuantity': wastageQuantity,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
