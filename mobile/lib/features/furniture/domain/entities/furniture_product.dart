class FurnitureProduct {
  final String id;
  final String tenantId;
  final String name;
  final String? sku;
  final String? description;
  final String productType;
  final String? materialType;
  final double? width;
  final double? height;
  final double? depth;
  final String? dimensionUnit;
  final double costPrice;
  final double sellingPrice;
  final double? wholesalePrice;
  final String? gstPercentage;
  final String? hsnCode;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  FurnitureProduct({
    required this.id,
    required this.tenantId,
    required this.name,
    this.sku,
    this.description,
    required this.productType,
    this.materialType,
    this.width,
    this.height,
    this.depth,
    this.dimensionUnit,
    required this.costPrice,
    required this.sellingPrice,
    this.wholesalePrice,
    this.gstPercentage,
    this.hsnCode,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FurnitureProduct.fromJson(Map<String, dynamic> json) {
    return FurnitureProduct(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      sku: json['sku'] as String?,
      description: json['description'] as String?,
      productType: json['productType'] as String,
      materialType: json['materialType'] as String?,
      width: (json['width'] as num?)?.toDouble(),
      height: (json['height'] as num?)?.toDouble(),
      depth: (json['depth'] as num?)?.toDouble(),
      dimensionUnit: json['dimensionUnit'] as String?,
      costPrice: _parseDouble(json['costPrice']),
      sellingPrice: _parseDouble(json['sellingPrice']),
      wholesalePrice: json['wholesalePrice'] != null 
          ? _parseDouble(json['wholesalePrice']) 
          : null,
      gstPercentage: json['gstPercentage'] as String?,
      hsnCode: json['hsnCode'] as String?,
      isActive: json['isActive'] as bool? ?? true,
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
      'productType': productType,
      'materialType': materialType,
      'width': width,
      'height': height,
      'depth': depth,
      'dimensionUnit': dimensionUnit,
      'costPrice': costPrice,
      'sellingPrice': sellingPrice,
      'wholesalePrice': wholesalePrice,
      'gstPercentage': gstPercentage,
      'hsnCode': hsnCode,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
