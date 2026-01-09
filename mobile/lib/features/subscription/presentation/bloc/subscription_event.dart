part of 'subscription_bloc.dart';

abstract class SubscriptionEvent extends Equatable {
  const SubscriptionEvent();

  @override
  List<Object?> get props => [];
}

class SubscriptionPlansRequested extends SubscriptionEvent {
  final String country;

  const SubscriptionPlansRequested({required this.country});

  @override
  List<Object?> get props => [country];
}

class SubscriptionTierSelected extends SubscriptionEvent {
  final SubscriptionTier tier;

  const SubscriptionTierSelected(this.tier);

  @override
  List<Object?> get props => [tier];
}

class SubscriptionConfirmed extends SubscriptionEvent {
  final String tenantId;
  final String accessToken;

  const SubscriptionConfirmed({
    required this.tenantId,
    required this.accessToken,
  });

  @override
  List<Object?> get props => [tenantId, accessToken];
}

class SubscriptionReset extends SubscriptionEvent {
  const SubscriptionReset();
}
