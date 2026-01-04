import 'package:dartz/dartz.dart';

import '../../core/network/api_exceptions.dart';
import '../entities/tenant.dart';
import '../repositories/tenant_repository.dart';

class SelectTenantUseCase {
  final TenantRepository _repository;

  SelectTenantUseCase(this._repository);

  Future<Either<ApiException, Tenant>> call(String tenantId) {
    return _repository.selectTenant(tenantId);
  }
}
