import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../subscription/data/repositories/subscription_repository.dart';
import '../../presentation/bloc/dashboard_bloc.dart';

abstract class DashboardRepository {
  Future<DashboardData> getDashboardData({
    required String tenantId,
    required String accessToken,
  });
  Future<ModuleAccessResult> checkModuleAccess({
    required String tenantId,
    required String moduleId,
    required String accessToken,
  });
}

class DashboardData {
  final String tenantId;
  final String tenantName;
  final String subscriptionTier;
  final List<DashboardModule> enabledModules;
  final List<DashboardModule> addonModules;
  final List<NavigationItem> navigationItems;
  final SubscriptionStatus? subscriptionStatus;

  const DashboardData({
    required this.tenantId,
    required this.tenantName,
    required this.subscriptionTier,
    required this.enabledModules,
    required this.addonModules,
    required this.navigationItems,
    this.subscriptionStatus,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    return DashboardData(
      tenantId: json['tenant']?['id'] as String? ?? '',
      tenantName: json['tenant']?['name'] as String? ?? '',
      subscriptionTier: json['subscription']?['tier'] as String? ?? 'free',
      enabledModules: (json['modules']?['enabled'] as List<dynamic>?)
              ?.map((m) => DashboardModule.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
      addonModules: (json['modules']?['addons'] as List<dynamic>?)
              ?.map((m) => DashboardModule.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
      navigationItems: (json['navigation'] as List<dynamic>?)
              ?.map((n) => NavigationItem.fromJson(n as Map<String, dynamic>))
              .toList() ??
          [],
      subscriptionStatus: json['subscriptionStatus'] != null
          ? SubscriptionStatus.fromJson(
              json['subscriptionStatus'] as Map<String, dynamic>)
          : null,
    );
  }
}

class ModuleAccessResult {
  final String moduleId;
  final bool allowed;
  final String? reason;
  final String? upgradeMessage;

  const ModuleAccessResult({
    required this.moduleId,
    required this.allowed,
    this.reason,
    this.upgradeMessage,
  });

  factory ModuleAccessResult.fromJson(Map<String, dynamic> json) {
    return ModuleAccessResult(
      moduleId: json['moduleId'] as String,
      allowed: json['allowed'] as bool? ?? false,
      reason: json['reason'] as String?,
      upgradeMessage: json['upgradeMessage'] as String?,
    );
  }
}

class DashboardRepositoryImpl implements DashboardRepository {
  final String baseUrl;
  final http.Client _client;

  DashboardRepositoryImpl({
    required this.baseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  @override
  Future<DashboardData> getDashboardData({
    required String tenantId,
    required String accessToken,
  }) async {
    final uri = Uri.parse('$baseUrl/api/dashboard');

    final response = await _client.get(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return DashboardData.fromJson(data);
    } else if (response.statusCode == 401) {
      throw DashboardException(
        code: 'UNAUTHORIZED',
        message: 'Please log in again',
      );
    } else if (response.statusCode == 403) {
      throw DashboardException(
        code: 'FORBIDDEN',
        message: 'You do not have access to this dashboard',
      );
    } else {
      throw DashboardException(
        code: 'ERROR',
        message: 'Failed to load dashboard data',
      );
    }
  }

  @override
  Future<ModuleAccessResult> checkModuleAccess({
    required String tenantId,
    required String moduleId,
    required String accessToken,
  }) async {
    final uri = Uri.parse('$baseUrl/api/dashboard/modules/$moduleId/access');

    final response = await _client.get(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return ModuleAccessResult.fromJson(data);
    } else {
      return ModuleAccessResult(
        moduleId: moduleId,
        allowed: false,
        reason: 'Failed to check module access',
      );
    }
  }
}

class DashboardException implements Exception {
  final String code;
  final String message;

  DashboardException({
    required this.code,
    required this.message,
  });

  @override
  String toString() => message;
}
