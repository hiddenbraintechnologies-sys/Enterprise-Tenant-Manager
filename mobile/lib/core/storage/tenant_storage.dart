import 'dart:convert';

import 'secure_storage.dart';

abstract class TenantStorage {
  Future<void> setCurrentTenant(TenantInfo tenant);
  Future<TenantInfo?> getCurrentTenant();
  Future<String?> getCurrentTenantId();
  Future<void> clearCurrentTenant();
  Future<void> saveTenantList(List<TenantInfo> tenants);
  Future<List<TenantInfo>> getTenantList();
}

class TenantInfo {
  final String id;
  final String name;
  final String? slug;
  final String? logo;
  final String? businessType;

  const TenantInfo({
    required this.id,
    required this.name,
    this.slug,
    this.logo,
    this.businessType,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'slug': slug,
    'logo': logo,
    'businessType': businessType,
  };

  factory TenantInfo.fromJson(Map<String, dynamic> json) => TenantInfo(
    id: json['id'] as String,
    name: json['name'] as String,
    slug: json['slug'] as String?,
    logo: json['logo'] as String?,
    businessType: json['businessType'] as String?,
  );
}

class TenantStorageImpl implements TenantStorage {
  static const _currentTenantKey = 'current_tenant';
  static const _tenantListKey = 'tenant_list';

  final SecureStorage _storage;

  TenantStorageImpl(this._storage);

  @override
  Future<void> setCurrentTenant(TenantInfo tenant) async {
    await _storage.write(_currentTenantKey, json.encode(tenant.toJson()));
  }

  @override
  Future<TenantInfo?> getCurrentTenant() async {
    final data = await _storage.read(_currentTenantKey);
    if (data == null) return null;
    
    try {
      return TenantInfo.fromJson(json.decode(data));
    } catch (e) {
      return null;
    }
  }

  @override
  Future<String?> getCurrentTenantId() async {
    final tenant = await getCurrentTenant();
    return tenant?.id;
  }

  @override
  Future<void> clearCurrentTenant() async {
    await _storage.delete(_currentTenantKey);
  }

  @override
  Future<void> saveTenantList(List<TenantInfo> tenants) async {
    final jsonList = tenants.map((t) => t.toJson()).toList();
    await _storage.write(_tenantListKey, json.encode(jsonList));
  }

  @override
  Future<List<TenantInfo>> getTenantList() async {
    final data = await _storage.read(_tenantListKey);
    if (data == null) return [];
    
    try {
      final jsonList = json.decode(data) as List;
      return jsonList.map((j) => TenantInfo.fromJson(j)).toList();
    } catch (e) {
      return [];
    }
  }
}
