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
    _debugLog('=== BOOTSTRAP START ===');
    emit(const AuthLoading());

    try {
      // Step 1: Load tokens from secure storage
      _debugLog('Step 1: Loading tokens from storage...');
      final accessToken = await _tokenStorage.getAccessToken();
      final refreshToken = await _tokenStorage.getRefreshToken();
      
      _debugLog('Step 1 Result: accessToken=${accessToken != null ? "EXISTS (${accessToken.length} chars)" : "NULL"}, refreshToken=${refreshToken != null ? "EXISTS" : "NULL"}');

      if (accessToken == null && refreshToken == null) {
        _debugLog('=== BOOTSTRAP END: No tokens - UNAUTHENTICATED ===');
        emit(const AuthUnauthenticated());
        return;
      }

      // Step 2: Validate access token
      _debugLog('Step 2: Validating access token...');
      final hasValidTokens = await _tokenStorage.hasValidTokens();
      _debugLog('Step 2 Result: hasValidTokens=$hasValidTokens');
      
      if (hasValidTokens) {
        final payload = await _tokenStorage.decodeAccessToken();
        _debugLog('Step 2 Payload: ${payload?.keys.join(", ") ?? "NULL"}');
        
        if (payload != null) {
          final userId = payload['userId'] as String? ?? payload['sub'] as String? ?? '';
          final email = payload['email'] as String? ?? '';
          final role = payload['role'] as String? ?? 'user';
          
          final user = User(id: userId, email: email, role: role);
          _debugLog('=== BOOTSTRAP END: Valid token - AUTHENTICATED as $email ===');
          emit(AuthAuthenticated(user: user, isBootstrapped: true));
          return;
        }
      }

      // Step 3: Try to refresh token
      if (refreshToken != null) {
        _debugLog('Step 3: Access token expired/invalid - attempting refresh...');
        final result = await _refreshTokenUseCase(refreshToken);
        
        final isSuccess = result.isRight();
        _debugLog('Step 3 Result: refresh ${isSuccess ? "SUCCESS" : "FAILED"}');

        if (!isSuccess) {
          final failure = result.fold((l) => l.message, (r) => '');
          _debugLog('Step 3 Failure reason: $failure');
          _debugLog('Clearing tokens and tenant...');
          await _tokenStorage.clearTokens();
          await _tenantStorage.clearCurrentTenant();
          _debugLog('=== BOOTSTRAP END: Refresh failed - UNAUTHENTICATED ===');
          emit(const AuthUnauthenticated());
          return;
        }

        // Step 4: Decode refreshed token
        _debugLog('Step 4: Decoding refreshed token...');
        final payload = await _tokenStorage.decodeAccessToken();
        _debugLog('Step 4 Payload: ${payload?.keys.join(", ") ?? "NULL"}');
        
        if (payload != null) {
          final userId = payload['userId'] as String? ?? payload['sub'] as String? ?? '';
          final email = payload['email'] as String? ?? '';
          final role = payload['role'] as String? ?? 'user';
          
          final user = User(id: userId, email: email, role: role);
          _debugLog('=== BOOTSTRAP END: Refreshed - AUTHENTICATED as $email ===');
          emit(AuthAuthenticated(user: user, isBootstrapped: true));
        } else {
          _debugLog('Step 4: Failed to decode - clearing tokens');
          await _tokenStorage.clearTokens();
          await _tenantStorage.clearCurrentTenant();
          _debugLog('=== BOOTSTRAP END: Decode failed - UNAUTHENTICATED ===');
          emit(const AuthUnauthenticated());
        }
      } else {
        _debugLog('=== BOOTSTRAP END: No refresh token - UNAUTHENTICATED ===');
        emit(const AuthUnauthenticated());
      }
    } catch (e, stackTrace) {
      _debugLog('=== BOOTSTRAP ERROR: $e ===');
      _debugLog('Stack trace: $stackTrace');
      try {
        await _tokenStorage.clearTokens();
        await _tenantStorage.clearCurrentTenant();
      } catch (cleanupError) {
        _debugLog('Cleanup error: $cleanupError');
      }
      _debugLog('=== BOOTSTRAP END: Error - UNAUTHENTICATED ===');
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
