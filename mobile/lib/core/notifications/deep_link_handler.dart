import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';

import '../storage/tenant_storage.dart';
import 'notification_model.dart';

class DeepLinkHandler {
  GoRouter? _router;
  final TenantStorage _tenantStorage;

  DeepLinkHandler({
    required TenantStorage tenantStorage,
  }) : _tenantStorage = tenantStorage;

  /// Set the router instance after app initialization
  void setRouter(GoRouter router) {
    _router = router;
  }

  Future<void> handleNotification(NotificationModel notification) async {
    if (_router == null) {
      debugPrint('DeepLinkHandler: Router not set yet, ignoring notification');
      return;
    }
    
    debugPrint('Handling notification deep link: ${notification.deepLink}');

    if (notification.tenantId != null) {
      final currentTenantId = await _tenantStorage.getCurrentTenantId();
      if (currentTenantId != notification.tenantId) {
        debugPrint('Notification for different tenant: ${notification.tenantId}');
        return;
      }
    }

    if (notification.deepLink != null) {
      _router!.go(notification.deepLink!);
      return;
    }

    if (notification.targetModule != null) {
      _navigateToModule(notification);
    }
  }

  void _navigateToModule(NotificationModel notification) {
    if (_router == null) return;
    
    final module = notification.targetModule!;
    final targetId = notification.targetId;

    String route;
    
    switch (module) {
      case 'booking':
      case 'bookings':
        route = targetId != null ? '/bookings/$targetId' : '/bookings';
        break;
        
      case 'appointment':
      case 'appointments':
        route = targetId != null ? '/appointments/$targetId' : '/appointments';
        break;
        
      case 'customer':
      case 'customers':
        route = targetId != null ? '/customers/$targetId' : '/customers';
        break;
        
      case 'patient':
      case 'patients':
        route = targetId != null ? '/patients/$targetId' : '/patients';
        break;
        
      case 'invoice':
      case 'invoices':
        route = targetId != null ? '/invoices/$targetId' : '/invoices';
        break;
        
      case 'payment':
      case 'payments':
        route = targetId != null ? '/payments/$targetId' : '/invoices';
        break;
        
      case 'membership':
      case 'memberships':
        route = targetId != null ? '/memberships/$targetId' : '/memberships';
        break;
        
      case 'room':
      case 'rooms':
        route = targetId != null ? '/rooms/$targetId' : '/rooms';
        break;
        
      case 'service':
      case 'services':
        route = targetId != null ? '/services/$targetId' : '/services';
        break;
        
      case 'order':
      case 'orders':
        route = targetId != null ? '/orders/$targetId' : '/orders';
        break;
        
      case 'inventory':
        route = targetId != null ? '/inventory/$targetId' : '/inventory';
        break;
        
      case 'report':
      case 'reports':
        route = '/reports';
        break;
        
      case 'settings':
        route = '/settings';
        break;
        
      case 'chat':
        route = targetId != null ? '/chat/$targetId' : '/chat';
        break;
        
      case 'compliance':
        route = '/compliance';
        break;
        
      default:
        route = '/dashboard';
    }

    debugPrint('Navigating to: $route');
    _router!.go(route);
  }

  void handleDeepLinkUri(Uri uri) {
    if (_router == null) {
      debugPrint('DeepLinkHandler: Router not set yet, ignoring deep link');
      return;
    }
    
    debugPrint('Handling deep link URI: $uri');
    
    final path = uri.path;
    final queryParams = uri.queryParameters;

    if (queryParams.containsKey('tenantId')) {
      _tenantStorage.setCurrentTenantId(queryParams['tenantId']!);
    }

    _router!.go(path);
  }

  static String buildDeepLink({
    required String module,
    String? targetId,
    String? tenantId,
    Map<String, String>? params,
  }) {
    final buffer = StringBuffer('/');
    buffer.write(module);
    
    if (targetId != null) {
      buffer.write('/$targetId');
    }

    final queryParams = <String, String>{};
    if (tenantId != null) {
      queryParams['tenantId'] = tenantId;
    }
    if (params != null) {
      queryParams.addAll(params);
    }

    if (queryParams.isNotEmpty) {
      buffer.write('?');
      buffer.write(queryParams.entries
          .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
          .join('&'));
    }

    return buffer.toString();
  }
}
