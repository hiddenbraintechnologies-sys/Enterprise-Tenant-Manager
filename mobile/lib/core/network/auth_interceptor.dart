import 'dart:async';
import 'package:dio/dio.dart';

import '../storage/token_storage.dart';
import 'api_exceptions.dart';

class AuthInterceptor extends Interceptor {
  final TokenStorage _tokenStorage;
  bool _isRefreshing = false;
  final List<Function(String)> _pendingRequests = [];

  static const _noAuthPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ];

  AuthInterceptor(this._tokenStorage);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (_shouldSkipAuth(options.path)) {
      return handler.next(options);
    }

    final accessToken = await _tokenStorage.getAccessToken();
    if (accessToken != null) {
      options.headers['Authorization'] = 'Bearer $accessToken';
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    if (error.response?.statusCode != 401) {
      return handler.next(error);
    }

    if (_shouldSkipAuth(error.requestOptions.path)) {
      return handler.next(error);
    }

    if (_isRefreshing) {
      final completer = Completer<String>();
      _pendingRequests.add((token) => completer.complete(token));
      
      try {
        final newToken = await completer.future;
        final response = await _retryRequest(error.requestOptions, newToken);
        return handler.resolve(response);
      } catch (e) {
        return handler.next(error);
      }
    }

    _isRefreshing = true;

    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken == null) {
        throw const TokenExpiredException();
      }

      final dio = Dio(BaseOptions(
        baseUrl: error.requestOptions.baseUrl,
        headers: {'Content-Type': 'application/json'},
      ));

      final response = await dio.post(
        '/api/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      final newAccessToken = response.data['accessToken'] as String;
      final newRefreshToken = response.data['refreshToken'] as String?;

      await _tokenStorage.saveTokens(
        accessToken: newAccessToken,
        refreshToken: newRefreshToken ?? refreshToken,
      );

      for (final callback in _pendingRequests) {
        callback(newAccessToken);
      }
      _pendingRequests.clear();

      final retryResponse = await _retryRequest(error.requestOptions, newAccessToken);
      handler.resolve(retryResponse);
    } catch (e) {
      await _tokenStorage.clearTokens();
      
      for (final callback in _pendingRequests) {
        callback('');
      }
      _pendingRequests.clear();
      
      handler.reject(
        DioException(
          requestOptions: error.requestOptions,
          error: const TokenExpiredException(),
        ),
      );
    } finally {
      _isRefreshing = false;
    }
  }

  bool _shouldSkipAuth(String path) {
    return _noAuthPaths.any((noAuthPath) => path.contains(noAuthPath));
  }

  Future<Response> _retryRequest(RequestOptions options, String token) async {
    final dio = Dio(BaseOptions(
      baseUrl: options.baseUrl,
      headers: {
        ...options.headers,
        'Authorization': 'Bearer $token',
      },
    ));

    return dio.request(
      options.path,
      data: options.data,
      queryParameters: options.queryParameters,
      options: Options(
        method: options.method,
        headers: options.headers,
      ),
    );
  }
}
