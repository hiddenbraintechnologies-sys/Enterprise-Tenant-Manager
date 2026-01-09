import 'package:equatable/equatable.dart';

class SalonService extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final int duration;
  final double price;
  final String category;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const SalonService({
    required this.id,
    required this.tenantId,
    required this.name,
    this.description,
    required this.duration,
    required this.price,
    required this.category,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SalonService.fromJson(Map<String, dynamic> json) {
    return SalonService(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      duration: json['duration'] as int? ?? json['durationMinutes'] as int? ?? 30,
      price: _parseDouble(json['price']),
      category: json['category'] as String? ?? 'general',
      isActive: json['isActive'] as bool? ?? json['status'] == 'active',
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.now(),
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
      'duration': duration,
      'price': price,
      'category': category,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  SalonService copyWith({
    String? id,
    String? tenantId,
    String? name,
    String? description,
    int? duration,
    double? price,
    String? category,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return SalonService(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      description: description ?? this.description,
      duration: duration ?? this.duration,
      price: price ?? this.price,
      category: category ?? this.category,
      isActive: isActive ?? this.isActive,
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
        duration,
        price,
        category,
        isActive,
        createdAt,
        updatedAt,
      ];
}
