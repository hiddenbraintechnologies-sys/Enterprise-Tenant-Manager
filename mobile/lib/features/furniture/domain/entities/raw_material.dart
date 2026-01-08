class RawMaterial {
  final String id;
  final String tenantId;
  final String name;
  final String? sku;
  final String? description;
  final String? categoryId;
  final String unitOfMeasure;
  final double currentStock;
  final double minStockLevel;
  final double unitCost;
  final String? supplierId;
  final String? supplierName;
  final DateTime createdAt;
  final DateTime updatedAt;

  RawMaterial({
    required this.id,
    required this.tenantId,
    required this.name,
    this.sku,
    this.description,
    this.categoryId,
    required this.unitOfMeasure,
    required this.currentStock,
    required this.minStockLevel,
    required this.unitCost,
    this.supplierId,
    this.supplierName,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isLowStock => currentStock <= minStockLevel;

  factory RawMaterial.fromJson(Map<String, dynamic> json) {
    return RawMaterial(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      sku: json['sku'] as String?,
      description: json['description'] as String?,
      categoryId: json['categoryId'] as String?,
      unitOfMeasure: json['unitOfMeasure'] as String? ?? 'pcs',
      currentStock: _parseDouble(json['currentStock']),
      minStockLevel: _parseDouble(json['minStockLevel']),
      unitCost: _parseDouble(json['unitCost']),
      supplierId: json['supplierId'] as String?,
      supplierName: json['supplierName'] as String?,
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
      'name': name,
      'sku': sku,
      'description': description,
      'categoryId': categoryId,
      'unitOfMeasure': unitOfMeasure,
      'currentStock': currentStock,
      'minStockLevel': minStockLevel,
      'unitCost': unitCost,
      'supplierId': supplierId,
      'supplierName': supplierName,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
