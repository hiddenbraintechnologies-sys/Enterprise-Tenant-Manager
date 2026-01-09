import 'package:equatable/equatable.dart';

enum MaintenancePriority { low, medium, high, urgent }

enum MaintenanceStatus { pending, inProgress, completed, cancelled }

class PgMaintenance extends Equatable {
  final String id;
  final String tenantId;
  final String roomId;
  final String? roomNumber;
  final String? residentId;
  final String? residentName;
  final String description;
  final String? category;
  final MaintenancePriority priority;
  final MaintenanceStatus status;
  final String? assignedTo;
  final double? estimatedCost;
  final double? actualCost;
  final String? notes;
  final DateTime createdAt;
  final DateTime? completedAt;
  final DateTime updatedAt;

  const PgMaintenance({
    required this.id,
    required this.tenantId,
    required this.roomId,
    this.roomNumber,
    this.residentId,
    this.residentName,
    required this.description,
    this.category,
    required this.priority,
    required this.status,
    this.assignedTo,
    this.estimatedCost,
    this.actualCost,
    this.notes,
    required this.createdAt,
    this.completedAt,
    required this.updatedAt,
  });

  factory PgMaintenance.fromJson(Map<String, dynamic> json) {
    return PgMaintenance(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      roomId: json['roomId'] as String,
      roomNumber: json['roomNumber'] as String?,
      residentId: json['residentId'] as String?,
      residentName: json['residentName'] as String?,
      description: json['description'] as String,
      category: json['category'] as String?,
      priority: _parsePriority(json['priority'] as String),
      status: _parseStatus(json['status'] as String),
      assignedTo: json['assignedTo'] as String?,
      estimatedCost: _parseDouble(json['estimatedCost']),
      actualCost: _parseDouble(json['actualCost']),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'] as String)
          : null,
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  static MaintenancePriority _parsePriority(String priority) {
    switch (priority.toLowerCase()) {
      case 'low':
        return MaintenancePriority.low;
      case 'medium':
        return MaintenancePriority.medium;
      case 'high':
        return MaintenancePriority.high;
      case 'urgent':
        return MaintenancePriority.urgent;
      default:
        return MaintenancePriority.medium;
    }
  }

  static MaintenanceStatus _parseStatus(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return MaintenanceStatus.pending;
      case 'in_progress':
      case 'inprogress':
        return MaintenanceStatus.inProgress;
      case 'completed':
        return MaintenanceStatus.completed;
      case 'cancelled':
        return MaintenanceStatus.cancelled;
      default:
        return MaintenanceStatus.pending;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'roomId': roomId,
      'roomNumber': roomNumber,
      'residentId': residentId,
      'residentName': residentName,
      'description': description,
      'category': category,
      'priority': priority.name,
      'status': status.name,
      'assignedTo': assignedTo,
      'estimatedCost': estimatedCost,
      'actualCost': actualCost,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  PgMaintenance copyWith({
    String? id,
    String? tenantId,
    String? roomId,
    String? roomNumber,
    String? residentId,
    String? residentName,
    String? description,
    String? category,
    MaintenancePriority? priority,
    MaintenanceStatus? status,
    String? assignedTo,
    double? estimatedCost,
    double? actualCost,
    String? notes,
    DateTime? createdAt,
    DateTime? completedAt,
    DateTime? updatedAt,
  }) {
    return PgMaintenance(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      roomId: roomId ?? this.roomId,
      roomNumber: roomNumber ?? this.roomNumber,
      residentId: residentId ?? this.residentId,
      residentName: residentName ?? this.residentName,
      description: description ?? this.description,
      category: category ?? this.category,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      assignedTo: assignedTo ?? this.assignedTo,
      estimatedCost: estimatedCost ?? this.estimatedCost,
      actualCost: actualCost ?? this.actualCost,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      completedAt: completedAt ?? this.completedAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        roomId,
        roomNumber,
        residentId,
        residentName,
        description,
        category,
        priority,
        status,
        assignedTo,
        estimatedCost,
        actualCost,
        notes,
        createdAt,
        completedAt,
        updatedAt,
      ];
}
