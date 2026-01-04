import 'package:dartz/dartz.dart';

import '../network/api_exceptions.dart';
import 'sync_service.dart';
import 'connectivity_service.dart';
import 'database_helper.dart';

mixin OfflineRepositoryMixin {
  SyncService get syncService;
  ConnectivityService get connectivity;
  DatabaseHelper get database;

  bool get isOffline => connectivity.isOffline;
  bool get isOnline => connectivity.isOnline;

  Future<Either<ApiException, T>> fetchWithOfflineSupport<T>({
    required String cacheKey,
    required Future<T> Function() onlineAction,
    required T Function(Map<String, dynamic>) fromCache,
    required Map<String, dynamic> Function(T) toCache,
  }) async {
    try {
      if (isOnline) {
        final result = await onlineAction();
        await database.cacheData(cacheKey, toCache(result));
        return Right(result);
      } else {
        final cached = database.getCachedData(cacheKey);
        if (cached != null) {
          return Right(fromCache(cached));
        }
        return const Left(NetworkException('Offline and no cached data available'));
      }
    } on ApiException catch (e) {
      final cached = database.getCachedData(cacheKey);
      if (cached != null) {
        return Right(fromCache(cached));
      }
      return Left(e);
    } catch (e) {
      return Left(ApiException(e.toString()));
    }
  }

  Future<Either<ApiException, List<T>>> fetchListWithOfflineSupport<T>({
    required String cacheKey,
    required Future<List<T>> Function() onlineAction,
    required T Function(Map<String, dynamic>) itemFromCache,
    required Map<String, dynamic> Function(T) itemToCache,
  }) async {
    try {
      if (isOnline) {
        final result = await onlineAction();
        await database.cacheList(
          cacheKey,
          result.map(itemToCache).toList(),
        );
        return Right(result);
      } else {
        final cached = database.getCachedList(cacheKey);
        if (cached != null) {
          return Right(cached.map(itemFromCache).toList());
        }
        return const Left(NetworkException('Offline and no cached data available'));
      }
    } on ApiException catch (e) {
      final cached = database.getCachedList(cacheKey);
      if (cached != null) {
        return Right(cached.map(itemFromCache).toList());
      }
      return Left(e);
    } catch (e) {
      return Left(ApiException(e.toString()));
    }
  }

  Future<Either<ApiException, T>> createWithOfflineSupport<T>({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> data,
    required Future<T> Function() onlineAction,
    required T Function(Map<String, dynamic>) fromData,
  }) async {
    if (isOnline) {
      try {
        return Right(await onlineAction());
      } on ApiException catch (e) {
        return Left(e);
      }
    } else {
      await syncService.queueCreate(entityType, entityId, data);
      return Right(fromData(data));
    }
  }

  Future<Either<ApiException, T>> updateWithOfflineSupport<T>({
    required String entityType,
    required String entityId,
    required Map<String, dynamic> data,
    required Future<T> Function() onlineAction,
    required T Function(Map<String, dynamic>) fromData,
    ConflictResolution resolution = ConflictResolution.serverWins,
  }) async {
    if (isOnline) {
      try {
        return Right(await onlineAction());
      } on ApiException catch (e) {
        return Left(e);
      }
    } else {
      await syncService.queueUpdate(entityType, entityId, data, resolution: resolution);
      return Right(fromData(data));
    }
  }

  Future<Either<ApiException, void>> deleteWithOfflineSupport({
    required String entityType,
    required String entityId,
    required Future<void> Function() onlineAction,
  }) async {
    if (isOnline) {
      try {
        await onlineAction();
        return const Right(null);
      } on ApiException catch (e) {
        return Left(e);
      }
    } else {
      await syncService.queueDelete(entityType, entityId);
      return const Right(null);
    }
  }
}
