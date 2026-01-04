import 'dart:async';
import 'package:flutter/foundation.dart';

import '../network/api_client.dart';
import '../network/api_exceptions.dart';
import 'database_helper.dart';
import 'connectivity_service.dart';

enum SyncStatus { idle, syncing, error, completed }

enum ConflictResolution { serverWins, clientWins, merge, manual }

class SyncService {
  final ApiClient _apiClient;
  final DatabaseHelper _database;
  final ConnectivityService _connectivity;

  final _syncStatusController = StreamController<SyncStatus>.broadcast();
  final _syncProgressController = StreamController<SyncProgress>.broadcast();

  SyncStatus _currentStatus = SyncStatus.idle;
  Timer? _backgroundSyncTimer;
  bool _isSyncing = false;

  static const Duration _backgroundSyncInterval = Duration(minutes: 5);
  static const int _maxRetries = 3;
  static const Duration _cacheMaxAge = Duration(hours: 24);

  SyncService({
    required ApiClient apiClient,
    required DatabaseHelper database,
    required ConnectivityService connectivity,
  })  : _apiClient = apiClient,
        _database = database,
        _connectivity = connectivity {
    _connectivity.statusStream.listen(_onConnectivityChange);
  }

  SyncStatus get currentStatus => _currentStatus;
  Stream<SyncStatus> get syncStatusStream => _syncStatusController.stream;
  Stream<SyncProgress> get syncProgressStream => _syncProgressController.stream;

  void startBackgroundSync() {
    _backgroundSyncTimer?.cancel();
    _backgroundSyncTimer = Timer.periodic(_backgroundSyncInterval, (_) {
      if (_connectivity.isOnline) {
        syncAll();
      }
    });
  }

  void stopBackgroundSync() {
    _backgroundSyncTimer?.cancel();
    _backgroundSyncTimer = null;
  }

  void _onConnectivityChange(ConnectionStatus status) {
    if (status == ConnectionStatus.online && !_isSyncing) {
      syncAll();
    }
  }

  Future<void> syncAll() async {
    if (_isSyncing || !_connectivity.isOnline) return;

    _isSyncing = true;
    _updateStatus(SyncStatus.syncing);

    try {
      final operations = _database.getPendingSyncOperations();
      
      if (operations.isEmpty) {
        _updateStatus(SyncStatus.completed);
        _isSyncing = false;
        return;
      }

      int completed = 0;
      int failed = 0;

      for (final operation in operations) {
        _syncProgressController.add(SyncProgress(
          total: operations.length,
          completed: completed,
          failed: failed,
          currentEntity: operation.entityType,
        ));

        try {
          await _processOperation(operation);
          await _database.removeSyncOperation(operation.key);
          completed++;
        } catch (e) {
          debugPrint('Sync failed for ${operation.key}: $e');
          
          if (operation.retryCount < _maxRetries) {
            final updatedOp = operation.copyWith(retryCount: operation.retryCount + 1);
            await _database.addToSyncQueue(updatedOp);
          } else {
            failed++;
          }
        }
      }

      _syncProgressController.add(SyncProgress(
        total: operations.length,
        completed: completed,
        failed: failed,
        currentEntity: null,
      ));

      _updateStatus(failed > 0 ? SyncStatus.error : SyncStatus.completed);
    } catch (e) {
      debugPrint('Sync error: $e');
      _updateStatus(SyncStatus.error);
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _processOperation(SyncOperation operation) async {
    final endpoint = _getEndpoint(operation.entityType, operation.entityId);

    switch (operation.type) {
      case SyncOperationType.create:
        await _apiClient.post(endpoint, data: operation.data);
        break;
      case SyncOperationType.update:
        final serverData = await _fetchServerData(operation.entityType, operation.entityId);
        final resolvedData = await _resolveConflict(operation, serverData);
        if (resolvedData != null) {
          await _apiClient.put('$endpoint/${operation.entityId}', data: resolvedData);
        }
        break;
      case SyncOperationType.delete:
        await _apiClient.delete('$endpoint/${operation.entityId}');
        break;
    }

    await _database.setLastSyncTime(operation.entityType, DateTime.now());
  }

  Future<Map<String, dynamic>?> _fetchServerData(String entityType, String entityId) async {
    try {
      final endpoint = _getEndpoint(entityType, entityId);
      final response = await _apiClient.get('$endpoint/$entityId');
      return response.data as Map<String, dynamic>?;
    } catch (e) {
      if (e is NotFoundException) return null;
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> _resolveConflict(
    SyncOperation operation,
    Map<String, dynamic>? serverData,
  ) async {
    if (serverData == null) {
      return operation.data;
    }

    final serverUpdatedAt = DateTime.tryParse(serverData['updatedAt'] as String? ?? '');
    final clientUpdatedAt = operation.timestamp;

    final resolution = ConflictResolution.values.firstWhere(
      (r) => r.name == operation.conflictResolution,
      orElse: () => ConflictResolution.serverWins,
    );

    switch (resolution) {
      case ConflictResolution.serverWins:
        if (serverUpdatedAt != null && serverUpdatedAt.isAfter(clientUpdatedAt)) {
          return null;
        }
        return operation.data;

      case ConflictResolution.clientWins:
        return operation.data;

      case ConflictResolution.merge:
        return _mergeData(serverData, operation.data ?? {});

      case ConflictResolution.manual:
        return operation.data;
    }
  }

  Map<String, dynamic> _mergeData(
    Map<String, dynamic> serverData,
    Map<String, dynamic> clientData,
  ) {
    final merged = Map<String, dynamic>.from(serverData);
    
    clientData.forEach((key, value) {
      if (key != 'id' && key != 'createdAt' && key != 'updatedAt') {
        merged[key] = value;
      }
    });
    
    return merged;
  }

  String _getEndpoint(String entityType, String entityId) {
    switch (entityType) {
      case 'customer':
        return '/api/customers';
      case 'booking':
        return '/api/bookings';
      case 'invoice':
        return '/api/invoices';
      case 'patient':
        return '/api/patients';
      case 'appointment':
        return '/api/appointments';
      default:
        return '/api/$entityType';
    }
  }

  Future<T> fetchWithCache<T>({
    required String cacheKey,
    required Future<T> Function() fetcher,
    required T Function(Map<String, dynamic>) fromJson,
    Duration maxAge = _cacheMaxAge,
  }) async {
    if (_connectivity.isOnline) {
      try {
        final data = await fetcher();
        if (data is Map<String, dynamic>) {
          await _database.cacheData(cacheKey, data);
        }
        return data;
      } catch (e) {
        debugPrint('Fetch failed, trying cache: $e');
      }
    }

    final cached = _database.getCachedData(cacheKey);
    if (cached != null) {
      return fromJson(cached);
    }

    throw const NetworkException('No internet connection and no cached data available');
  }

  Future<List<T>> fetchListWithCache<T>({
    required String cacheKey,
    required Future<List<Map<String, dynamic>>> Function() fetcher,
    required T Function(Map<String, dynamic>) fromJson,
    Duration maxAge = _cacheMaxAge,
  }) async {
    if (_connectivity.isOnline) {
      try {
        final dataList = await fetcher();
        await _database.cacheList(cacheKey, dataList);
        return dataList.map(fromJson).toList();
      } catch (e) {
        debugPrint('Fetch list failed, trying cache: $e');
      }
    }

    final cached = _database.getCachedList(cacheKey);
    if (cached != null) {
      return cached.map(fromJson).toList();
    }

    throw const NetworkException('No internet connection and no cached data available');
  }

  Future<void> queueCreate(String entityType, String entityId, Map<String, dynamic> data) async {
    await _database.addToSyncQueue(SyncOperation(
      key: '${entityType}_${entityId}_create',
      type: SyncOperationType.create,
      entityType: entityType,
      entityId: entityId,
      data: data,
      timestamp: DateTime.now(),
    ));
  }

  Future<void> queueUpdate(
    String entityType,
    String entityId,
    Map<String, dynamic> data, {
    ConflictResolution resolution = ConflictResolution.serverWins,
  }) async {
    await _database.addToSyncQueue(SyncOperation(
      key: '${entityType}_${entityId}_update',
      type: SyncOperationType.update,
      entityType: entityType,
      entityId: entityId,
      data: data,
      timestamp: DateTime.now(),
      conflictResolution: resolution.name,
    ));
  }

  Future<void> queueDelete(String entityType, String entityId) async {
    await _database.addToSyncQueue(SyncOperation(
      key: '${entityType}_${entityId}_delete',
      type: SyncOperationType.delete,
      entityType: entityType,
      entityId: entityId,
      timestamp: DateTime.now(),
    ));
  }

  void _updateStatus(SyncStatus status) {
    _currentStatus = status;
    _syncStatusController.add(status);
  }

  void dispose() {
    stopBackgroundSync();
    _syncStatusController.close();
    _syncProgressController.close();
  }
}

class SyncProgress {
  final int total;
  final int completed;
  final int failed;
  final String? currentEntity;

  SyncProgress({
    required this.total,
    required this.completed,
    required this.failed,
    this.currentEntity,
  });

  double get percentage => total > 0 ? completed / total : 0;
  bool get isComplete => completed + failed >= total;
}
