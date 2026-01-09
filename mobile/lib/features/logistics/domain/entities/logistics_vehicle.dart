import 'package:equatable/equatable.dart';

enum VehicleType {
  bike,
  van,
  truck,
}

enum VehicleStatus {
  available,
  inUse,
  maintenance,
}

class VehicleLocation extends Equatable {
  final double latitude;
  final double longitude;
  final String? address;
  final DateTime? updatedAt;

  const VehicleLocation({
    required this.latitude,
    required this.longitude,
    this.address,
    this.updatedAt,
  });

  factory VehicleLocation.fromJson(Map<String, dynamic> json) {
    return VehicleLocation(
      latitude: _parseDouble(json['latitude']),
      longitude: _parseDouble(json['longitude']),
      address: json['address'] as String?,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  @override
  List<Object?> get props => [latitude, longitude, address, updatedAt];
}

class LogisticsVehicle extends Equatable {
  final String id;
  final String registrationNumber;
  final VehicleType type;
  final double capacity;
  final VehicleStatus status;
  final VehicleLocation? currentLocation;
  final double? fuelLevel;
  final String tenantId;
  final String? assignedDriverId;
  final String? assignedDriverName;
  final DateTime createdAt;
  final DateTime updatedAt;

  const LogisticsVehicle({
    required this.id,
    required this.registrationNumber,
    required this.type,
    required this.capacity,
    required this.status,
    this.currentLocation,
    this.fuelLevel,
    required this.tenantId,
    this.assignedDriverId,
    this.assignedDriverName,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LogisticsVehicle.fromJson(Map<String, dynamic> json) {
    return LogisticsVehicle(
      id: json['id'] as String,
      registrationNumber: json['registrationNumber'] as String,
      type: _parseVehicleType(json['type'] as String?),
      capacity: _parseDouble(json['capacity']),
      status: _parseVehicleStatus(json['status'] as String?),
      currentLocation: json['currentLocation'] != null
          ? VehicleLocation.fromJson(json['currentLocation'] as Map<String, dynamic>)
          : null,
      fuelLevel: json['fuelLevel'] != null ? _parseDouble(json['fuelLevel']) : null,
      tenantId: json['tenantId'] as String,
      assignedDriverId: json['assignedDriverId'] as String?,
      assignedDriverName: json['assignedDriverName'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static VehicleType _parseVehicleType(String? type) {
    switch (type) {
      case 'bike':
        return VehicleType.bike;
      case 'van':
        return VehicleType.van;
      case 'truck':
        return VehicleType.truck;
      default:
        return VehicleType.van;
    }
  }

  static VehicleStatus _parseVehicleStatus(String? status) {
    switch (status) {
      case 'available':
        return VehicleStatus.available;
      case 'in_use':
        return VehicleStatus.inUse;
      case 'maintenance':
        return VehicleStatus.maintenance;
      default:
        return VehicleStatus.available;
    }
  }

  String get typeString {
    switch (type) {
      case VehicleType.bike:
        return 'bike';
      case VehicleType.van:
        return 'van';
      case VehicleType.truck:
        return 'truck';
    }
  }

  String get typeDisplayName {
    switch (type) {
      case VehicleType.bike:
        return 'Bike';
      case VehicleType.van:
        return 'Van';
      case VehicleType.truck:
        return 'Truck';
    }
  }

  String get statusString {
    switch (status) {
      case VehicleStatus.available:
        return 'available';
      case VehicleStatus.inUse:
        return 'in_use';
      case VehicleStatus.maintenance:
        return 'maintenance';
    }
  }

  String get statusDisplayName {
    switch (status) {
      case VehicleStatus.available:
        return 'Available';
      case VehicleStatus.inUse:
        return 'In Use';
      case VehicleStatus.maintenance:
        return 'Maintenance';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'registrationNumber': registrationNumber,
      'type': typeString,
      'capacity': capacity,
      'status': statusString,
      'currentLocation': currentLocation?.toJson(),
      'fuelLevel': fuelLevel,
      'tenantId': tenantId,
      'assignedDriverId': assignedDriverId,
      'assignedDriverName': assignedDriverName,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  LogisticsVehicle copyWith({
    String? id,
    String? registrationNumber,
    VehicleType? type,
    double? capacity,
    VehicleStatus? status,
    VehicleLocation? currentLocation,
    double? fuelLevel,
    String? tenantId,
    String? assignedDriverId,
    String? assignedDriverName,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return LogisticsVehicle(
      id: id ?? this.id,
      registrationNumber: registrationNumber ?? this.registrationNumber,
      type: type ?? this.type,
      capacity: capacity ?? this.capacity,
      status: status ?? this.status,
      currentLocation: currentLocation ?? this.currentLocation,
      fuelLevel: fuelLevel ?? this.fuelLevel,
      tenantId: tenantId ?? this.tenantId,
      assignedDriverId: assignedDriverId ?? this.assignedDriverId,
      assignedDriverName: assignedDriverName ?? this.assignedDriverName,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        registrationNumber,
        type,
        capacity,
        status,
        currentLocation,
        fuelLevel,
        tenantId,
        assignedDriverId,
        assignedDriverName,
        createdAt,
        updatedAt,
      ];
}
