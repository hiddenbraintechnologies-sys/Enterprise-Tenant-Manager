import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../network/api_client.dart';
import '../storage/tenant_storage.dart';
import 'notification_model.dart';
import 'notification_preferences.dart';
import 'deep_link_handler.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('Background message received: ${message.messageId}');
}

class NotificationService {
  final ApiClient _apiClient;
  final TenantStorage _tenantStorage;
  final DeepLinkHandler _deepLinkHandler;
  final NotificationPreferences _preferences;
  
  late final FirebaseMessaging _messaging;
  late final FlutterLocalNotificationsPlugin _localNotifications;
  
  final _notificationController = StreamController<NotificationModel>.broadcast();
  
  String? _fcmToken;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<RemoteMessage>? _openedAppSubscription;

  NotificationService({
    required ApiClient apiClient,
    required TenantStorage tenantStorage,
    required DeepLinkHandler deepLinkHandler,
    required NotificationPreferences preferences,
  })  : _apiClient = apiClient,
        _tenantStorage = tenantStorage,
        _deepLinkHandler = deepLinkHandler,
        _preferences = preferences;

  String? get fcmToken => _fcmToken;
  Stream<NotificationModel> get notificationStream => _notificationController.stream;

  Future<void> initialize() async {
    _messaging = FirebaseMessaging.instance;
    _localNotifications = FlutterLocalNotificationsPlugin();
    
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    
    await _requestPermissions();
    await _initializeLocalNotifications();
    await _configureForegroundNotifications();
    await _getToken();
    
    _setupMessageHandlers();
  }

  Future<void> _requestPermissions() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
    );
    
    debugPrint('Notification permission: ${settings.authorizationStatus}');
  }

  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    
    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    
    await _localNotifications.initialize(
      settings,
      onDidReceiveNotificationResponse: _handleNotificationTap,
    );
  }

  Future<void> _configureForegroundNotifications() async {
    await _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  Future<void> _getToken() async {
    try {
      _fcmToken = await _messaging.getToken();
      debugPrint('FCM Token: $_fcmToken');
      
      if (_fcmToken != null) {
        await _registerTokenWithServer(_fcmToken!);
      }
      
      _messaging.onTokenRefresh.listen((newToken) async {
        _fcmToken = newToken;
        await _registerTokenWithServer(newToken);
      });
    } catch (e) {
      debugPrint('Error getting FCM token: $e');
    }
  }

  Future<void> _registerTokenWithServer(String token) async {
    try {
      final tenantId = await _tenantStorage.getCurrentTenantId();
      
      await _apiClient.post('/api/notifications/register-device', data: {
        'fcmToken': token,
        'platform': defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android',
        'tenantId': tenantId,
      });
      
      debugPrint('FCM token registered with server');
    } catch (e) {
      debugPrint('Error registering FCM token: $e');
    }
  }

  void _setupMessageHandlers() {
    _foregroundSubscription = FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    
    _openedAppSubscription = FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);
    
    _checkInitialMessage();
  }

  Future<void> _checkInitialMessage() async {
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageOpenedApp(initialMessage);
    }
  }

  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('Foreground message: ${message.messageId}');
    
    final notification = NotificationModel.fromRemoteMessage(message);
    _notificationController.add(notification);
    
    if (_preferences.shouldShowNotification(notification.type)) {
      _showLocalNotification(notification);
    }
  }

  void _handleMessageOpenedApp(RemoteMessage message) {
    debugPrint('Message opened app: ${message.messageId}');
    
    final notification = NotificationModel.fromRemoteMessage(message);
    _notificationController.add(notification);
    
    _deepLinkHandler.handleNotification(notification);
  }

  void _handleNotificationTap(NotificationResponse response) {
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!) as Map<String, dynamic>;
        final notification = NotificationModel.fromData(data);
        _deepLinkHandler.handleNotification(notification);
      } catch (e) {
        debugPrint('Error parsing notification payload: $e');
      }
    }
  }

  Future<void> _showLocalNotification(NotificationModel notification) async {
    const androidDetails = AndroidNotificationDetails(
      'bizflow_default',
      'BizFlow Notifications',
      channelDescription: 'Default notification channel for BizFlow',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );
    
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );
    
    await _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      details,
      payload: jsonEncode(notification.toJson()),
    );
  }

  Future<void> subscribeToTenant(String tenantId) async {
    await _messaging.subscribeToTopic('tenant_$tenantId');
    debugPrint('Subscribed to tenant topic: tenant_$tenantId');
  }

  Future<void> unsubscribeFromTenant(String tenantId) async {
    await _messaging.unsubscribeFromTopic('tenant_$tenantId');
    debugPrint('Unsubscribed from tenant topic: tenant_$tenantId');
  }

  Future<void> subscribeToRole(String tenantId, String role) async {
    await _messaging.subscribeToTopic('${tenantId}_role_$role');
    debugPrint('Subscribed to role topic: ${tenantId}_role_$role');
  }

  Future<void> subscribeToModule(String tenantId, String module) async {
    await _messaging.subscribeToTopic('${tenantId}_module_$module');
    debugPrint('Subscribed to module topic: ${tenantId}_module_$module');
  }

  Future<void> updateTenantSubscription(String? oldTenantId, String newTenantId) async {
    if (oldTenantId != null && oldTenantId != newTenantId) {
      await unsubscribeFromTenant(oldTenantId);
    }
    await subscribeToTenant(newTenantId);
    
    if (_fcmToken != null) {
      await _registerTokenWithServer(_fcmToken!);
    }
  }

  void dispose() {
    _foregroundSubscription?.cancel();
    _openedAppSubscription?.cancel();
    _notificationController.close();
  }
}
