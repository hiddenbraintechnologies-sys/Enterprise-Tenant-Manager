part of 'auth_bloc.dart';

abstract class AuthState extends Equatable {
  final bool isBootstrapped;
  
  const AuthState({this.isBootstrapped = false});

  @override
  List<Object?> get props => [isBootstrapped];
}

class AuthInitial extends AuthState {
  const AuthInitial() : super(isBootstrapped: false);
}

class AuthLoading extends AuthState {
  const AuthLoading() : super(isBootstrapped: false);
}

class AuthAuthenticated extends AuthState {
  final User user;

  const AuthAuthenticated({
    required this.user,
    super.isBootstrapped = true,
  });

  @override
  List<Object?> get props => [user, isBootstrapped];
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated() : super(isBootstrapped: true);
}

class AuthError extends AuthState {
  final String message;

  const AuthError(this.message) : super(isBootstrapped: true);

  @override
  List<Object?> get props => [message, isBootstrapped];
}
