import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/storage/token_storage.dart';
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

  AuthBloc({
    required LoginUseCase loginUseCase,
    required LogoutUseCase logoutUseCase,
    required RefreshTokenUseCase refreshTokenUseCase,
    required TokenStorage tokenStorage,
  })  : _loginUseCase = loginUseCase,
        _logoutUseCase = logoutUseCase,
        _refreshTokenUseCase = refreshTokenUseCase,
        _tokenStorage = tokenStorage,
        super(const AuthInitial()) {
    on<AuthCheckRequested>(_onAuthCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
    on<AuthTokenRefreshRequested>(_onTokenRefreshRequested);
  }

  Future<void> _onAuthCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    final hasValidTokens = await _tokenStorage.hasValidTokens();
    
    if (hasValidTokens) {
      final payload = await _tokenStorage.decodeAccessToken();
      if (payload != null) {
        emit(AuthAuthenticated(
          user: User(
            id: payload['userId'] as String? ?? '',
            email: payload['email'] as String? ?? '',
            role: payload['role'] as String? ?? 'user',
          ),
        ));
        return;
      }
    }

    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken != null) {
      final result = await _refreshTokenUseCase(refreshToken);
      result.fold(
        (failure) => emit(const AuthUnauthenticated()),
        (tokens) async {
          final payload = await _tokenStorage.decodeAccessToken();
          if (payload != null) {
            emit(AuthAuthenticated(
              user: User(
                id: payload['userId'] as String? ?? '',
                email: payload['email'] as String? ?? '',
                role: payload['role'] as String? ?? 'user',
              ),
            ));
          } else {
            emit(const AuthUnauthenticated());
          }
        },
      );
    } else {
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
      (authResult) => emit(AuthAuthenticated(user: authResult.user)),
    );
  }

  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(const AuthLoading());

    await _logoutUseCase();
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
        emit(const AuthUnauthenticated());
      },
      (tokens) {
      },
    );
  }
}
