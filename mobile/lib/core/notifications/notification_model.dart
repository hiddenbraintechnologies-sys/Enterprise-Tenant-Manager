import 'package:equatable/equatable.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

enum NotificationType {
  booking('booking'),
  appointment('appointment'),
  payment('payment'),
  reminder('reminder'),
  alert('alert'),
  promotion('promotion'),
  system('system'),
  chat('chat');

  final String value;
  const NotificationType(this.value);

  static NotificationType fromString(String? value) {
    return NotificationType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => NotificationType.system,
    );
  }
}

class NotificationModel extends Equatable {
  final String? id;
  final String title;
  final String body;
  final NotificationType type;
  final String? tenantId;
  final String? targetModule;
  final String? targetId;
  final String? deepLink;
  final Map<String, dynamic> data;
  final DateTime receivedAt;
  final bool isRead;

  const NotificationModel({
    this.id,
    required this.title,
    required this.body,
    this.type = NotificationType.system,
    this.tenantId,
    this.targetModule,
    this.targetId,
    this.deepLink,
    this.data = const {},
    required this.receivedAt,
    this.isRead = false,
  });

  factory NotificationModel.fromRemoteMessage(RemoteMessage message) {
    final notification = message.notification;
    final data = message.data;

    return NotificationModel(
      id: message.messageId,
      title: notification?.title ?? data['title'] ?? 'Notification',
      body: notification?.body ?? data['body'] ?? '',
      type: NotificationType.fromString(data['type']),
      tenantId: data['tenantId'],
      targetModule: data['module'],
      targetId: data['targetId'],
      deepLink: data['deepLink'],
      data: data,
      receivedAt: message.sentTime ?? DateTime.now(),
    );
  }

  factory NotificationModel.fromData(Map<String, dynamic> data) {
    return NotificationModel(
      id: data['id'] as String?,
      title: data['title'] as String? ?? 'Notification',
      body: data['body'] as String? ?? '',
      type: NotificationType.fromString(data['type'] as String?),
      tenantId: data['tenantId'] as String?,
      targetModule: data['module'] as String?,
      targetId: data['targetId'] as String?,
      deepLink: data['deepLink'] as String?,
      data: data,
      receivedAt: data['receivedAt'] != null
          ? DateTime.parse(data['receivedAt'] as String)
          : DateTime.now(),
      isRead: data['isRead'] as bool? ?? false,
    );
  }

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel.fromData(json);
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'body': body,
      'type': type.value,
      'tenantId': tenantId,
      'module': targetModule,
      'targetId': targetId,
      'deepLink': deepLink,
      'data': data,
      'receivedAt': receivedAt.toIso8601String(),
      'isRead': isRead,
    };
  }

  NotificationModel copyWith({
    String? id,
    String? title,
    String? body,
    NotificationType? type,
    String? tenantId,
    String? targetModule,
    String? targetId,
    String? deepLink,
    Map<String, dynamic>? data,
    DateTime? receivedAt,
    bool? isRead,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      title: title ?? this.title,
      body: body ?? this.body,
      type: type ?? this.type,
      tenantId: tenantId ?? this.tenantId,
      targetModule: targetModule ?? this.targetModule,
      targetId: targetId ?? this.targetId,
      deepLink: deepLink ?? this.deepLink,
      data: data ?? this.data,
      receivedAt: receivedAt ?? this.receivedAt,
      isRead: isRead ?? this.isRead,
    );
  }

  @override
  List<Object?> get props => [id, title, body, type, tenantId, targetModule, targetId, receivedAt];
}
