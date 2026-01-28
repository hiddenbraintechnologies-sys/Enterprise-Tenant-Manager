import 'package:bloc_test/bloc_test.dart';
import 'package:dartz/dartz.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mybizstream/core/network/api_exceptions.dart';
import 'package:mybizstream/core/storage/token_storage.dart';
import 'package:mybizstream/core/storage/tenant_storage.dart';
import 'package:mybizstream/domain/entities/auth_tokens.dart';
import 'package:mybizstream/domain/entities/user.dart';
import 'package:mybizstream/domain/usecases/login_usecase.dart';
import 'package:mybizstream/domain/usecases/logout_usecase.dart';
import 'package:mybizstream/domain/usecases/refresh_token_usecase.dart';
import 'package:mybizstream/features/auth/presentation/bloc/auth_bloc.dart';

class MockTokenStorage extends Mock implements TokenStorage {}
class MockTenantStorage extends Mock implements TenantStorage {}
class MockLoginUseCase extends Mock implements LoginUseCase {}
class MockLogoutUseCase extends Mock implements LogoutUseCase {}
class MockRefreshTokenUseCase extends Mock implements RefreshTokenUseCase {}

void main() {
  late AuthBloc authBloc;
  late MockTokenStorage mockTokenStorage;
  late MockTenantStorage mockTenantStorage;
  late MockLoginUseCase mockLoginUseCase;
  late MockLogoutUseCase mockLogoutUseCase;
  late MockRefreshTokenUseCase mockRefreshTokenUseCase;

  setUp(() {
    mockTokenStorage = MockTokenStorage();
    mockTenantStorage = MockTenantStorage();
    mockLoginUseCase = MockLoginUseCase();
    mockLogoutUseCase = MockLogoutUseCase();
    mockRefreshTokenUseCase = MockRefreshTokenUseCase();

    authBloc = AuthBloc(
      loginUseCase: mockLoginUseCase,
      logoutUseCase: mockLogoutUseCase,
      refreshTokenUseCase: mockRefreshTokenUseCase,
      tokenStorage: mockTokenStorage,
      tenantStorage: mockTenantStorage,
    );
  });

  tearDown(() {
    authBloc.close();
  });

  group('AuthBloc Bootstrap', () {
    test('initial state is AuthInitial with isBootstrapped false', () {
      expect(authBloc.state, const AuthInitial());
      expect(authBloc.state.isBootstrapped, false);
    });

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthUnauthenticated] when no tokens stored',
      build: () {
        when(() => mockTokenStorage.getAccessToken()).thenAnswer((_) async => null);
        when(() => mockTokenStorage.getRefreshToken()).thenAnswer((_) async => null);
        return authBloc;
      },
      act: (bloc) => bloc.add(const AuthCheckRequested()),
      expect: () => [
        const AuthLoading(),
        const AuthUnauthenticated(),
      ],
      verify: (_) {
        verify(() => mockTokenStorage.getAccessToken()).called(1);
        verify(() => mockTokenStorage.getRefreshToken()).called(1);
      },
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] when valid tokens exist',
      build: () {
        when(() => mockTokenStorage.getAccessToken()).thenAnswer((_) async => 'valid_access_token');
        when(() => mockTokenStorage.getRefreshToken()).thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockTokenStorage.hasValidTokens()).thenAnswer((_) async => true);
        when(() => mockTokenStorage.decodeAccessToken()).thenAnswer((_) async => {
          'userId': 'user123',
          'email': 'test@example.com',
          'role': 'admin',
        });
        return authBloc;
      },
      act: (bloc) => bloc.add(const AuthCheckRequested()),
      expect: () => [
        const AuthLoading(),
        isA<AuthAuthenticated>()
            .having((s) => s.user.email, 'email', 'test@example.com')
            .having((s) => s.isBootstrapped, 'isBootstrapped', true),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthAuthenticated] after successful token refresh',
      build: () {
        when(() => mockTokenStorage.getAccessToken()).thenAnswer((_) async => 'expired_token');
        when(() => mockTokenStorage.getRefreshToken()).thenAnswer((_) async => 'valid_refresh_token');
        when(() => mockTokenStorage.hasValidTokens()).thenAnswer((_) async => false);
        when(() => mockRefreshTokenUseCase('valid_refresh_token')).thenAnswer(
          (_) async => Right(AuthTokens(
            accessToken: 'new_access_token',
            refreshToken: 'new_refresh_token',
          )),
        );
        when(() => mockTokenStorage.decodeAccessToken()).thenAnswer((_) async => {
          'userId': 'user123',
          'email': 'refreshed@example.com',
          'role': 'user',
        });
        return authBloc;
      },
      act: (bloc) => bloc.add(const AuthCheckRequested()),
      expect: () => [
        const AuthLoading(),
        isA<AuthAuthenticated>()
            .having((s) => s.user.email, 'email', 'refreshed@example.com')
            .having((s) => s.isBootstrapped, 'isBootstrapped', true),
      ],
    );

    blocTest<AuthBloc, AuthState>(
      'emits [AuthLoading, AuthUnauthenticated] when refresh fails and clears tokens',
      build: () {
        when(() => mockTokenStorage.getAccessToken()).thenAnswer((_) async => 'expired_token');
        when(() => mockTokenStorage.getRefreshToken()).thenAnswer((_) async => 'invalid_refresh_token');
        when(() => mockTokenStorage.hasValidTokens()).thenAnswer((_) async => false);
        when(() => mockRefreshTokenUseCase('invalid_refresh_token')).thenAnswer(
          (_) async => Left(ApiException('Refresh token expired')),
        );
        when(() => mockTokenStorage.clearTokens()).thenAnswer((_) async {});
        when(() => mockTenantStorage.clearCurrentTenant()).thenAnswer((_) async {});
        return authBloc;
      },
      act: (bloc) => bloc.add(const AuthCheckRequested()),
      expect: () => [
        const AuthLoading(),
        const AuthUnauthenticated(),
      ],
      verify: (_) {
        verify(() => mockTokenStorage.clearTokens()).called(1);
        verify(() => mockTenantStorage.clearCurrentTenant()).called(1);
      },
    );
  });

  group('AuthState isBootstrapped', () {
    test('AuthInitial has isBootstrapped false', () {
      expect(const AuthInitial().isBootstrapped, false);
    });

    test('AuthLoading has isBootstrapped false', () {
      expect(const AuthLoading().isBootstrapped, false);
    });

    test('AuthAuthenticated has isBootstrapped true by default', () {
      final state = AuthAuthenticated(
        user: User(id: '1', email: 'test@example.com', role: 'user'),
      );
      expect(state.isBootstrapped, true);
    });

    test('AuthUnauthenticated has isBootstrapped true', () {
      expect(const AuthUnauthenticated().isBootstrapped, true);
    });

    test('AuthError has isBootstrapped true', () {
      expect(const AuthError('error').isBootstrapped, true);
    });
  });
}
