class NotificationLog {
  final String id;
  final String tenantId;
  final String invoiceId;
  final String channel;
  final String eventType;
  final String recipient;
  final String? subject;
  final String? body;
  final String status;
  final String? errorMessage;
  final int retryCount;
  final int maxRetries;
  final DateTime? nextRetryAt;
  final DateTime? sentAt;
  final DateTime createdAt;

  NotificationLog({
    required this.id,
    required this.tenantId,
    required this.invoiceId,
    required this.channel,
    required this.eventType,
    required this.recipient,
    this.subject,
    this.body,
    required this.status,
    this.errorMessage,
    required this.retryCount,
    required this.maxRetries,
    this.nextRetryAt,
    this.sentAt,
    required this.createdAt,
  });

  factory NotificationLog.fromJson(Map<String, dynamic> json) {
    return NotificationLog(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      invoiceId: json['invoiceId'] as String,
      channel: json['channel'] as String,
      eventType: json['eventType'] as String,
      recipient: json['recipient'] as String,
      subject: json['subject'] as String?,
      body: json['body'] as String?,
      status: json['status'] as String,
      errorMessage: json['errorMessage'] as String?,
      retryCount: json['retryCount'] as int? ?? 0,
      maxRetries: json['maxRetries'] as int? ?? 3,
      nextRetryAt: json['nextRetryAt'] != null
          ? DateTime.parse(json['nextRetryAt'] as String)
          : null,
      sentAt: json['sentAt'] != null
          ? DateTime.parse(json['sentAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'invoiceId': invoiceId,
      'channel': channel,
      'eventType': eventType,
      'recipient': recipient,
      'subject': subject,
      'body': body,
      'status': status,
      'errorMessage': errorMessage,
      'retryCount': retryCount,
      'maxRetries': maxRetries,
      'nextRetryAt': nextRetryAt?.toIso8601String(),
      'sentAt': sentAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }

  bool get isPending => status == 'pending';
  bool get isSent => status == 'sent' || status == 'delivered';
  bool get isFailed => status == 'failed';
  bool get isRetrying => status == 'retrying';
  bool get canRetry => isFailed && retryCount < maxRetries;

  String get statusDisplay {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'failed':
        return 'Failed';
      case 'retrying':
        return 'Retrying';
      default:
        return status;
    }
  }

  String get channelDisplay {
    switch (channel) {
      case 'email':
        return 'Email';
      case 'whatsapp':
        return 'WhatsApp';
      default:
        return channel;
    }
  }

  String get eventTypeDisplay {
    return eventType.replaceAll('_', ' ').split(' ').map((word) {
      if (word.isEmpty) return word;
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }
}
