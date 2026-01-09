import '../../core/network/api_client.dart';
import '../models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<LoginResponse> login({
    required String email, 
    required String password,
    String? tenantId,
  });
  Future<LoginResponse> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
    String? tenantId,
  });
  Future<TokenResponse> refreshToken(String refreshToken);
  Future<void> logout();
  Future<UserModel> getCurrentUser();
  Future<void> forgotPassword(String email);
  Future<void> resetPassword({required String token, required String newPassword});
  Future<List<TenantInfo>> getAvailableTenants();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient _apiClient;

  AuthRemoteDataSourceImpl(this._apiClient);

  @override
  Future<LoginResponse> login({
    required String email,
    required String password,
    String? tenantId,
  }) async {
    final response = await _apiClient.post('/api/auth/login', data: {
      'email': email,
      'password': password,
      if (tenantId != null) 'tenantId': tenantId,
    });

    return LoginResponse.fromJson(response.data);
  }
  
  @override
  Future<List<TenantInfo>> getAvailableTenants() async {
    final response = await _apiClient.get('/api/auth/tenants');
    final List<dynamic> data = response.data['tenants'] ?? [];
    return data.map((t) => TenantInfo.fromJson(t)).toList();
  }

  @override
  Future<LoginResponse> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    final response = await _apiClient.post('/api/auth/register', data: {
      'email': email,
      'password': password,
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
    });

    return LoginResponse.fromJson(response.data);
  }

  @override
  Future<TokenResponse> refreshToken(String refreshToken) async {
    final response = await _apiClient.post('/api/auth/refresh', data: {
      'refreshToken': refreshToken,
    });

    return TokenResponse.fromJson(response.data);
  }

  @override
  Future<void> logout() async {
    await _apiClient.post('/api/auth/logout');
  }

  @override
  Future<UserModel> getCurrentUser() async {
    final response = await _apiClient.get('/api/auth/me');
    return UserModel.fromJson(response.data);
  }

  @override
  Future<void> forgotPassword(String email) async {
    await _apiClient.post('/api/auth/forgot-password', data: {
      'email': email,
    });
  }

  @override
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _apiClient.post('/api/auth/reset-password', data: {
      'token': token,
      'password': newPassword,
    });
  }
}

class LoginResponse {
  final UserModel user;
  final String accessToken;
  final String refreshToken;

  LoginResponse({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      user: UserModel.fromJson(json['user']),
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }
}

class TokenResponse {
  final String accessToken;
  final String? refreshToken;

  TokenResponse({
    required this.accessToken,
    this.refreshToken,
  });

  factory TokenResponse.fromJson(Map<String, dynamic> json) {
    return TokenResponse(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String?,
    );
  }
}

class TenantInfo {
  final String id;
  final String name;
  final String? slug;

  TenantInfo({
    required this.id,
    required this.name,
    this.slug,
  });

  factory TenantInfo.fromJson(Map<String, dynamic> json) {
    return TenantInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String?,
    );
  }
}
