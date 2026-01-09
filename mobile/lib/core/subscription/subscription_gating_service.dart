import 'dart:async';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';
import '../storage/tenant_storage.dart';

enum SubscriptionTier {
  free,
  starter,
  pro,
  enterprise,
}

class ModuleAccess {
  final String moduleId;
  final bool allowed;
  final String? reason;
  final SubscriptionTier? requiredTier;

  ModuleAccess({
    required this.moduleId,
    required this.allowed,
    this.reason,
    this.requiredTier,
  });

  factory ModuleAccess.fromJson(Map<String, dynamic> json) {
    return ModuleAccess(
      moduleId: json['moduleId'] as String,
      allowed: json['allowed'] as bool? ?? false,
      reason: json['reason'] as String?,
      requiredTier: json['requiredTier'] != null
          ? SubscriptionTier.values.firstWhere(
              (t) => t.name == json['requiredTier'],
              orElse: () => SubscriptionTier.free,
            )
          : null,
    );
  }
}

class SubscriptionStatus {
  final String? subscriptionId;
  final SubscriptionTier tier;
  final String status;
  final DateTime? trialEndsAt;
  final DateTime? currentPeriodEnd;
  final List<String> enabledModules;
  final int maxUsers;
  final int maxCustomers;

  SubscriptionStatus({
    this.subscriptionId,
    required this.tier,
    required this.status,
    this.trialEndsAt,
    this.currentPeriodEnd,
    required this.enabledModules,
    this.maxUsers = 1,
    this.maxCustomers = 10,
  });

  bool get isActive => status == 'active' || status == 'trialing';
  bool get isTrial => status == 'trialing';

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    final plan = json['plan'] as Map<String, dynamic>?;
    final sub = json['subscription'] as Map<String, dynamic>?;
    
    return SubscriptionStatus(
      subscriptionId: sub?['id'] as String?,
      tier: SubscriptionTier.values.firstWhere(
        (t) => t.name == (plan?['tier'] ?? 'free'),
        orElse: () => SubscriptionTier.free,
      ),
      status: sub?['status'] as String? ?? 'none',
      trialEndsAt: sub?['trialEndsAt'] != null
          ? DateTime.parse(sub!['trialEndsAt'] as String)
          : null,
      currentPeriodEnd: sub?['currentPeriodEnd'] != null
          ? DateTime.parse(sub!['currentPeriodEnd'] as String)
          : null,
      enabledModules: (json['enabledModules'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      maxUsers: json['maxUsers'] as int? ?? 1,
      maxCustomers: json['maxCustomers'] as int? ?? 10,
    );
  }

  factory SubscriptionStatus.none() => SubscriptionStatus(
    tier: SubscriptionTier.free,
    status: 'none',
    enabledModules: [],
  );
}

class SubscriptionGatingService {
  final ApiClient _apiClient;
  final TenantStorage _tenantStorage;
  
  SubscriptionStatus? _cachedStatus;
  DateTime? _lastFetch;
  static const Duration _cacheTimeout = Duration(minutes: 5);

  final _statusController = StreamController<SubscriptionStatus>.broadcast();
  Stream<SubscriptionStatus> get statusStream => _statusController.stream;

  SubscriptionGatingService({
    required ApiClient apiClient,
    required TenantStorage tenantStorage,
  })  : _apiClient = apiClient,
        _tenantStorage = tenantStorage;

  Future<SubscriptionStatus> getSubscriptionStatus({bool forceRefresh = false}) async {
    if (!forceRefresh && _cachedStatus != null && _lastFetch != null) {
      if (DateTime.now().difference(_lastFetch!) < _cacheTimeout) {
        return _cachedStatus!;
      }
    }

    try {
      final response = await _apiClient.get('/api/dashboard/subscription/status');
      _cachedStatus = SubscriptionStatus.fromJson(response.data as Map<String, dynamic>);
      _lastFetch = DateTime.now();
      _statusController.add(_cachedStatus!);
      return _cachedStatus!;
    } catch (e) {
      debugPrint('[SubscriptionGating] Error fetching status: $e');
      return _cachedStatus ?? SubscriptionStatus.none();
    }
  }

  Future<bool> hasModuleAccess(String moduleId) async {
    final status = await getSubscriptionStatus();
    return status.enabledModules.contains(moduleId);
  }

  Future<ModuleAccess> checkModuleAccess(String moduleId) async {
    try {
      final response = await _apiClient.get('/api/dashboard/modules/$moduleId/access');
      return ModuleAccess.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[SubscriptionGating] Error checking module access: $e');
      return ModuleAccess(
        moduleId: moduleId,
        allowed: false,
        reason: 'Error checking access',
      );
    }
  }

  Future<List<String>> getEnabledModules() async {
    final status = await getSubscriptionStatus();
    return status.enabledModules;
  }

  bool isModuleEnabledSync(String moduleId) {
    return _cachedStatus?.enabledModules.contains(moduleId) ?? false;
  }

  SubscriptionTier get currentTier => _cachedStatus?.tier ?? SubscriptionTier.free;

  bool get isActive => _cachedStatus?.isActive ?? false;

  bool get isTrial => _cachedStatus?.isTrial ?? false;

  void clearCache() {
    _cachedStatus = null;
    _lastFetch = null;
  }

  void dispose() {
    _statusController.close();
  }
}
