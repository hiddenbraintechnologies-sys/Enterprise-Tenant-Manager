import 'dart:async';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';
import '../storage/tenant_storage.dart';

enum AnalyticsEventType {
  screenView,
  userAction,
  crudOperation,
  error,
  performance,
  conversion,
  engagement,
}

class AnalyticsEvent {
  final String name;
  final AnalyticsEventType type;
  final Map<String, dynamic>? properties;
  final DateTime timestamp;
  final String? userId;
  final String? tenantId;
  final String? module;

  AnalyticsEvent({
    required this.name,
    required this.type,
    this.properties,
    DateTime? timestamp,
    this.userId,
    this.tenantId,
    this.module,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'name': name,
    'type': type.name,
    'properties': properties,
    'timestamp': timestamp.toIso8601String(),
    'userId': userId,
    'tenantId': tenantId,
    'module': module,
  };
}

class AnalyticsService {
  final ApiClient _apiClient;
  final TenantStorage _tenantStorage;
  
  final List<AnalyticsEvent> _eventQueue = [];
  Timer? _flushTimer;
  bool _isInitialized = false;
  
  static const int _batchSize = 10;
  static const Duration _flushInterval = Duration(seconds: 30);

  AnalyticsService({
    required ApiClient apiClient,
    required TenantStorage tenantStorage,
  })  : _apiClient = apiClient,
        _tenantStorage = tenantStorage;

  Future<void> initialize() async {
    if (_isInitialized) return;
    
    _flushTimer = Timer.periodic(_flushInterval, (_) => flush());
    _isInitialized = true;
    
    debugPrint('[Analytics] Service initialized');
  }

  Future<void> trackScreenView({
    required String screenName,
    String? module,
    Map<String, dynamic>? properties,
  }) async {
    await _track(AnalyticsEvent(
      name: 'screen_view',
      type: AnalyticsEventType.screenView,
      module: module,
      properties: {
        'screen_name': screenName,
        ...?properties,
      },
    ));
  }

  Future<void> trackUserAction({
    required String action,
    String? module,
    Map<String, dynamic>? properties,
  }) async {
    await _track(AnalyticsEvent(
      name: action,
      type: AnalyticsEventType.userAction,
      module: module,
      properties: properties,
    ));
  }

  Future<void> trackCrudOperation({
    required String operation,
    required String entity,
    String? entityId,
    String? module,
    Map<String, dynamic>? properties,
  }) async {
    await _track(AnalyticsEvent(
      name: '${entity}_$operation',
      type: AnalyticsEventType.crudOperation,
      module: module,
      properties: {
        'entity': entity,
        'operation': operation,
        'entity_id': entityId,
        ...?properties,
      },
    ));
  }

  Future<void> trackError({
    required String errorType,
    required String message,
    String? stackTrace,
    String? module,
    Map<String, dynamic>? properties,
  }) async {
    await _track(AnalyticsEvent(
      name: 'error',
      type: AnalyticsEventType.error,
      module: module,
      properties: {
        'error_type': errorType,
        'message': message,
        'stack_trace': stackTrace,
        ...?properties,
      },
    ));
  }

  Future<void> trackModuleAccess({
    required String module,
    required bool allowed,
    String? reason,
  }) async {
    await _track(AnalyticsEvent(
      name: 'module_access',
      type: AnalyticsEventType.engagement,
      module: module,
      properties: {
        'module': module,
        'allowed': allowed,
        'reason': reason,
      },
    ));
  }

  Future<void> trackSubscriptionEvent({
    required String event,
    String? tier,
    Map<String, dynamic>? properties,
  }) async {
    await _track(AnalyticsEvent(
      name: 'subscription_$event',
      type: AnalyticsEventType.conversion,
      properties: {
        'tier': tier,
        ...?properties,
      },
    ));
  }

  Future<void> _track(AnalyticsEvent event) async {
    final tenantId = await _tenantStorage.getCurrentTenantId();
    
    final enrichedEvent = AnalyticsEvent(
      name: event.name,
      type: event.type,
      properties: event.properties,
      timestamp: event.timestamp,
      userId: event.userId,
      tenantId: tenantId ?? event.tenantId,
      module: event.module,
    );
    
    _eventQueue.add(enrichedEvent);
    
    if (_eventQueue.length >= _batchSize) {
      await flush();
    }
  }

  Future<void> flush() async {
    if (_eventQueue.isEmpty) return;
    
    final events = List<AnalyticsEvent>.from(_eventQueue);
    _eventQueue.clear();
    
    try {
      await _apiClient.post('/api/analytics/events', data: {
        'events': events.map((e) => e.toJson()).toList(),
      });
      debugPrint('[Analytics] Flushed ${events.length} events');
    } catch (e) {
      debugPrint('[Analytics] Error flushing events: $e');
      _eventQueue.addAll(events);
    }
  }

  void dispose() {
    _flushTimer?.cancel();
    flush();
  }
}
