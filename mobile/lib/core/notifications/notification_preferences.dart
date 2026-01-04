import 'package:hive/hive.dart';

class NotificationPreferences {
  static const String _boxName = 'notification_preferences';
  
  Box<dynamic>? _box;

  Future<void> initialize() async {
    _box = await Hive.openBox(_boxName);
  }

  bool get pushEnabled => _box?.get('pushEnabled', defaultValue: true) ?? true;
  set pushEnabled(bool value) => _box?.put('pushEnabled', value);

  bool get bookingNotifications => _box?.get('bookingNotifications', defaultValue: true) ?? true;
  set bookingNotifications(bool value) => _box?.put('bookingNotifications', value);

  bool get appointmentNotifications => _box?.get('appointmentNotifications', defaultValue: true) ?? true;
  set appointmentNotifications(bool value) => _box?.put('appointmentNotifications', value);

  bool get paymentNotifications => _box?.get('paymentNotifications', defaultValue: true) ?? true;
  set paymentNotifications(bool value) => _box?.put('paymentNotifications', value);

  bool get reminderNotifications => _box?.get('reminderNotifications', defaultValue: true) ?? true;
  set reminderNotifications(bool value) => _box?.put('reminderNotifications', value);

  bool get promotionNotifications => _box?.get('promotionNotifications', defaultValue: false) ?? false;
  set promotionNotifications(bool value) => _box?.put('promotionNotifications', value);

  bool get chatNotifications => _box?.get('chatNotifications', defaultValue: true) ?? true;
  set chatNotifications(bool value) => _box?.put('chatNotifications', value);

  bool get systemNotifications => _box?.get('systemNotifications', defaultValue: true) ?? true;
  set systemNotifications(bool value) => _box?.put('systemNotifications', value);

  bool get soundEnabled => _box?.get('soundEnabled', defaultValue: true) ?? true;
  set soundEnabled(bool value) => _box?.put('soundEnabled', value);

  bool get vibrationEnabled => _box?.get('vibrationEnabled', defaultValue: true) ?? true;
  set vibrationEnabled(bool value) => _box?.put('vibrationEnabled', value);

  bool shouldShowNotification(NotificationType type) {
    if (!pushEnabled) return false;

    switch (type) {
      case NotificationType.booking:
        return bookingNotifications;
      case NotificationType.appointment:
        return appointmentNotifications;
      case NotificationType.payment:
        return paymentNotifications;
      case NotificationType.reminder:
        return reminderNotifications;
      case NotificationType.promotion:
        return promotionNotifications;
      case NotificationType.chat:
        return chatNotifications;
      case NotificationType.system:
      case NotificationType.alert:
        return systemNotifications;
    }
  }

  Map<String, bool> getAllPreferences() {
    return {
      'pushEnabled': pushEnabled,
      'bookingNotifications': bookingNotifications,
      'appointmentNotifications': appointmentNotifications,
      'paymentNotifications': paymentNotifications,
      'reminderNotifications': reminderNotifications,
      'promotionNotifications': promotionNotifications,
      'chatNotifications': chatNotifications,
      'systemNotifications': systemNotifications,
      'soundEnabled': soundEnabled,
      'vibrationEnabled': vibrationEnabled,
    };
  }

  Future<void> setAllPreferences(Map<String, bool> prefs) async {
    for (final entry in prefs.entries) {
      await _box?.put(entry.key, entry.value);
    }
  }

  Future<void> reset() async {
    await _box?.clear();
  }

  Future<void> close() async {
    await _box?.close();
  }
}

enum NotificationType {
  booking,
  appointment,
  payment,
  reminder,
  promotion,
  chat,
  system,
  alert,
}
