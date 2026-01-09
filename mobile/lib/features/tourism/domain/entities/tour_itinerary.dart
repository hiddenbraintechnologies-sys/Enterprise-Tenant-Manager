import 'package:equatable/equatable.dart';

class TourItinerary extends Equatable {
  final String id;
  final String tenantId;
  final String packageId;
  final int dayNumber;
  final String title;
  final String? description;
  final List<String> activities;
  final List<String> meals;
  final String? accommodation;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TourItinerary({
    required this.id,
    required this.tenantId,
    required this.packageId,
    required this.dayNumber,
    required this.title,
    this.description,
    this.activities = const [],
    this.meals = const [],
    this.accommodation,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TourItinerary.fromJson(Map<String, dynamic> json) {
    return TourItinerary(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      packageId: json['packageId'] as String,
      dayNumber: json['dayNumber'] as int? ?? 1,
      title: json['title'] as String,
      description: json['description'] as String?,
      activities: json['activities'] != null
          ? List<String>.from(json['activities'])
          : [],
      meals: json['meals'] != null ? List<String>.from(json['meals']) : [],
      accommodation: json['accommodation'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'packageId': packageId,
      'dayNumber': dayNumber,
      'title': title,
      'description': description,
      'activities': activities,
      'meals': meals,
      'accommodation': accommodation,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  TourItinerary copyWith({
    String? id,
    String? tenantId,
    String? packageId,
    int? dayNumber,
    String? title,
    String? description,
    List<String>? activities,
    List<String>? meals,
    String? accommodation,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return TourItinerary(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      packageId: packageId ?? this.packageId,
      dayNumber: dayNumber ?? this.dayNumber,
      title: title ?? this.title,
      description: description ?? this.description,
      activities: activities ?? this.activities,
      meals: meals ?? this.meals,
      accommodation: accommodation ?? this.accommodation,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        packageId,
        dayNumber,
        title,
        description,
        activities,
        meals,
        accommodation,
        createdAt,
        updatedAt,
      ];
}
