import 'package:equatable/equatable.dart';

enum VisitStatus { scheduled, completed, cancelled, noShow }

class PropertyVisit extends Equatable {
  final String id;
  final String tenantId;
  final String propertyId;
  final String leadId;
  final DateTime scheduledAt;
  final VisitStatus status;
  final String? feedback;
  final String? agentId;
  final String? propertyTitle;
  final String? leadName;
  final String? agentName;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PropertyVisit({
    required this.id,
    required this.tenantId,
    required this.propertyId,
    required this.leadId,
    required this.scheduledAt,
    required this.status,
    this.feedback,
    this.agentId,
    this.propertyTitle,
    this.leadName,
    this.agentName,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PropertyVisit.fromJson(Map<String, dynamic> json) {
    return PropertyVisit(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      propertyId: json['propertyId'] as String,
      leadId: json['leadId'] as String,
      scheduledAt: DateTime.parse(json['scheduledAt'] as String),
      status: _parseStatus(json['status']),
      feedback: json['feedback'] as String?,
      agentId: json['agentId'] as String?,
      propertyTitle: json['propertyTitle'] as String?,
      leadName: json['leadName'] as String?,
      agentName: json['agentName'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static VisitStatus _parseStatus(dynamic value) {
    if (value == null) return VisitStatus.scheduled;
    final str = value.toString().toLowerCase().replaceAll('_', '');
    if (str == 'noshow' || str == 'no_show') return VisitStatus.noShow;
    for (final status in VisitStatus.values) {
      if (status.name.toLowerCase() == str) return status;
    }
    return VisitStatus.scheduled;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'propertyId': propertyId,
      'leadId': leadId,
      'scheduledAt': scheduledAt.toIso8601String(),
      'status': status == VisitStatus.noShow ? 'no_show' : status.name,
      'feedback': feedback,
      'agentId': agentId,
      'propertyTitle': propertyTitle,
      'leadName': leadName,
      'agentName': agentName,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  PropertyVisit copyWith({
    String? id,
    String? tenantId,
    String? propertyId,
    String? leadId,
    DateTime? scheduledAt,
    VisitStatus? status,
    String? feedback,
    String? agentId,
    String? propertyTitle,
    String? leadName,
    String? agentName,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PropertyVisit(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      propertyId: propertyId ?? this.propertyId,
      leadId: leadId ?? this.leadId,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      status: status ?? this.status,
      feedback: feedback ?? this.feedback,
      agentId: agentId ?? this.agentId,
      propertyTitle: propertyTitle ?? this.propertyTitle,
      leadName: leadName ?? this.leadName,
      agentName: agentName ?? this.agentName,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        propertyId,
        leadId,
        scheduledAt,
        status,
        feedback,
        agentId,
        propertyTitle,
        leadName,
        agentName,
        createdAt,
        updatedAt,
      ];
}
