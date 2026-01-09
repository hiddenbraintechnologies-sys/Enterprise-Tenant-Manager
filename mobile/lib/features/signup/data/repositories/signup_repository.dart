import 'dart:convert';
import 'package:http/http.dart' as http;

class SignupResult {
  final String accessToken;
  final String refreshToken;
  final String tenantId;
  final String tenantName;
  final String userId;
  final String userEmail;
  final String nextStep;

  const SignupResult({
    required this.accessToken,
    required this.refreshToken,
    required this.tenantId,
    required this.tenantName,
    required this.userId,
    required this.userEmail,
    required this.nextStep,
  });

  factory SignupResult.fromJson(Map<String, dynamic> json) {
    return SignupResult(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      tenantId: json['tenant']['id'] as String,
      tenantName: json['tenant']['name'] as String,
      userId: json['user']['id'] as String,
      userEmail: json['user']['email'] as String,
      nextStep: json['nextStep'] as String? ?? '/subscription/select',
    );
  }
}

abstract class SignupRepository {
  Future<SignupResult> signup({
    required String tenantName,
    String? subdomain,
    required String businessType,
    required String country,
    required String adminFirstName,
    required String adminLastName,
    required String adminEmail,
    required String adminPassword,
    String? adminPhone,
  });
}

class SignupRepositoryImpl implements SignupRepository {
  final String baseUrl;
  final http.Client _client;

  SignupRepositoryImpl({
    required this.baseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  @override
  Future<SignupResult> signup({
    required String tenantName,
    String? subdomain,
    required String businessType,
    required String country,
    required String adminFirstName,
    required String adminLastName,
    required String adminEmail,
    required String adminPassword,
    String? adminPhone,
  }) async {
    final uri = Uri.parse('$baseUrl/api/auth/signup');
    
    final body = {
      'tenantName': tenantName,
      'businessType': businessType,
      'country': country,
      'adminFirstName': adminFirstName,
      'adminLastName': adminLastName,
      'adminEmail': adminEmail,
      'adminPassword': adminPassword,
    };

    if (subdomain != null && subdomain.isNotEmpty) {
      body['subdomain'] = subdomain;
    }

    if (adminPhone != null && adminPhone.isNotEmpty) {
      body['phone'] = adminPhone;
    }

    final response = await _client.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return SignupResult.fromJson(data);
    } else if (response.statusCode == 409) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      throw SignupException(
        code: data['code'] as String? ?? 'CONFLICT',
        message: data['message'] as String? ?? 'Email already exists',
      );
    } else if (response.statusCode == 400) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      throw SignupException(
        code: 'VALIDATION_ERROR',
        message: data['error'] as String? ?? 'Validation failed',
        details: data['details'] as List<dynamic>?,
      );
    } else {
      throw SignupException(
        code: 'SERVER_ERROR',
        message: 'Failed to create account. Please try again.',
      );
    }
  }
}

class SignupException implements Exception {
  final String code;
  final String message;
  final List<dynamic>? details;

  SignupException({
    required this.code,
    required this.message,
    this.details,
  });

  @override
  String toString() => message;
}
