/// Core Services for MyBizStream Mobile
///
/// Provides shared infrastructure:
/// - Analytics tracking
/// - Subscription gating
/// - Notifications
/// - Network and storage
library core;

export 'analytics/analytics_service.dart';
export 'analytics/analytics_mixin.dart';
export 'subscription/subscription_gating_service.dart';
export 'subscription/module_guard.dart';
export 'network/api_client.dart';
export 'network/pagination.dart';
export 'storage/tenant_storage.dart';
export 'storage/token_storage.dart';
export 'notifications/notification_service.dart';
export 'di/injection.dart';
