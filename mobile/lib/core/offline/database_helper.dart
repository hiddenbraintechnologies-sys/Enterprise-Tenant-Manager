import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';

class DatabaseHelper {
  static const String _syncQueueBox = 'sync_queue';
  static const String _cacheBox = 'cache';
  static const String _metadataBox = 'metadata';

  static DatabaseHelper? _instance;
  static DatabaseHelper get instance => _instance ??= DatabaseHelper._();

  DatabaseHelper._();

  Box<Map>? _syncQueue;
  Box<Map>? _cache;
  Box<dynamic>? _metadata;

  Future<void> initialize() async {
    _syncQueue = await Hive.openBox<Map>(_syncQueueBox);
    _cache = await Hive.openBox<Map>(_cacheBox);
    _metadata = await Hive.openBox<dynamic>(_metadataBox);
  }

  Future<void> cacheData(String key, Map<String, dynamic> data) async {
    await _cache?.put(key, {
      'data': data,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  Future<void> cacheList(String key, List<Map<String, dynamic>> dataList) async {
    await _cache?.put(key, {
      'data': dataList,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  Map<String, dynamic>? getCachedData(String key) {
    final cached = _cache?.get(key);
    if (cached == null) return null;
    return Map<String, dynamic>.from(cached['data'] as Map);
  }

  List<Map<String, dynamic>>? getCachedList(String key) {
    final cached = _cache?.get(key);
    if (cached == null) return null;
    final data = cached['data'];
    if (data is List) {
      return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return null;
  }

  DateTime? getCacheTimestamp(String key) {
    final cached = _cache?.get(key);
    if (cached == null) return null;
    final timestamp = cached['timestamp'] as String?;
    if (timestamp == null) return null;
    return DateTime.tryParse(timestamp);
  }

  bool isCacheValid(String key, Duration maxAge) {
    final timestamp = getCacheTimestamp(key);
    if (timestamp == null) return false;
    return DateTime.now().difference(timestamp) < maxAge;
  }

  Future<void> clearCache(String key) async {
    await _cache?.delete(key);
  }

  Future<void> clearAllCache() async {
    await _cache?.clear();
  }

  Future<void> addToSyncQueue(SyncOperation operation) async {
    final key = '${operation.type}_${operation.entityId}_${DateTime.now().millisecondsSinceEpoch}';
    await _syncQueue?.put(key, operation.toMap());
  }

  List<SyncOperation> getPendingSyncOperations() {
    final operations = <SyncOperation>[];
    _syncQueue?.toMap().forEach((key, value) {
      try {
        operations.add(SyncOperation.fromMap(key.toString(), Map<String, dynamic>.from(value)));
      } catch (e) {
        debugPrint('Error parsing sync operation: $e');
      }
    });
    operations.sort((a, b) => a.timestamp.compareTo(b.timestamp));
    return operations;
  }

  Future<void> removeSyncOperation(String key) async {
    await _syncQueue?.delete(key);
  }

  Future<void> clearSyncQueue() async {
    await _syncQueue?.clear();
  }

  Future<void> setMetadata(String key, dynamic value) async {
    await _metadata?.put(key, value);
  }

  T? getMetadata<T>(String key) {
    return _metadata?.get(key) as T?;
  }

  DateTime? getLastSyncTime(String entityType) {
    final timestamp = getMetadata<String>('lastSync_$entityType');
    if (timestamp == null) return null;
    return DateTime.tryParse(timestamp);
  }

  Future<void> setLastSyncTime(String entityType, DateTime time) async {
    await setMetadata('lastSync_$entityType', time.toIso8601String());
  }

  Future<void> close() async {
    await _syncQueue?.close();
    await _cache?.close();
    await _metadata?.close();
  }
}

enum SyncOperationType { create, update, delete }

class SyncOperation {
  final String key;
  final SyncOperationType type;
  final String entityType;
  final String entityId;
  final Map<String, dynamic>? data;
  final DateTime timestamp;
  final int retryCount;
  final String? conflictResolution;

  SyncOperation({
    required this.key,
    required this.type,
    required this.entityType,
    required this.entityId,
    this.data,
    required this.timestamp,
    this.retryCount = 0,
    this.conflictResolution,
  });

  Map<String, dynamic> toMap() {
    return {
      'type': type.name,
      'entityType': entityType,
      'entityId': entityId,
      'data': data,
      'timestamp': timestamp.toIso8601String(),
      'retryCount': retryCount,
      'conflictResolution': conflictResolution,
    };
  }

  factory SyncOperation.fromMap(String key, Map<String, dynamic> map) {
    return SyncOperation(
      key: key,
      type: SyncOperationType.values.firstWhere(
        (e) => e.name == map['type'],
        orElse: () => SyncOperationType.update,
      ),
      entityType: map['entityType'] as String,
      entityId: map['entityId'] as String,
      data: map['data'] != null ? Map<String, dynamic>.from(map['data'] as Map) : null,
      timestamp: DateTime.parse(map['timestamp'] as String),
      retryCount: map['retryCount'] as int? ?? 0,
      conflictResolution: map['conflictResolution'] as String?,
    );
  }

  SyncOperation copyWith({int? retryCount, String? conflictResolution}) {
    return SyncOperation(
      key: key,
      type: type,
      entityType: entityType,
      entityId: entityId,
      data: data,
      timestamp: timestamp,
      retryCount: retryCount ?? this.retryCount,
      conflictResolution: conflictResolution ?? this.conflictResolution,
    );
  }
}
