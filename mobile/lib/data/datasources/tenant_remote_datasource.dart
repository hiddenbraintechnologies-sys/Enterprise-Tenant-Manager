import '../../core/network/api_client.dart';
import '../models/tenant_model.dart';

abstract class TenantRemoteDataSource {
  Future<List<TenantModel>> getUserTenants();
  Future<TenantModel> getTenantById(String tenantId);
  Future<TenantSettingsModel> getTenantSettings(String tenantId);
  Future<TenantBrandingModel> getTenantBranding(String tenantId);
}

class TenantRemoteDataSourceImpl implements TenantRemoteDataSource {
  final ApiClient _apiClient;

  TenantRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<TenantModel>> getUserTenants() async {
    final response = await _apiClient.get('/api/tenants');
    
    final data = response.data;
    if (data is List) {
      return data.map((json) => TenantModel.fromJson(json)).toList();
    }
    
    if (data is Map && data['tenants'] is List) {
      return (data['tenants'] as List)
          .map((json) => TenantModel.fromJson(json))
          .toList();
    }
    
    return [];
  }

  @override
  Future<TenantModel> getTenantById(String tenantId) async {
    final response = await _apiClient.get('/api/tenants/$tenantId');
    return TenantModel.fromJson(response.data);
  }

  @override
  Future<TenantSettingsModel> getTenantSettings(String tenantId) async {
    final response = await _apiClient.get('/api/tenants/$tenantId/settings');
    return TenantSettingsModel.fromJson(response.data);
  }

  @override
  Future<TenantBrandingModel> getTenantBranding(String tenantId) async {
    final response = await _apiClient.get('/api/tenants/$tenantId/branding');
    return TenantBrandingModel.fromJson(response.data);
  }
}
