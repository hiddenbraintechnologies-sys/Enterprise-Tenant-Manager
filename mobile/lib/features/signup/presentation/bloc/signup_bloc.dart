import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../data/repositories/signup_repository.dart';

part 'signup_event.dart';
part 'signup_state.dart';

class SignupBloc extends Bloc<SignupEvent, SignupState> {
  final SignupRepository _repository;

  SignupBloc({required SignupRepository repository})
      : _repository = repository,
        super(const SignupState()) {
    on<SignupStepChanged>(_onStepChanged);
    on<SignupTenantInfoChanged>(_onTenantInfoChanged);
    on<SignupAdminInfoChanged>(_onAdminInfoChanged);
    on<SignupSubmitted>(_onSubmitted);
    on<SignupReset>(_onReset);
  }

  void _onStepChanged(SignupStepChanged event, Emitter<SignupState> emit) {
    emit(state.copyWith(currentStep: event.step));
  }

  void _onTenantInfoChanged(SignupTenantInfoChanged event, Emitter<SignupState> emit) {
    emit(state.copyWith(
      tenantName: event.tenantName ?? state.tenantName,
      subdomain: event.subdomain ?? state.subdomain,
      businessType: event.businessType ?? state.businessType,
      country: event.country ?? state.country,
    ));
  }

  void _onAdminInfoChanged(SignupAdminInfoChanged event, Emitter<SignupState> emit) {
    emit(state.copyWith(
      adminFirstName: event.firstName ?? state.adminFirstName,
      adminLastName: event.lastName ?? state.adminLastName,
      adminEmail: event.email ?? state.adminEmail,
      adminPassword: event.password ?? state.adminPassword,
      adminPhone: event.phone ?? state.adminPhone,
    ));
  }

  Future<void> _onSubmitted(SignupSubmitted event, Emitter<SignupState> emit) async {
    if (state.isLoading) return;

    emit(state.copyWith(isLoading: true, error: null));

    try {
      final result = await _repository.signup(
        tenantName: state.tenantName,
        subdomain: state.subdomain.isNotEmpty ? state.subdomain : null,
        businessType: state.businessType,
        country: state.country,
        adminFirstName: state.adminFirstName,
        adminLastName: state.adminLastName,
        adminEmail: state.adminEmail,
        adminPassword: state.adminPassword,
        adminPhone: state.adminPhone.isNotEmpty ? state.adminPhone : null,
      );

      emit(state.copyWith(
        isLoading: false,
        isSuccess: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tenantId: result.tenantId,
        nextStep: result.nextStep,
      ));
    } on SignupException catch (e) {
      emit(state.copyWith(
        isLoading: false,
        error: e.message,
        errorCode: e.code,
      ));
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        error: 'An unexpected error occurred. Please try again.',
      ));
    }
  }

  void _onReset(SignupReset event, Emitter<SignupState> emit) {
    emit(const SignupState());
  }
}
