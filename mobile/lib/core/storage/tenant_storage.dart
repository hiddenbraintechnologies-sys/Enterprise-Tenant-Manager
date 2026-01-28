import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'secure_storage.dart';

abstract class TenantStorage {
  Future<void> setCurrentTenant(TenantInfo tenant);
  Future<void> setCurrentTenantId(String tenantId);
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

  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[TenantStorage] $message');
    }
  }

  @override
  Future<void> setCurrentTenant(TenantInfo tenant) async {
    _debugLog('Saving tenant: ${tenant.name} (${tenant.id})');
    await _storage.write(_currentTenantKey, json.encode(tenant.toJson()));
    
    // Verify tenant was saved
    final saved = await _storage.read(_currentTenantKey);
    _debugLog('Tenant saved - verify: ${saved != null}');
  }

  @override
  Future<TenantInfo?> getCurrentTenant() async {
    final data = await _storage.read(_currentTenantKey);
    _debugLog('Loading tenant - data exists: ${data != null}');
    if (data == null) return null;
    
    try {
      final tenant = TenantInfo.fromJson(json.decode(data));
      _debugLog('Loaded tenant: ${tenant.name} (${tenant.id})');
      return tenant;
    } catch (e) {
      _debugLog('Failed to parse tenant: $e');
      return null;
    }
  }

  @override
  Future<String?> getCurrentTenantId() async {
    final tenant = await getCurrentTenant();
    return tenant?.id;
  }

  @override
  Future<void> setCurrentTenantId(String tenantId) async {
    _debugLog('Setting tenant ID: $tenantId');
    // Create a minimal tenant info with just the ID
    final tenant = TenantInfo(id: tenantId, name: '');
    await setCurrentTenant(tenant);
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
