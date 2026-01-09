part of 'dashboard_bloc.dart';

class DashboardState extends Equatable {
  final bool isLoading;
  final String? error;
  final String? errorCode;
  final String? tenantId;
  final String? tenantName;
  final SubscriptionTier subscriptionTier;
  final List<DashboardModule> enabledModules;
  final List<DashboardModule> addonModules;
  final List<NavigationItem> navigationItems;
  final String? selectedModuleId;
  final String? moduleAccessError;

  const DashboardState({
    this.isLoading = false,
    this.error,
    this.errorCode,
    this.tenantId,
    this.tenantName,
    this.subscriptionTier = SubscriptionTier.free,
    this.enabledModules = const [],
    this.addonModules = const [],
    this.navigationItems = const [],
    this.selectedModuleId,
    this.moduleAccessError,
  });

  DashboardState copyWith({
    bool? isLoading,
    String? error,
    String? errorCode,
    String? tenantId,
    String? tenantName,
    SubscriptionTier? subscriptionTier,
    List<DashboardModule>? enabledModules,
    List<DashboardModule>? addonModules,
    List<NavigationItem>? navigationItems,
    String? selectedModuleId,
    String? moduleAccessError,
  }) {
    return DashboardState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      errorCode: errorCode,
      tenantId: tenantId ?? this.tenantId,
      tenantName: tenantName ?? this.tenantName,
      subscriptionTier: subscriptionTier ?? this.subscriptionTier,
      enabledModules: enabledModules ?? this.enabledModules,
      addonModules: addonModules ?? this.addonModules,
      navigationItems: navigationItems ?? this.navigationItems,
      selectedModuleId: selectedModuleId ?? this.selectedModuleId,
      moduleAccessError: moduleAccessError,
    );
  }

  DashboardModule? get selectedModule {
    if (selectedModuleId == null) return null;
    try {
      return enabledModules.firstWhere((m) => m.id == selectedModuleId);
    } catch (_) {
      return null;
    }
  }

  String get subscriptionLabel {
    switch (subscriptionTier) {
      case SubscriptionTier.free:
        return 'Free Plan';
      case SubscriptionTier.starter:
        return 'Starter Plan';
      case SubscriptionTier.pro:
        return 'Pro Plan';
      case SubscriptionTier.enterprise:
        return 'Enterprise Plan';
    }
  }

  bool get hasSubscription => subscriptionTier != SubscriptionTier.free;

  bool get requiresSubscriptionUpgrade =>
      errorCode == 'NO_SUBSCRIPTION' || errorCode == 'SUBSCRIPTION_EXPIRED';

  @override
  List<Object?> get props => [
        isLoading,
        error,
        errorCode,
        tenantId,
        tenantName,
        subscriptionTier,
        enabledModules,
        addonModules,
        navigationItems,
        selectedModuleId,
        moduleAccessError,
      ];
}
