import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../domain/entities/subscription.dart';
import '../../data/repositories/subscription_repository.dart';

part 'subscription_event.dart';
part 'subscription_state.dart';

class SubscriptionBloc extends Bloc<SubscriptionEvent, SubscriptionState> {
  final SubscriptionRepository _repository;

  SubscriptionBloc({required SubscriptionRepository repository})
      : _repository = repository,
        super(const SubscriptionState()) {
    on<SubscriptionPlansRequested>(_onPlansRequested);
    on<SubscriptionTierSelected>(_onTierSelected);
    on<SubscriptionConfirmed>(_onConfirmed);
    on<SubscriptionReset>(_onReset);
  }

  Future<void> _onPlansRequested(
    SubscriptionPlansRequested event,
    Emitter<SubscriptionState> emit,
  ) async {
    emit(state.copyWith(isLoading: true, error: null));

    try {
      final plans = await _repository.getPlans(country: event.country);
      emit(state.copyWith(
        isLoading: false,
        availablePlans: plans,
        country: event.country,
      ));
    } on SubscriptionException catch (e) {
      emit(state.copyWith(
        isLoading: false,
        error: e.message,
      ));
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        error: 'Failed to load subscription plans',
      ));
    }
  }

  void _onTierSelected(
    SubscriptionTierSelected event,
    Emitter<SubscriptionState> emit,
  ) {
    emit(state.copyWith(selectedTier: event.tier));
  }

  Future<void> _onConfirmed(
    SubscriptionConfirmed event,
    Emitter<SubscriptionState> emit,
  ) async {
    if (state.selectedTier == null) return;

    emit(state.copyWith(isSubmitting: true, error: null));

    try {
      final result = await _repository.selectSubscription(
        tenantId: event.tenantId,
        tier: state.selectedTier!,
        country: state.country,
        accessToken: event.accessToken,
      );

      emit(state.copyWith(
        isSubmitting: false,
        isSuccess: true,
        activeSubscription: result.subscription,
        enabledModules: result.enabledModules,
        nextStep: result.nextStep,
      ));
    } on SubscriptionException catch (e) {
      emit(state.copyWith(
        isSubmitting: false,
        error: e.message,
      ));
    } catch (e) {
      emit(state.copyWith(
        isSubmitting: false,
        error: 'Failed to activate subscription',
      ));
    }
  }

  void _onReset(SubscriptionReset event, Emitter<SubscriptionState> emit) {
    emit(const SubscriptionState());
  }
}
