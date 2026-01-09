import 'package:dartz/dartz.dart';

import '../../core/network/api_exceptions.dart';
import '../repositories/auth_repository.dart';

class LoginUseCase {
  final AuthRepository _repository;

  LoginUseCase(this._repository);

  Future<Either<ApiException, AuthResult>> call(LoginParams params) {
    return _repository.login(
      email: params.email,
      password: params.password,
      tenantId: params.tenantId,
    );
  }
}

class LoginParams {
  final String email;
  final String password;
  final String? tenantId;

  const LoginParams({
    required this.email,
    required this.password,
    this.tenantId,
  });
}
