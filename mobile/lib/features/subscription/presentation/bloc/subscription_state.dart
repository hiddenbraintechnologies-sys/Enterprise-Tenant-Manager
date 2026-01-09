part of 'subscription_bloc.dart';

class SubscriptionState extends Equatable {
  final bool isLoading;
  final bool isSubmitting;
  final bool isSuccess;
  final String? error;
  final String country;
  final List<SubscriptionPlan> availablePlans;
  final SubscriptionTier? selectedTier;
  final Subscription? activeSubscription;
  final List<SubscriptionModule> enabledModules;
  final String? nextStep;

  const SubscriptionState({
    this.isLoading = false,
    this.isSubmitting = false,
    this.isSuccess = false,
    this.error,
    this.country = 'usa',
    this.availablePlans = const [],
    this.selectedTier,
    this.activeSubscription,
    this.enabledModules = const [],
    this.nextStep,
  });

  SubscriptionState copyWith({
    bool? isLoading,
    bool? isSubmitting,
    bool? isSuccess,
    String? error,
    String? country,
    List<SubscriptionPlan>? availablePlans,
    SubscriptionTier? selectedTier,
    Subscription? activeSubscription,
    List<SubscriptionModule>? enabledModules,
    String? nextStep,
  }) {
    return SubscriptionState(
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      isSuccess: isSuccess ?? this.isSuccess,
      error: error,
      country: country ?? this.country,
      availablePlans: availablePlans ?? this.availablePlans,
      selectedTier: selectedTier ?? this.selectedTier,
      activeSubscription: activeSubscription ?? this.activeSubscription,
      enabledModules: enabledModules ?? this.enabledModules,
      nextStep: nextStep ?? this.nextStep,
    );
  }

  SubscriptionPlan? get selectedPlan {
    if (selectedTier == null) return null;
    try {
      return availablePlans.firstWhere((p) => p.tier == selectedTier);
    } catch (_) {
      return null;
    }
  }

  @override
  List<Object?> get props => [
        isLoading,
        isSubmitting,
        isSuccess,
        error,
        country,
        availablePlans,
        selectedTier,
        activeSubscription,
        enabledModules,
        nextStep,
      ];
}
