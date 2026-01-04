import 'package:dartz/dartz.dart';

import '../../core/network/api_exceptions.dart';
import '../entities/tenant.dart';
import '../repositories/tenant_repository.dart';

class GetTenantsUseCase {
  final TenantRepository _repository;

  GetTenantsUseCase(this._repository);

  Future<Either<ApiException, List<Tenant>>> call() {
    return _repository.getUserTenants();
  }
}
