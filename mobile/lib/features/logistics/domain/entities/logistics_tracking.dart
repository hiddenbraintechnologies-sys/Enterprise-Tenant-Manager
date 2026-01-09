import 'package:equatable/equatable.dart';

class TrackingLocation extends Equatable {
  final double latitude;
  final double longitude;
  final String? address;

  const TrackingLocation({
    required this.latitude,
    required this.longitude,
    this.address,
  });

  factory TrackingLocation.fromJson(Map<String, dynamic> json) {
    return TrackingLocation(
      latitude: _parseDouble(json['latitude']),
      longitude: _parseDouble(json['longitude']),
      address: json['address'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
    };
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  @override
  List<Object?> get props => [latitude, longitude, address];
}

class LogisticsTracking extends Equatable {
  final String id;
  final String orderId;
  final TrackingLocation location;
  final DateTime timestamp;
  final String status;
  final String? notes;
  final String tenantId;
  final String? driverId;
  final String? driverName;

  const LogisticsTracking({
    required this.id,
    required this.orderId,
    required this.location,
    required this.timestamp,
    required this.status,
    this.notes,
    required this.tenantId,
    this.driverId,
    this.driverName,
  });

  factory LogisticsTracking.fromJson(Map<String, dynamic> json) {
    return LogisticsTracking(
      id: json['id'] as String,
      orderId: json['orderId'] as String,
      location: TrackingLocation.fromJson(json['location'] as Map<String, dynamic>),
      timestamp: DateTime.parse(json['timestamp'] as String),
      status: json['status'] as String,
      notes: json['notes'] as String?,
      tenantId: json['tenantId'] as String,
      driverId: json['driverId'] as String?,
      driverName: json['driverName'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'location': location.toJson(),
      'timestamp': timestamp.toIso8601String(),
      'status': status,
      'notes': notes,
      'tenantId': tenantId,
      'driverId': driverId,
      'driverName': driverName,
    };
  }

  String get statusDisplayName {
    switch (status) {
      case 'order_created':
        return 'Order Created';
      case 'driver_assigned':
        return 'Driver Assigned';
      case 'picked_up':
        return 'Picked Up';
      case 'in_transit':
        return 'In Transit';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  LogisticsTracking copyWith({
    String? id,
    String? orderId,
    TrackingLocation? location,
    DateTime? timestamp,
    String? status,
    String? notes,
    String? tenantId,
    String? driverId,
    String? driverName,
  }) {
    return LogisticsTracking(
      id: id ?? this.id,
      orderId: orderId ?? this.orderId,
      location: location ?? this.location,
      timestamp: timestamp ?? this.timestamp,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      tenantId: tenantId ?? this.tenantId,
      driverId: driverId ?? this.driverId,
      driverName: driverName ?? this.driverName,
    );
  }

  @override
  List<Object?> get props => [
        id,
        orderId,
        location,
        timestamp,
        status,
        notes,
        tenantId,
        driverId,
        driverName,
      ];
}
