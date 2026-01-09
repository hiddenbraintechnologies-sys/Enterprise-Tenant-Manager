import 'package:equatable/equatable.dart';

enum PropertyType { apartment, house, villa, commercial, land }

enum PropertyPurpose { sale, rent }

enum PropertyStatus { available, sold, rented }

class Property extends Equatable {
  final String id;
  final String tenantId;
  final String title;
  final PropertyType type;
  final PropertyPurpose purpose;
  final String location;
  final String address;
  final double price;
  final double area;
  final int? bedrooms;
  final int? bathrooms;
  final List<String> amenities;
  final List<String> images;
  final String? description;
  final PropertyStatus status;
  final String? ownerId;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Property({
    required this.id,
    required this.tenantId,
    required this.title,
    required this.type,
    required this.purpose,
    required this.location,
    required this.address,
    required this.price,
    required this.area,
    this.bedrooms,
    this.bathrooms,
    this.amenities = const [],
    this.images = const [],
    this.description,
    required this.status,
    this.ownerId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Property.fromJson(Map<String, dynamic> json) {
    return Property(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      title: json['title'] as String,
      type: PropertyType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => PropertyType.apartment,
      ),
      purpose: PropertyPurpose.values.firstWhere(
        (e) => e.name == json['purpose'],
        orElse: () => PropertyPurpose.sale,
      ),
      location: json['location'] as String,
      address: json['address'] as String,
      price: _parseDouble(json['price']),
      area: _parseDouble(json['area']),
      bedrooms: json['bedrooms'] as int?,
      bathrooms: json['bathrooms'] as int?,
      amenities: (json['amenities'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      images: (json['images'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      description: json['description'] as String?,
      status: PropertyStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => PropertyStatus.available,
      ),
      ownerId: json['ownerId'] as String?,
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
      'title': title,
      'type': type.name,
      'purpose': purpose.name,
      'location': location,
      'address': address,
      'price': price,
      'area': area,
      'bedrooms': bedrooms,
      'bathrooms': bathrooms,
      'amenities': amenities,
      'images': images,
      'description': description,
      'status': status.name,
      'ownerId': ownerId,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Property copyWith({
    String? id,
    String? tenantId,
    String? title,
    PropertyType? type,
    PropertyPurpose? purpose,
    String? location,
    String? address,
    double? price,
    double? area,
    int? bedrooms,
    int? bathrooms,
    List<String>? amenities,
    List<String>? images,
    String? description,
    PropertyStatus? status,
    String? ownerId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Property(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      title: title ?? this.title,
      type: type ?? this.type,
      purpose: purpose ?? this.purpose,
      location: location ?? this.location,
      address: address ?? this.address,
      price: price ?? this.price,
      area: area ?? this.area,
      bedrooms: bedrooms ?? this.bedrooms,
      bathrooms: bathrooms ?? this.bathrooms,
      amenities: amenities ?? this.amenities,
      images: images ?? this.images,
      description: description ?? this.description,
      status: status ?? this.status,
      ownerId: ownerId ?? this.ownerId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        title,
        type,
        purpose,
        location,
        address,
        price,
        area,
        bedrooms,
        bathrooms,
        amenities,
        images,
        description,
        status,
        ownerId,
        createdAt,
        updatedAt,
      ];
}
