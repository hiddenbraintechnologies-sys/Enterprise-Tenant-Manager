import 'package:dio/dio.dart';

import '../storage/tenant_storage.dart';

class TenantInterceptor extends Interceptor {
  final TenantStorage _tenantStorage;

  TenantInterceptor(this._tenantStorage);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final tenantId = await _tenantStorage.getCurrentTenantId();
    
    if (tenantId != null && tenantId.isNotEmpty) {
      options.headers['X-Tenant-ID'] = tenantId;
    }

    handler.next(options);
  }
}
