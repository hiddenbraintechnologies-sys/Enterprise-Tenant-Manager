part of 'signup_bloc.dart';

class SignupState extends Equatable {
  final int currentStep;
  final String tenantName;
  final String subdomain;
  final String businessType;
  final String country;
  final String adminFirstName;
  final String adminLastName;
  final String adminEmail;
  final String adminPassword;
  final String adminPhone;
  final bool isLoading;
  final bool isSuccess;
  final String? error;
  final String? errorCode;
  final String? accessToken;
  final String? refreshToken;
  final String? tenantId;
  final String? nextStep;

  const SignupState({
    this.currentStep = 0,
    this.tenantName = '',
    this.subdomain = '',
    this.businessType = '',
    this.country = 'india',
    this.adminFirstName = '',
    this.adminLastName = '',
    this.adminEmail = '',
    this.adminPassword = '',
    this.adminPhone = '',
    this.isLoading = false,
    this.isSuccess = false,
    this.error,
    this.errorCode,
    this.accessToken,
    this.refreshToken,
    this.tenantId,
    this.nextStep,
  });

  SignupState copyWith({
    int? currentStep,
    String? tenantName,
    String? subdomain,
    String? businessType,
    String? country,
    String? adminFirstName,
    String? adminLastName,
    String? adminEmail,
    String? adminPassword,
    String? adminPhone,
    bool? isLoading,
    bool? isSuccess,
    String? error,
    String? errorCode,
    String? accessToken,
    String? refreshToken,
    String? tenantId,
    String? nextStep,
  }) {
    return SignupState(
      currentStep: currentStep ?? this.currentStep,
      tenantName: tenantName ?? this.tenantName,
      subdomain: subdomain ?? this.subdomain,
      businessType: businessType ?? this.businessType,
      country: country ?? this.country,
      adminFirstName: adminFirstName ?? this.adminFirstName,
      adminLastName: adminLastName ?? this.adminLastName,
      adminEmail: adminEmail ?? this.adminEmail,
      adminPassword: adminPassword ?? this.adminPassword,
      adminPhone: adminPhone ?? this.adminPhone,
      isLoading: isLoading ?? this.isLoading,
      isSuccess: isSuccess ?? this.isSuccess,
      error: error,
      errorCode: errorCode,
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      tenantId: tenantId ?? this.tenantId,
      nextStep: nextStep ?? this.nextStep,
    );
  }

  bool get isStep1Valid =>
      tenantName.isNotEmpty && businessType.isNotEmpty && country.isNotEmpty;

  bool get isStep2Valid =>
      adminFirstName.isNotEmpty &&
      adminLastName.isNotEmpty &&
      adminEmail.isNotEmpty &&
      adminPassword.length >= 8;

  bool get canSubmit => isStep1Valid && isStep2Valid;

  @override
  List<Object?> get props => [
        currentStep,
        tenantName,
        subdomain,
        businessType,
        country,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword,
        adminPhone,
        isLoading,
        isSuccess,
        error,
        errorCode,
        accessToken,
        refreshToken,
        tenantId,
        nextStep,
      ];
}
