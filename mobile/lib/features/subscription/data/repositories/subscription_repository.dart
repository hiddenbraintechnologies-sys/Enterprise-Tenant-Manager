import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../domain/entities/subscription.dart';

abstract class SubscriptionRepository {
  Future<List<SubscriptionPlan>> getPlans({required String country});
  Future<SubscriptionSelectionResult> selectSubscription({
    required String tenantId,
    required SubscriptionTier tier,
    required String country,
    required String accessToken,
  });
  Future<Subscription?> getCurrentSubscription({
    required String tenantId,
    required String accessToken,
  });
  Future<SubscriptionStatus> getSubscriptionStatus({
    required String tenantId,
    required String accessToken,
  });
}

class SubscriptionSelectionResult {
  final Subscription subscription;
  final SubscriptionPlan plan;
  final List<SubscriptionModule> enabledModules;
  final String nextStep;

  const SubscriptionSelectionResult({
    required this.subscription,
    required this.plan,
    required this.enabledModules,
    required this.nextStep,
  });

  factory SubscriptionSelectionResult.fromJson(Map<String, dynamic> json) {
    return SubscriptionSelectionResult(
      subscription: Subscription.fromJson(json['subscription'] as Map<String, dynamic>),
      plan: SubscriptionPlan.fromJson(json['plan'] as Map<String, dynamic>),
      enabledModules: (json['enabledModules'] as List<dynamic>?)
              ?.map((m) => SubscriptionModule.fromJson(m as Map<String, dynamic>))
              .toList() ??
          [],
      nextStep: json['nextStep'] as String? ?? '/dashboard',
    );
  }
}

class SubscriptionStatus {
  final bool hasSubscription;
  final bool isActive;
  final bool isTrial;
  final int? daysRemaining;
  final SubscriptionTier? tier;

  const SubscriptionStatus({
    required this.hasSubscription,
    required this.isActive,
    this.isTrial = false,
    this.daysRemaining,
    this.tier,
  });

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatus(
      hasSubscription: json['hasSubscription'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? false,
      isTrial: json['isTrial'] as bool? ?? false,
      daysRemaining: json['daysRemaining'] as int?,
      tier: json['tier'] != null
          ? SubscriptionTier.values.firstWhere(
              (e) => e.name == json['tier'],
              orElse: () => SubscriptionTier.free,
            )
          : null,
    );
  }
}

class SubscriptionRepositoryImpl implements SubscriptionRepository {
  final String baseUrl;
  final http.Client _client;

  SubscriptionRepositoryImpl({
    required this.baseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  @override
  Future<List<SubscriptionPlan>> getPlans({required String country}) async {
    final uri = Uri.parse('$baseUrl/api/subscription/plans-with-pricing?country=$country');

    final response = await _client.get(uri);

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final plans = data['plans'] as List<dynamic>? ?? [];
      return plans
          .map((p) => SubscriptionPlan.fromJson(p as Map<String, dynamic>))
          .toList();
    } else {
      throw SubscriptionException(
        code: 'FETCH_PLANS_ERROR',
        message: 'Failed to fetch subscription plans',
      );
    }
  }

  @override
  Future<SubscriptionSelectionResult> selectSubscription({
    required String tenantId,
    required SubscriptionTier tier,
    required String country,
    required String accessToken,
  }) async {
    final uri = Uri.parse('$baseUrl/api/subscription/select');

    final response = await _client.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'tenantId': tenantId,
        'tier': tier.name,
        'country': country,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return SubscriptionSelectionResult.fromJson(data);
    } else if (response.statusCode == 403) {
      throw SubscriptionException(
        code: 'FORBIDDEN',
        message: 'You do not have permission to modify this subscription',
      );
    } else if (response.statusCode == 401) {
      throw SubscriptionException(
        code: 'UNAUTHORIZED',
        message: 'Please log in again',
      );
    } else {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      throw SubscriptionException(
        code: data['code'] as String? ?? 'ERROR',
        message: data['message'] as String? ?? 'Failed to select subscription',
      );
    }
  }

  @override
  Future<Subscription?> getCurrentSubscription({
    required String tenantId,
    required String accessToken,
  }) async {
    final uri = Uri.parse('$baseUrl/api/dashboard/subscription/status');

    final response = await _client.get(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (data['hasSubscription'] == true && data['subscription'] != null) {
        return Subscription.fromJson(data['subscription'] as Map<String, dynamic>);
      }
      return null;
    }
    return null;
  }

  @override
  Future<SubscriptionStatus> getSubscriptionStatus({
    required String tenantId,
    required String accessToken,
  }) async {
    final uri = Uri.parse('$baseUrl/api/dashboard/subscription/status');

    final response = await _client.get(
      uri,
      headers: {'Authorization': 'Bearer $accessToken'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return SubscriptionStatus.fromJson(data);
    }
    return const SubscriptionStatus(hasSubscription: false, isActive: false);
  }
}

class SubscriptionException implements Exception {
  final String code;
  final String message;

  SubscriptionException({
    required this.code,
    required this.message,
  });

  @override
  String toString() => message;
}
