import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import 'auth_interceptor.dart';
import 'tenant_interceptor.dart';
import 'api_exceptions.dart';

class ApiClient {
  late final Dio _dio;
  final Logger _logger = Logger();

  ApiClient({
    required String baseUrl,
    required AuthInterceptor authInterceptor,
    required TenantInterceptor tenantInterceptor,
    Duration connectTimeout = const Duration(seconds: 30),
    Duration receiveTimeout = const Duration(seconds: 30),
    bool enableLogging = false,
  }) {
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: connectTimeout,
        receiveTimeout: receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      authInterceptor,
      tenantInterceptor,
      if (enableLogging) _loggingInterceptor(),
      _errorInterceptor(),
    ]);
  }

  Dio get dio => _dio;

  InterceptorsWrapper _loggingInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) {
        _logger.d('REQUEST[${options.method}] => PATH: ${options.path}');
        _logger.d('Headers: ${options.headers}');
        if (options.data != null) {
          _logger.d('Data: ${options.data}');
        }
        handler.next(options);
      },
      onResponse: (response, handler) {
        _logger.d('RESPONSE[${response.statusCode}] => PATH: ${response.requestOptions.path}');
        handler.next(response);
      },
      onError: (error, handler) {
        _logger.e('ERROR[${error.response?.statusCode}] => PATH: ${error.requestOptions.path}');
        _logger.e('Message: ${error.message}');
        handler.next(error);
      },
    );
  }

  InterceptorsWrapper _errorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) {
        final apiException = _handleError(error);
        handler.reject(
          DioException(
            requestOptions: error.requestOptions,
            error: apiException,
            response: error.response,
            type: error.type,
          ),
        );
      },
    );
  }

  ApiException _handleError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const NetworkException('Connection timeout. Please check your internet connection.');
      
      case DioExceptionType.connectionError:
        return const NetworkException('No internet connection. Please check your network settings.');
      
      case DioExceptionType.badResponse:
        return _handleStatusCode(error.response);
      
      case DioExceptionType.cancel:
        return const ApiException('Request was cancelled');
      
      default:
        return ApiException(error.message ?? 'An unexpected error occurred');
    }
  }

  ApiException _handleStatusCode(Response? response) {
    if (response == null) {
      return const ApiException('No response from server');
    }

    final data = response.data;
    final message = data is Map ? (data['message'] ?? data['error'] ?? 'Unknown error') : 'Unknown error';

    switch (response.statusCode) {
      case 400:
        return ValidationException(message, errors: data is Map ? data['errors'] : null);
      case 401:
        return UnauthorizedException(message);
      case 403:
        return ForbiddenException(message);
      case 404:
        return NotFoundException(message);
      case 409:
        return ConflictException(message);
      case 422:
        return ValidationException(message, errors: data is Map ? data['errors'] : null);
      case 429:
        return RateLimitException(message);
      case 500:
      case 502:
      case 503:
        return ServerException(message);
      default:
        return ApiException(message);
    }
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.get<T>(path, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.post<T>(path, data: data, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.put<T>(path, data: data, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.patch<T>(path, data: data, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return _dio.delete<T>(path, data: data, queryParameters: queryParameters, options: options);
  }
}
