import 'package:dartz/dartz.dart';

import '../../core/network/api_exceptions.dart';
import '../entities/tenant.dart';

abstract class TenantRepository {
  Future<Either<ApiException, List<Tenant>>> getUserTenants();
  
  Future<Either<ApiException, Tenant>> getTenantById(String tenantId);
  
  Future<Either<ApiException, Tenant>> selectTenant(String tenantId);
  
  Future<Tenant?> getCurrentTenant();
  
  Future<void> clearCurrentTenant();
  
  Future<Either<ApiException, TenantSettings>> getTenantSettings(String tenantId);
  
  Future<Either<ApiException, TenantBranding>> getTenantBranding(String tenantId);
}
