class FurnitureInvoice {
  final String id;
  final String tenantId;
  final String invoiceNumber;
  final String invoiceType;
  final String status;
  final String? salesOrderId;
  final String customerId;
  final DateTime invoiceDate;
  final DateTime? dueDate;
  final String currency;
  final double subtotal;
  final double taxAmount;
  final double totalAmount;
  final double paidAmount;
  final String? billingName;
  final String? billingEmail;
  final String? billingPhone;
  final String? billingAddress;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  FurnitureInvoice({
    required this.id,
    required this.tenantId,
    required this.invoiceNumber,
    required this.invoiceType,
    required this.status,
    this.salesOrderId,
    required this.customerId,
    required this.invoiceDate,
    this.dueDate,
    required this.currency,
    required this.subtotal,
    required this.taxAmount,
    required this.totalAmount,
    required this.paidAmount,
    this.billingName,
    this.billingEmail,
    this.billingPhone,
    this.billingAddress,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FurnitureInvoice.fromJson(Map<String, dynamic> json) {
    return FurnitureInvoice(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      invoiceNumber: json['invoiceNumber'] as String,
      invoiceType: json['invoiceType'] as String? ?? 'standard',
      status: json['status'] as String? ?? 'draft',
      salesOrderId: json['salesOrderId'] as String?,
      customerId: json['customerId'] as String,
      invoiceDate: DateTime.parse(json['invoiceDate'] as String),
      dueDate: json['dueDate'] != null
          ? DateTime.parse(json['dueDate'] as String)
          : null,
      currency: json['currency'] as String? ?? 'INR',
      subtotal: _parseDouble(json['subtotal']),
      taxAmount: _parseDouble(json['taxAmount']),
      totalAmount: _parseDouble(json['totalAmount']),
      paidAmount: _parseDouble(json['paidAmount']),
      billingName: json['billingName'] as String?,
      billingEmail: json['billingEmail'] as String?,
      billingPhone: json['billingPhone'] as String?,
      billingAddress: json['billingAddress'] as String?,
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
      'invoiceNumber': invoiceNumber,
      'invoiceType': invoiceType,
      'status': status,
      'salesOrderId': salesOrderId,
      'customerId': customerId,
      'invoiceDate': invoiceDate.toIso8601String(),
      'dueDate': dueDate?.toIso8601String(),
      'currency': currency,
      'subtotal': subtotal,
      'taxAmount': taxAmount,
      'totalAmount': totalAmount,
      'paidAmount': paidAmount,
      'billingName': billingName,
      'billingEmail': billingEmail,
      'billingPhone': billingPhone,
      'billingAddress': billingAddress,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  double get balanceAmount => totalAmount - paidAmount;
  bool get isPaid => status == 'paid';
  bool get isOverdue => status == 'overdue';
  bool get isDraft => status == 'draft';

  String get statusDisplay {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'issued':
        return 'Issued';
      case 'partially_paid':
        return 'Partially Paid';
      case 'paid':
        return 'Paid';
      case 'overdue':
        return 'Overdue';
      case 'cancelled':
        return 'Cancelled';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  }
}
