import 'package:equatable/equatable.dart';

class PropertyOwner extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String phone;
  final String? email;
  final String? address;
  final List<String> propertyIds;
  final int propertyCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PropertyOwner({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.phone,
    this.email,
    this.address,
    this.propertyIds = const [],
    this.propertyCount = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PropertyOwner.fromJson(Map<String, dynamic> json) {
    return PropertyOwner(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      address: json['address'] as String?,
      propertyIds: (json['propertyIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      propertyCount: json['propertyCount'] as int? ?? 0,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'name': name,
      'phone': phone,
      'email': email,
      'address': address,
      'propertyIds': propertyIds,
      'propertyCount': propertyCount,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  PropertyOwner copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? phone,
    String? email,
    String? address,
    List<String>? propertyIds,
    int? propertyCount,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PropertyOwner(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      address: address ?? this.address,
      propertyIds: propertyIds ?? this.propertyIds,
      propertyCount: propertyCount ?? this.propertyCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        phone,
        email,
        address,
        propertyIds,
        propertyCount,
        createdAt,
        updatedAt,
      ];
}
