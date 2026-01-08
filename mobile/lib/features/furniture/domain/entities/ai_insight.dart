class AiInsight {
  final String id;
  final String tenantId;
  final String category;
  final String severity;
  final String title;
  final String description;
  final String? metricValue;
  final String? metricUnit;
  final DateTime? periodStart;
  final DateTime? periodEnd;
  final bool isRead;
  final bool isDismissed;
  final DateTime createdAt;

  AiInsight({
    required this.id,
    required this.tenantId,
    required this.category,
    required this.severity,
    required this.title,
    required this.description,
    this.metricValue,
    this.metricUnit,
    this.periodStart,
    this.periodEnd,
    required this.isRead,
    required this.isDismissed,
    required this.createdAt,
  });

  factory AiInsight.fromJson(Map<String, dynamic> json) {
    return AiInsight(
      id: json['id'] ?? '',
      tenantId: json['tenantId'] ?? '',
      category: json['category'] ?? 'info',
      severity: json['severity'] ?? 'info',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      metricValue: json['metricValue'],
      metricUnit: json['metricUnit'],
      periodStart: json['periodStart'] != null 
          ? DateTime.tryParse(json['periodStart'])
          : null,
      periodEnd: json['periodEnd'] != null 
          ? DateTime.tryParse(json['periodEnd'])
          : null,
      isRead: json['isRead'] ?? false,
      isDismissed: json['isDismissed'] ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }

  bool get isCritical => severity == 'critical';
  bool get isWarning => severity == 'warning';
  bool get isInfo => severity == 'info';
}
