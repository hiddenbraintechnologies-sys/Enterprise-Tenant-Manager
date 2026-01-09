part of 'signup_bloc.dart';

abstract class SignupEvent extends Equatable {
  const SignupEvent();

  @override
  List<Object?> get props => [];
}

class SignupStepChanged extends SignupEvent {
  final int step;

  const SignupStepChanged(this.step);

  @override
  List<Object?> get props => [step];
}

class SignupTenantInfoChanged extends SignupEvent {
  final String? tenantName;
  final String? subdomain;
  final String? businessType;
  final String? country;

  const SignupTenantInfoChanged({
    this.tenantName,
    this.subdomain,
    this.businessType,
    this.country,
  });

  @override
  List<Object?> get props => [tenantName, subdomain, businessType, country];
}

class SignupAdminInfoChanged extends SignupEvent {
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? password;
  final String? phone;

  const SignupAdminInfoChanged({
    this.firstName,
    this.lastName,
    this.email,
    this.password,
    this.phone,
  });

  @override
  List<Object?> get props => [firstName, lastName, email, password, phone];
}

class SignupSubmitted extends SignupEvent {
  const SignupSubmitted();
}

class SignupReset extends SignupEvent {
  const SignupReset();
}
