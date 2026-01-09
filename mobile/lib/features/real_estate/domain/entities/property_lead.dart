import 'package:equatable/equatable.dart';

enum LeadStatus {
  newLead,
  contacted,
  interested,
  siteVisitScheduled,
  negotiating,
  converted,
  lost,
}

enum LeadSource {
  website,
  referral,
  advertisement,
  walkIn,
  socialMedia,
  other,
}

class PropertyLead extends Equatable {
  final String id;
  final String tenantId;
  final String? propertyId;
  final String name;
  final String phone;
  final String? email;
  final LeadSource source;
  final LeadStatus status;
  final String? notes;
  final String? assignedTo;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PropertyLead({
    required this.id,
    required this.tenantId,
    this.propertyId,
    required this.name,
    required this.phone,
    this.email,
    required this.source,
    required this.status,
    this.notes,
    this.assignedTo,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PropertyLead.fromJson(Map<String, dynamic> json) {
    return PropertyLead(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      propertyId: json['propertyId'] as String?,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      source: _parseSource(json['source']),
      status: _parseStatus(json['status']),
      notes: json['notes'] as String?,
      assignedTo: json['assignedTo'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static LeadSource _parseSource(dynamic value) {
    if (value == null) return LeadSource.other;
    final str = value.toString().toLowerCase().replaceAll('_', '');
    for (final source in LeadSource.values) {
      if (source.name.toLowerCase() == str) return source;
    }
    return LeadSource.other;
  }

  static LeadStatus _parseStatus(dynamic value) {
    if (value == null) return LeadStatus.newLead;
    final str = value.toString().toLowerCase().replaceAll('_', '');
    if (str == 'new') return LeadStatus.newLead;
    if (str == 'sitevisitscheduled' || str == 'site_visit_scheduled') {
      return LeadStatus.siteVisitScheduled;
    }
    for (final status in LeadStatus.values) {
      if (status.name.toLowerCase() == str) return status;
    }
    return LeadStatus.newLead;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'propertyId': propertyId,
      'name': name,
      'phone': phone,
      'email': email,
      'source': source.name,
      'status': _statusToJson(status),
      'notes': notes,
      'assignedTo': assignedTo,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  static String _statusToJson(LeadStatus status) {
    switch (status) {
      case LeadStatus.newLead:
        return 'new';
      case LeadStatus.siteVisitScheduled:
        return 'site_visit_scheduled';
      default:
        return status.name;
    }
  }

  PropertyLead copyWith({
    String? id,
    String? tenantId,
    String? propertyId,
    String? name,
    String? phone,
    String? email,
    LeadSource? source,
    LeadStatus? status,
    String? notes,
    String? assignedTo,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PropertyLead(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      propertyId: propertyId ?? this.propertyId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      source: source ?? this.source,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      assignedTo: assignedTo ?? this.assignedTo,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        propertyId,
        name,
        phone,
        email,
        source,
        status,
        notes,
        assignedTo,
        createdAt,
        updatedAt,
      ];
}
