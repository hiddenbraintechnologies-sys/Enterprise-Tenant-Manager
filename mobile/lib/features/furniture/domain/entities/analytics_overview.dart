class ProductionMetrics {
  final int total;
  final int completed;
  final int inProgress;
  final double avgProductionTimeHours;
  final double wastagePercentage;

  ProductionMetrics({
    required this.total,
    required this.completed,
    required this.inProgress,
    required this.avgProductionTimeHours,
    required this.wastagePercentage,
  });

  factory ProductionMetrics.fromJson(Map<String, dynamic> json) {
    return ProductionMetrics(
      total: json['total'] ?? 0,
      completed: json['completed'] ?? 0,
      inProgress: json['inProgress'] ?? 0,
      avgProductionTimeHours: (json['avgProductionTimeHours'] ?? 0).toDouble(),
      wastagePercentage: (json['wastagePercentage'] ?? 0).toDouble(),
    );
  }
}

class SalesMetrics {
  final int totalOrders;
  final int completedOrders;
  final double totalRevenue;
  final double revenueUsd;
  final double conversionRate;

  SalesMetrics({
    required this.totalOrders,
    required this.completedOrders,
    required this.totalRevenue,
    required this.revenueUsd,
    required this.conversionRate,
  });

  factory SalesMetrics.fromJson(Map<String, dynamic> json) {
    return SalesMetrics(
      totalOrders: json['totalOrders'] ?? 0,
      completedOrders: json['completedOrders'] ?? 0,
      totalRevenue: (json['totalRevenue'] ?? 0).toDouble(),
      revenueUsd: (json['revenueUsd'] ?? 0).toDouble(),
      conversionRate: (json['conversionRate'] ?? 0).toDouble(),
    );
  }
}

class PaymentMetrics {
  final int totalInvoices;
  final int paidInvoices;
  final int overdueInvoices;
  final int partiallyPaidInvoices;
  final double totalReceivables;
  final double totalReceivablesUsd;
  final double avgPaymentDelayDays;
  final double paymentsReceived;

  PaymentMetrics({
    required this.totalInvoices,
    required this.paidInvoices,
    required this.overdueInvoices,
    required this.partiallyPaidInvoices,
    required this.totalReceivables,
    required this.totalReceivablesUsd,
    required this.avgPaymentDelayDays,
    required this.paymentsReceived,
  });

  factory PaymentMetrics.fromJson(Map<String, dynamic> json) {
    return PaymentMetrics(
      totalInvoices: json['totalInvoices'] ?? 0,
      paidInvoices: json['paidInvoices'] ?? 0,
      overdueInvoices: json['overdueInvoices'] ?? 0,
      partiallyPaidInvoices: json['partiallyPaidInvoices'] ?? 0,
      totalReceivables: (json['totalReceivables'] ?? 0).toDouble(),
      totalReceivablesUsd: (json['totalReceivablesUsd'] ?? 0).toDouble(),
      avgPaymentDelayDays: (json['avgPaymentDelayDays'] ?? 0).toDouble(),
      paymentsReceived: (json['paymentsReceived'] ?? 0).toDouble(),
    );
  }
}

class OperationsMetrics {
  final int totalDeliveries;
  final int onTimeDeliveries;
  final int lateDeliveries;
  final double deliveryOnTimeRate;
  final int totalInstallations;
  final int completedInstallations;
  final double installationCompletionRate;
  final double avgInstallationRating;

  OperationsMetrics({
    required this.totalDeliveries,
    required this.onTimeDeliveries,
    required this.lateDeliveries,
    required this.deliveryOnTimeRate,
    required this.totalInstallations,
    required this.completedInstallations,
    required this.installationCompletionRate,
    required this.avgInstallationRating,
  });

  factory OperationsMetrics.fromJson(Map<String, dynamic> json) {
    return OperationsMetrics(
      totalDeliveries: json['totalDeliveries'] ?? 0,
      onTimeDeliveries: json['onTimeDeliveries'] ?? 0,
      lateDeliveries: json['lateDeliveries'] ?? 0,
      deliveryOnTimeRate: (json['deliveryOnTimeRate'] ?? 0).toDouble(),
      totalInstallations: json['totalInstallations'] ?? 0,
      completedInstallations: json['completedInstallations'] ?? 0,
      installationCompletionRate: (json['installationCompletionRate'] ?? 0).toDouble(),
      avgInstallationRating: (json['avgInstallationRating'] ?? 0).toDouble(),
    );
  }
}

class AnalyticsOverview {
  final DateTime startDate;
  final DateTime endDate;
  final ProductionMetrics production;
  final SalesMetrics sales;
  final PaymentMetrics payments;
  final OperationsMetrics operations;

  AnalyticsOverview({
    required this.startDate,
    required this.endDate,
    required this.production,
    required this.sales,
    required this.payments,
    required this.operations,
  });

  factory AnalyticsOverview.fromJson(Map<String, dynamic> json) {
    final dateRange = json['dateRange'] ?? {};
    return AnalyticsOverview(
      startDate: DateTime.tryParse(dateRange['startDate'] ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(dateRange['endDate'] ?? '') ?? DateTime.now(),
      production: ProductionMetrics.fromJson(json['production'] ?? {}),
      sales: SalesMetrics.fromJson(json['sales'] ?? {}),
      payments: PaymentMetrics.fromJson(json['payments'] ?? {}),
      operations: OperationsMetrics.fromJson(json['operations'] ?? {}),
    );
  }
}
