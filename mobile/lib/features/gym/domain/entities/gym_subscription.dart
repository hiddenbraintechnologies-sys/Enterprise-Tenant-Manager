import 'package:equatable/equatable.dart';

class GymSubscription extends Equatable {
  final String id;
  final String tenantId;
  final String name;
  final int duration;
  final String durationUnit;
  final double price;
  final List<String> features;
  final bool isActive;
  final String? description;
  final int? maxMembers;
  final DateTime createdAt;
  final DateTime updatedAt;

  const GymSubscription({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.duration,
    this.durationUnit = 'months',
    required this.price,
    this.features = const [],
    required this.isActive,
    this.description,
    this.maxMembers,
    required this.createdAt,
    required this.updatedAt,
  });

  factory GymSubscription.fromJson(Map<String, dynamic> json) {
    return GymSubscription(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      name: json['name'] as String,
      duration: json['duration'] as int,
      durationUnit: json['durationUnit'] as String? ?? 'months',
      price: _parseDouble(json['price']),
      features: (json['features'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      isActive: json['isActive'] as bool? ?? true,
      description: json['description'] as String?,
      maxMembers: json['maxMembers'] as int?,
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
      'duration': duration,
      'durationUnit': durationUnit,
      'price': price,
      'features': features,
      'isActive': isActive,
      'description': description,
      'maxMembers': maxMembers,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  String get formattedDuration => '$duration $durationUnit';

  GymSubscription copyWith({
    String? id,
    String? tenantId,
    String? name,
    int? duration,
    String? durationUnit,
    double? price,
    List<String>? features,
    bool? isActive,
    String? description,
    int? maxMembers,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return GymSubscription(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      name: name ?? this.name,
      duration: duration ?? this.duration,
      durationUnit: durationUnit ?? this.durationUnit,
      price: price ?? this.price,
      features: features ?? this.features,
      isActive: isActive ?? this.isActive,
      description: description ?? this.description,
      maxMembers: maxMembers ?? this.maxMembers,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        name,
        duration,
        durationUnit,
        price,
        features,
        isActive,
        description,
        maxMembers,
        createdAt,
        updatedAt,
      ];
}
