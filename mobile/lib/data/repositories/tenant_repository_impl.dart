import 'package:dartz/dartz.dart';

import '../../core/network/api_exceptions.dart';
import '../../core/storage/tenant_storage.dart';
import '../../domain/entities/tenant.dart';
import '../../domain/repositories/tenant_repository.dart';
import '../datasources/tenant_remote_datasource.dart';
import '../models/tenant_model.dart';

class TenantRepositoryImpl implements TenantRepository {
  final TenantRemoteDataSource _remoteDataSource;
  final TenantStorage _tenantStorage;

  TenantRepositoryImpl({
    required TenantRemoteDataSource remoteDataSource,
    required TenantStorage tenantStorage,
  })  : _remoteDataSource = remoteDataSource,
        _tenantStorage = tenantStorage;

  @override
  Future<Either<ApiException, List<Tenant>>> getUserTenants() async {
    try {
      final tenants = await _remoteDataSource.getUserTenants();
      
      await _tenantStorage.saveTenantList(
        tenants.map((t) => TenantInfo(
          id: t.id,
          name: t.name,
          slug: t.slug,
          logo: t.logo,
          businessType: t.businessType,
        )).toList(),
      );
      
      return Right(tenants);
    } on ApiException catch (e) {
      return Left(e);
    } catch (e) {
      return Left(ApiException(e.toString()));
    }
  }

  @override
  Future<Either<ApiException, Tenant>> getTenantById(String tenantId) async {
    try {
      final tenant = await _remoteDataSource.getTenantById(tenantId);
      return Right(tenant);
    } on ApiException catch (e) {
      return Left(e);
    } catch (e) {
      return Left(ApiException(e.toString()));
    }
  }

  @override
  Future<Either<ApiException, Tenant>> selectTenant(String tenantId) async {
    try {
      final tenant = await _remoteDataSource.getTenantById(tenantId);
      
      await _tenantStorage.setCurrentTenant(TenantInfo(
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo,
        businessType: tenant.businessType,
      ));
      
      return Right(tenant);
    } on ApiException catch (e) {
      return Left(e);
    } catch (e) {
      return Left(ApiException(e.toString()));
    }
  }

  @override
  Future<Tenant?> getCurrentTenant() async {
    final tenantInfo = await _tenantStorage.getCurrentTenant();
    if (tenantInfo == null) return null;
    
    return TenantModel(
      id: tenantInfo.id,
      name: tenantInfo.name,
      slug: tenantInfo.slug,
      logo: tenantInfo.logo,
      businessType: tenantInfo.businessType ?? 'general',
    );
  }

  @override
  Future<void> clearCurrentTenant() async {
    await _tenantStorage.clearCurrentTenant();
  }

  @override
  Future<Either<ApiException, TenantSettings>> getTenantSettings(String tenantId) async {
    try {
      final settings = await _remoteDataSource.getTenantSettings(tenantId);
      return Right(settings);
    } on ApiException catch (e) {
      return Left(e);
    } catch (e) {
      return Left(ApiException(e.toString()));
    }
  }

  @override
  Future<Either<ApiException, TenantBranding>> getTenantBranding(String tenantId) async {
    try {
      final branding = await _remoteDataSource.getTenantBranding(tenantId);
      return Right(branding);
    } on ApiException catch (e) {
      return Left(e);
    } catch (e) {
      return Left(ApiException(e.toString()));
    }
  }
}
