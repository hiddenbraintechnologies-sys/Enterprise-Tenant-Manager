import 'package:equatable/equatable.dart';

class TourPackage extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final String destination;
  final int durationDays;
  final int durationNights;
  final List<String> inclusions;
  final List<String> exclusions;
  final double price;
  final double? discountPrice;
  final List<String> images;
  final bool isActive;
  final int maxGroupSize;
  final String? category;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TourPackage({
    required this.id,
    required this.tenantId,
    required this.name,
    this.description,
    required this.destination,
    required this.durationDays,
    required this.durationNights,
    this.inclusions = const [],
    this.exclusions = const [],
    required this.price,
    this.discountPrice,
    this.images = const [],
    required this.isActive,
    required this.maxGroupSize,
    this.category,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TourPackage.fromJson(Map<String, dynamic> json) {
    return TourPackage(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      destination: json['destination'] as String,
      durationDays: json['durationDays'] as int? ?? 0,
      durationNights: json['durationNights'] as int? ?? 0,
      inclusions: json['inclusions'] != null
          ? List<String>.from(json['inclusions'])
          : [],
      exclusions: json['exclusions'] != null
          ? List<String>.from(json['exclusions'])
          : [],
      price: _parseDouble(json['price']),
      discountPrice: json['discountPrice'] != null
          ? _parseDouble(json['discountPrice'])
          : null,
      images: json['images'] != null ? List<String>.from(json['images']) : [],
      isActive: json['isActive'] as bool? ?? true,
      maxGroupSize: json['maxGroupSize'] as int? ?? 10,
      category: json['category'] as String?,
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
      'description': description,
      'destination': destination,
      'durationDays': durationDays,
      'durationNights': durationNights,
      'inclusions': inclusions,
      'exclusions': exclusions,
      'price': price,
      'discountPrice': discountPrice,
      'images': images,
      'isActive': isActive,
      'maxGroupSize': maxGroupSize,
      'category': category,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  TourPackage copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? description,
    String? destination,
    int? durationDays,
    int? durationNights,
    List<String>? inclusions,
    List<String>? exclusions,
    double? price,
    double? discountPrice,
    List<String>? images,
    bool? isActive,
    int? maxGroupSize,
    String? category,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return TourPackage(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      description: description ?? this.description,
      destination: destination ?? this.destination,
      durationDays: durationDays ?? this.durationDays,
      durationNights: durationNights ?? this.durationNights,
      inclusions: inclusions ?? this.inclusions,
      exclusions: exclusions ?? this.exclusions,
      price: price ?? this.price,
      discountPrice: discountPrice ?? this.discountPrice,
      images: images ?? this.images,
      isActive: isActive ?? this.isActive,
      maxGroupSize: maxGroupSize ?? this.maxGroupSize,
      category: category ?? this.category,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        description,
        destination,
        durationDays,
        durationNights,
        inclusions,
        exclusions,
        price,
        discountPrice,
        images,
        isActive,
        maxGroupSize,
        category,
        createdAt,
        updatedAt,
      ];
}
