import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/storage/token_storage.dart';
import '../../../../core/storage/tenant_storage.dart';
import '../../../../domain/entities/user.dart';
import '../../../../domain/usecases/login_usecase.dart';
import '../../../../domain/usecases/logout_usecase.dart';
import '../../../../domain/usecases/refresh_token_usecase.dart';

part 'auth_event.dart';
part 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final LoginUseCase _loginUseCase;
  final LogoutUseCase _logoutUseCase;
  final RefreshTokenUseCase _refreshTokenUseCase;
  final TokenStorage _tokenStorage;
  final TenantStorage _tenantStorage;

  AuthBloc({
    required LoginUseCase loginUseCase,
    required LogoutUseCase logoutUseCase,
    required RefreshTokenUseCase refreshTokenUseCase,
    required TokenStorage tokenStorage,
    required TenantStorage tenantStorage,
  })  : _loginUseCase = loginUseCase,
        _logoutUseCase = logoutUseCase,
        _refreshTokenUseCase = refreshTokenUseCase,
        _tokenStorage = tokenStorage,
        _tenantStorage = tenantStorage,
        super(const AuthInitial()) {
    on<AuthCheckRequested>(_onAuthCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
    on<AuthTokenRefreshRequested>(_onTokenRefreshRequested);
  }

  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[AuthBloc] $message');
    }
  }

  Future<void> _onAuthCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    _debugLog('Boot start - checking stored tokens');
    emit(const AuthLoading());

    try {
      final accessToken = await _tokenStorage.getAccessToken();
      final refreshToken = await _tokenStorage.getRefreshToken();
      
      _debugLog('Tokens loaded - access: ${accessToken != null}, refresh: ${refreshToken != null}');

      if (accessToken == null && refreshToken == null) {
        _debugLog('No tokens found - routing to login');
        emit(const AuthUnauthenticated());
        return;
      }

      final hasValidTokens = await _tokenStorage.hasValidTokens();
      _debugLog('Access token valid: $hasValidTokens');
      
      if (hasValidTokens) {
        final payload = await _tokenStorage.decodeAccessToken();
        if (payload != null) {
          final user = User(
            id: payload['userId'] as String? ?? '',
            email: payload['email'] as String? ?? '',
            role: payload['role'] as String? ?? 'user',
          );
          _debugLog('Valid token - authenticated as ${user.email}');
          emit(AuthAuthenticated(user: user, isBootstrapped: true));
          return;
        }
      }

      if (refreshToken != null) {
        _debugLog('Access token expired - attempting refresh');
        final result = await _refreshTokenUseCase(refreshToken);
        
        final authState = result.fold<AuthState>(
          (failure) {
            _debugLog('Refresh failed: ${failure.message} - clearing tokens');
            return const AuthUnauthenticated();
          },
          (tokens) {
            _debugLog('Refresh successful - new tokens saved');
            return const AuthLoading();
          },
        );

        if (authState is AuthUnauthenticated) {
          await _tokenStorage.clearTokens();
          await _tenantStorage.clearCurrentTenant();
          emit(authState);
          return;
        }

        final payload = await _tokenStorage.decodeAccessToken();
        if (payload != null) {
          final user = User(
            id: payload['userId'] as String? ?? '',
            email: payload['email'] as String? ?? '',
            role: payload['role'] as String? ?? 'user',
          );
          _debugLog('After refresh - authenticated as ${user.email}');
          emit(AuthAuthenticated(user: user, isBootstrapped: true));
        } else {
          _debugLog('Failed to decode refreshed token - clearing');
          await _tokenStorage.clearTokens();
          await _tenantStorage.clearCurrentTenant();
          emit(const AuthUnauthenticated());
        }
      } else {
        _debugLog('No refresh token - routing to login');
        emit(const AuthUnauthenticated());
      }
    } catch (e) {
      _debugLog('Bootstrap error: $e - routing to login');
      await _tokenStorage.clearTokens();
      await _tenantStorage.clearCurrentTenant();
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    final result = await _loginUseCase(LoginParams(
      email: event.email,
      password: event.password,
      tenantId: event.tenantId,
    ));

    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (authResult) => emit(AuthAuthenticated(user: authResult.user, isBootstrapped: true)),
    );
  }

  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    await _logoutUseCase();
    await _tenantStorage.clearCurrentTenant();
    emit(const AuthUnauthenticated());
  }

  Future<void> _onTokenRefreshRequested(
    AuthTokenRefreshRequested event,
    Emitter<AuthState> emit,
  ) async {
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken == null) {
      emit(const AuthUnauthenticated());
      return;
    }

    final result = await _refreshTokenUseCase(refreshToken);
    result.fold(
      (failure) {
        _tokenStorage.clearTokens();
        _tenantStorage.clearCurrentTenant();
        emit(const AuthUnauthenticated());
      },
      (tokens) {
        // Tokens are saved by the refresh use case
      },
    );
  }
}
