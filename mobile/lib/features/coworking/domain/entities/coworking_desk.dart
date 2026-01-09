import 'package:equatable/equatable.dart';

class CoworkingDesk extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String type;
  final String? floor;
  final List<String> amenities;
  final double pricePerDay;
  final double pricePerMonth;
  final bool isAvailable;
  final String? description;
  final DateTime createdAt;
  final DateTime updatedAt;

  const CoworkingDesk({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.type,
    this.floor,
    required this.amenities,
    required this.pricePerDay,
    required this.pricePerMonth,
    required this.isAvailable,
    this.description,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CoworkingDesk.fromJson(Map<String, dynamic> json) {
    return CoworkingDesk(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      floor: json['floor'] as String?,
      amenities: (json['amenities'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      pricePerDay: _parseDouble(json['pricePerDay']),
      pricePerMonth: _parseDouble(json['pricePerMonth']),
      isAvailable: json['isAvailable'] as bool? ?? true,
      description: json['description'] as String?,
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
      'type': type,
      'floor': floor,
      'amenities': amenities,
      'pricePerDay': pricePerDay,
      'pricePerMonth': pricePerMonth,
      'isAvailable': isAvailable,
      'description': description,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  CoworkingDesk copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? type,
    String? floor,
    List<String>? amenities,
    double? pricePerDay,
    double? pricePerMonth,
    bool? isAvailable,
    String? description,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CoworkingDesk(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      type: type ?? this.type,
      floor: floor ?? this.floor,
      amenities: amenities ?? this.amenities,
      pricePerDay: pricePerDay ?? this.pricePerDay,
      pricePerMonth: pricePerMonth ?? this.pricePerMonth,
      isAvailable: isAvailable ?? this.isAvailable,
      description: description ?? this.description,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        type,
        floor,
        amenities,
        pricePerDay,
        pricePerMonth,
        isAvailable,
        description,
        createdAt,
        updatedAt,
      ];
}
