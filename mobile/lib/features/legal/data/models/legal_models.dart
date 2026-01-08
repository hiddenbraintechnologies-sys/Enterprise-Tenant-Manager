/// Legal Services Module Models
///
/// Data models for the Legal Services module matching backend API.
library legal_models;

class LegalClient {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? companyName;
  final String clientType;
  final String status;
  final String? notes;

  LegalClient({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.companyName,
    required this.clientType,
    required this.status,
    this.notes,
  });

  factory LegalClient.fromJson(Map<String, dynamic> json) {
    return LegalClient(
      id: json['id'],
      tenantId: json['tenantId'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      email: json['email'],
      phone: json['phone'],
      companyName: json['companyName'],
      clientType: json['clientType'] ?? 'individual',
      status: json['status'] ?? 'active',
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() => {
    'firstName': firstName,
    'lastName': lastName,
    'email': email,
    'phone': phone,
    'companyName': companyName,
    'clientType': clientType,
    'status': status,
    'notes': notes,
  };

  String get fullName => '$firstName $lastName';
}

class LegalCase {
  final String id;
  final String tenantId;
  final String caseNumber;
  final String title;
  final String? description;
  final String clientId;
  final String? clientName;
  final String caseType;
  final String status;
  final String priority;
  final String? courtName;
  final DateTime? nextHearingDate;
  final DateTime createdAt;

  LegalCase({
    required this.id,
    required this.tenantId,
    required this.caseNumber,
    required this.title,
    this.description,
    required this.clientId,
    this.clientName,
    required this.caseType,
    required this.status,
    required this.priority,
    this.courtName,
    this.nextHearingDate,
    required this.createdAt,
  });

  factory LegalCase.fromJson(Map<String, dynamic> json) {
    return LegalCase(
      id: json['id'],
      tenantId: json['tenantId'],
      caseNumber: json['caseNumber'],
      title: json['title'],
      description: json['description'],
      clientId: json['clientId'],
      clientName: json['clientName'],
      caseType: json['caseType'] ?? 'civil',
      status: json['status'] ?? 'open',
      priority: json['priority'] ?? 'medium',
      courtName: json['courtName'],
      nextHearingDate: json['nextHearingDate'] != null ? DateTime.parse(json['nextHearingDate']) : null,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    'clientId': clientId,
    'caseType': caseType,
    'status': status,
    'priority': priority,
    'courtName': courtName,
    'nextHearingDate': nextHearingDate?.toIso8601String(),
  };
}

class LegalDashboardStats {
  final int totalCases;
  final int activeCases;
  final int closedCases;
  final int totalClients;
  final int pendingAppointments;
  final int upcomingHearings;

  LegalDashboardStats({
    required this.totalCases,
    required this.activeCases,
    required this.closedCases,
    required this.totalClients,
    required this.pendingAppointments,
    required this.upcomingHearings,
  });

  factory LegalDashboardStats.fromJson(Map<String, dynamic> json) {
    return LegalDashboardStats(
      totalCases: json['totalCases'] ?? 0,
      activeCases: json['activeCases'] ?? 0,
      closedCases: json['closedCases'] ?? 0,
      totalClients: json['totalClients'] ?? 0,
      pendingAppointments: json['pendingAppointments'] ?? 0,
      upcomingHearings: json['upcomingHearings'] ?? 0,
    );
  }
}

class PaginatedResponse<T> {
  final List<T> data;
  final PaginationInfo pagination;

  PaginatedResponse({required this.data, required this.pagination});
}

class PaginationInfo {
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  PaginationInfo({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  factory PaginationInfo.fromJson(Map<String, dynamic> json) {
    return PaginationInfo(
      page: json['page'] ?? 1,
      limit: json['limit'] ?? 20,
      total: json['total'] ?? 0,
      totalPages: json['totalPages'] ?? 0,
    );
  }
}
