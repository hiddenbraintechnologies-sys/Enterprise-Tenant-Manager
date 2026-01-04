import 'package:dartz/dartz.dart';

import '../network/api_exceptions.dart';

typedef Result<T> = Either<ApiException, T>;

extension ResultExtensions<T> on Result<T> {
  T? get valueOrNull => fold((_) => null, (value) => value);
  
  ApiException? get errorOrNull => fold((error) => error, (_) => null);
  
  bool get isSuccess => isRight();
  
  bool get isFailure => isLeft();
  
  Result<R> mapSuccess<R>(R Function(T value) mapper) {
    return fold(
      (error) => Left(error),
      (value) => Right(mapper(value)),
    );
  }
  
  Future<Result<R>> mapSuccessAsync<R>(Future<R> Function(T value) mapper) async {
    return fold(
      (error) => Left(error),
      (value) async => Right(await mapper(value)),
    );
  }
  
  T getOrElse(T Function() orElse) {
    return fold((_) => orElse(), (value) => value);
  }
  
  T getOrThrow() {
    return fold(
      (error) => throw error,
      (value) => value,
    );
  }
}
