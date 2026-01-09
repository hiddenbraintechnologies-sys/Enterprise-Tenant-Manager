import 'package:dartz/dartz.dart';

import '../../core/network/api_exceptions.dart';
import '../entities/auth_tokens.dart';
import '../entities/user.dart';

abstract class AuthRepository {
  Future<Either<ApiException, AuthResult>> login({
    required String email,
    required String password,
    String? tenantId,
  });

  Future<Either<ApiException, AuthResult>> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
    String? tenantId,
  });

  Future<Either<ApiException, AuthTokens>> refreshToken(String refreshToken);

  Future<Either<ApiException, void>> logout();

  Future<Either<ApiException, User>> getCurrentUser();

  Future<Either<ApiException, void>> forgotPassword(String email);

  Future<Either<ApiException, void>> resetPassword({
    required String token,
    required String newPassword,
  });

  Future<bool> isAuthenticated();
  
  Future<Either<ApiException, List<TenantInfo>>> getAvailableTenants();
}

class TenantInfo {
  final String id;
  final String name;
  final String? slug;

  const TenantInfo({
    required this.id,
    required this.name,
    this.slug,
  });
}

class AuthResult {
  final User user;
  final AuthTokens tokens;
  final TenantInfo? tenant;

  const AuthResult({
    required this.user,
    required this.tokens,
    this.tenant,
  });
}
