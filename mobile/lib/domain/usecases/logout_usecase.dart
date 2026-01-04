import 'package:dartz/dartz.dart';

import '../../core/network/api_exceptions.dart';
import '../repositories/auth_repository.dart';

class LogoutUseCase {
  final AuthRepository _repository;

  LogoutUseCase(this._repository);

  Future<Either<ApiException, void>> call() {
    return _repository.logout();
  }
}
