import 'package:dartz/dartz.dart';

import '../../core/network/api_exceptions.dart';
import '../entities/auth_tokens.dart';
import '../repositories/auth_repository.dart';

class RefreshTokenUseCase {
  final AuthRepository _repository;

  RefreshTokenUseCase(this._repository);

  Future<Either<ApiException, AuthTokens>> call(String refreshToken) {
    return _repository.refreshToken(refreshToken);
  }
}
