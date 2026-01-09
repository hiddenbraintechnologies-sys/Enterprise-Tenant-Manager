import 'package:equatable/equatable.dart';

enum SubscriptionTier { free, starter, pro, enterprise }

enum ModuleStatus { included, addon, unavailable }

class Subscription extends Equatable {
  final String id;
  final String tenantId;
  final SubscriptionTier tier;
  final DateTime startDate;
  final DateTime? endDate;
  final bool isActive;
  final bool isTrial;
  final int? trialDaysRemaining;
  final PricingDetails pricing;
  final List<SubscriptionModule> modules;

  const Subscription({
    required this.id,
    required this.tenantId,
    required this.tier,
    required this.startDate,
    this.endDate,
    required this.isActive,
    this.isTrial = false,
    this.trialDaysRemaining,
    required this.pricing,
    required this.modules,
  });

  @override
  List<Object?> get props => [id, tenantId, tier, startDate, endDate, isActive];

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      tier: SubscriptionTier.values.firstWhere(
        (e) => e.name == json['tier'],
        orElse: () => SubscriptionTier.free,
      ),
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: json['endDate'] != null ? DateTime.parse(json['endDate'] as String) : null,
      isActive: json['isActive'] as bool? ?? true,
      isTrial: json['isTrial'] as bool? ?? false,
      trialDaysRemaining: json['trialDaysRemaining'] as int?,
      pricing: PricingDetails.fromJson(json['pricing'] as Map<String, dynamic>? ?? {}),
      modules: (json['modules'] as List<dynamic>?)
              ?.map((m) => SubscriptionModule.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'tenantId': tenantId,
        'tier': tier.name,
        'startDate': startDate.toIso8601String(),
        'endDate': endDate?.toIso8601String(),
        'isActive': isActive,
        'isTrial': isTrial,
        'trialDaysRemaining': trialDaysRemaining,
        'pricing': pricing.toJson(),
        'modules': modules.map((m) => m.toJson()).toList(),
      };
}

class PricingDetails extends Equatable {
  final double basePrice;
  final double finalPrice;
  final String currency;
  final String currencySymbol;
  final double? taxAmount;
  final double? taxRate;
  final String? billingCycle;

  const PricingDetails({
    required this.basePrice,
    required this.finalPrice,
    required this.currency,
    required this.currencySymbol,
    this.taxAmount,
    this.taxRate,
    this.billingCycle,
  });

  @override
  List<Object?> get props => [basePrice, finalPrice, currency];

  factory PricingDetails.fromJson(Map<String, dynamic> json) {
    return PricingDetails(
      basePrice: (json['basePrice'] as num?)?.toDouble() ?? 0,
      finalPrice: (json['finalPrice'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'USD',
      currencySymbol: json['currencySymbol'] as String? ?? '\$',
      taxAmount: (json['taxAmount'] as num?)?.toDouble(),
      taxRate: (json['taxRate'] as num?)?.toDouble(),
      billingCycle: json['billingCycle'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'basePrice': basePrice,
        'finalPrice': finalPrice,
        'currency': currency,
        'currencySymbol': currencySymbol,
        'taxAmount': taxAmount,
        'taxRate': taxRate,
        'billingCycle': billingCycle,
      };
}

class SubscriptionModule extends Equatable {
  final String id;
  final String name;
  final String description;
  final String icon;
  final ModuleStatus status;
  final List<String> features;

  const SubscriptionModule({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.status,
    required this.features,
  });

  @override
  List<Object?> get props => [id, name, status];

  factory SubscriptionModule.fromJson(Map<String, dynamic> json) {
    return SubscriptionModule(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      icon: json['icon'] as String? ?? 'apps',
      status: ModuleStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => ModuleStatus.unavailable,
      ),
      features: (json['features'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'icon': icon,
        'status': status.name,
        'features': features,
      };
}

class SubscriptionPlan extends Equatable {
  final String id;
  final SubscriptionTier tier;
  final String name;
  final String description;
  final List<String> features;
  final PricingDetails pricing;
  final List<SubscriptionModule> modules;
  final bool isPopular;
  final bool isRecommended;

  const SubscriptionPlan({
    required this.id,
    required this.tier,
    required this.name,
    required this.description,
    required this.features,
    required this.pricing,
    required this.modules,
    this.isPopular = false,
    this.isRecommended = false,
  });

  @override
  List<Object?> get props => [id, tier, name];

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlan(
      id: json['id'] as String,
      tier: SubscriptionTier.values.firstWhere(
        (e) => e.name == json['tier'],
        orElse: () => SubscriptionTier.free,
      ),
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      features: (json['features'] as List<dynamic>?)?.cast<String>() ?? [],
      pricing: PricingDetails.fromJson(json['pricing'] as Map<String, dynamic>? ?? {}),
      modules: (json['modules'] as List<dynamic>?)
              ?.map((m) => SubscriptionModule.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
      isPopular: json['isPopular'] as bool? ?? false,
      isRecommended: json['isRecommended'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'tier': tier.name,
        'name': name,
        'description': description,
        'features': features,
        'pricing': pricing.toJson(),
        'modules': modules.map((m) => m.toJson()).toList(),
        'isPopular': isPopular,
        'isRecommended': isRecommended,
      };
}
