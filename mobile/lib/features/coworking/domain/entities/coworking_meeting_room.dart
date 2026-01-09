import 'package:equatable/equatable.dart';

class CoworkingMeetingRoom extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final int capacity;
  final List<String> amenities;
  final double pricePerHour;
  final bool isAvailable;
  final String? floor;
  final String? description;
  final String? imageUrl;
  final DateTime createdAt;
  final DateTime updatedAt;

  const CoworkingMeetingRoom({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.capacity,
    required this.amenities,
    required this.pricePerHour,
    required this.isAvailable,
    this.floor,
    this.description,
    this.imageUrl,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CoworkingMeetingRoom.fromJson(Map<String, dynamic> json) {
    return CoworkingMeetingRoom(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      capacity: json['capacity'] as int? ?? 0,
      amenities: (json['amenities'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      pricePerHour: _parseDouble(json['pricePerHour']),
      isAvailable: json['isAvailable'] as bool? ?? true,
      floor: json['floor'] as String?,
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
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
      'capacity': capacity,
      'amenities': amenities,
      'pricePerHour': pricePerHour,
      'isAvailable': isAvailable,
      'floor': floor,
      'description': description,
      'imageUrl': imageUrl,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  CoworkingMeetingRoom copyWith({
    String? id,
    String? tenantId,
    String? name,
    int? capacity,
    List<String>? amenities,
    double? pricePerHour,
    bool? isAvailable,
    String? floor,
    String? description,
    String? imageUrl,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CoworkingMeetingRoom(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      capacity: capacity ?? this.capacity,
      amenities: amenities ?? this.amenities,
      pricePerHour: pricePerHour ?? this.pricePerHour,
      isAvailable: isAvailable ?? this.isAvailable,
      floor: floor ?? this.floor,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        capacity,
        amenities,
        pricePerHour,
        isAvailable,
        floor,
        description,
        imageUrl,
        createdAt,
        updatedAt,
      ];
}
