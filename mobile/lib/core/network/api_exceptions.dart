class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  const ApiException(this.message, {this.statusCode, this.data});

  @override
  String toString() => message;
}

class NetworkException extends ApiException {
  const NetworkException(super.message);
}

class UnauthorizedException extends ApiException {
  const UnauthorizedException(super.message) : super(statusCode: 401);
}

class ForbiddenException extends ApiException {
  const ForbiddenException(super.message) : super(statusCode: 403);
}

class NotFoundException extends ApiException {
  const NotFoundException(super.message) : super(statusCode: 404);
}

class ConflictException extends ApiException {
  const ConflictException(super.message) : super(statusCode: 409);
}

class ValidationException extends ApiException {
  final Map<String, dynamic>? errors;

  const ValidationException(super.message, {this.errors}) : super(statusCode: 422);

  String? getFieldError(String field) {
    if (errors == null) return null;
    final fieldErrors = errors![field];
    if (fieldErrors is List && fieldErrors.isNotEmpty) {
      return fieldErrors.first.toString();
    }
    if (fieldErrors is String) {
      return fieldErrors;
    }
    return null;
  }
}

class RateLimitException extends ApiException {
  const RateLimitException(super.message) : super(statusCode: 429);
}

class ServerException extends ApiException {
  const ServerException(super.message) : super(statusCode: 500);
}

class TokenExpiredException extends ApiException {
  const TokenExpiredException() : super('Session expired. Please login again.');
}
