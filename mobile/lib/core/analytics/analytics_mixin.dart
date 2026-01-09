import 'package:flutter/widgets.dart';
import 'analytics_service.dart';

mixin AnalyticsMixin<T extends StatefulWidget> on State<T> {
  AnalyticsService? _analyticsService;

  void initAnalytics(AnalyticsService analyticsService) {
    _analyticsService = analyticsService;
  }

  void trackScreenView(String screenName, {String? module, Map<String, dynamic>? properties}) {
    _analyticsService?.trackScreenView(
      screenName: screenName,
      module: module,
      properties: properties,
    );
  }

  void trackAction(String action, {String? module, Map<String, dynamic>? properties}) {
    _analyticsService?.trackUserAction(
      action: action,
      module: module,
      properties: properties,
    );
  }

  void trackCrud({
    required String operation,
    required String entity,
    String? entityId,
    String? module,
    Map<String, dynamic>? properties,
  }) {
    _analyticsService?.trackCrudOperation(
      operation: operation,
      entity: entity,
      entityId: entityId,
      module: module,
      properties: properties,
    );
  }
}

mixin BlocAnalyticsMixin {
  AnalyticsService? analyticsService;

  void trackBlocEvent(String eventName, {String? module, Map<String, dynamic>? properties}) {
    analyticsService?.trackUserAction(
      action: eventName,
      module: module,
      properties: properties,
    );
  }

  void trackBlocCrud({
    required String operation,
    required String entity,
    String? entityId,
    String? module,
  }) {
    analyticsService?.trackCrudOperation(
      operation: operation,
      entity: entity,
      entityId: entityId,
      module: module,
    );
  }

  void trackBlocError(String errorType, String message, {String? module, String? stackTrace}) {
    analyticsService?.trackError(
      errorType: errorType,
      message: message,
      module: module,
      stackTrace: stackTrace,
    );
  }
}
