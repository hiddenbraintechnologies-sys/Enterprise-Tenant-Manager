import 'package:equatable/equatable.dart';

enum RoomType { single, double, triple, dormitory }

class PgRoom extends Equatable {
  final String id;
  final String tenantId;
  final String roomNumber;
  final int floor;
  final RoomType type;
  final int capacity;
  final int beds;
  final double rent;
  final double deposit;
  final List<String> amenities;
  final bool isOccupied;
  final int? currentOccupancy;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PgRoom({
    required this.id,
    required this.tenantId,
    required this.roomNumber,
    required this.floor,
    required this.type,
    required this.capacity,
    required this.beds,
    required this.rent,
    required this.deposit,
    required this.amenities,
    required this.isOccupied,
    this.currentOccupancy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PgRoom.fromJson(Map<String, dynamic> json) {
    return PgRoom(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      roomNumber: json['roomNumber'] as String,
      floor: json['floor'] as int,
      type: _parseRoomType(json['type'] as String),
      capacity: json['capacity'] as int,
      beds: json['beds'] as int,
      rent: _parseDouble(json['rent']),
      deposit: _parseDouble(json['deposit']),
      amenities: (json['amenities'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      isOccupied: json['isOccupied'] as bool? ?? false,
      currentOccupancy: json['currentOccupancy'] as int?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static RoomType _parseRoomType(String type) {
    switch (type.toLowerCase()) {
      case 'single':
        return RoomType.single;
      case 'double':
        return RoomType.double;
      case 'triple':
        return RoomType.triple;
      case 'dormitory':
        return RoomType.dormitory;
      default:
        return RoomType.single;
    }
  }

  static double _parseDouble(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'roomNumber': roomNumber,
      'floor': floor,
      'type': type.name,
      'capacity': capacity,
      'beds': beds,
      'rent': rent,
      'deposit': deposit,
      'amenities': amenities,
      'isOccupied': isOccupied,
      'currentOccupancy': currentOccupancy,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  PgRoom copyWith({
    String? id,
    String? tenantId,
    String? roomNumber,
    int? floor,
    RoomType? type,
    int? capacity,
    int? beds,
    double? rent,
    double? deposit,
    List<String>? amenities,
    bool? isOccupied,
    int? currentOccupancy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PgRoom(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      roomNumber: roomNumber ?? this.roomNumber,
      floor: floor ?? this.floor,
      type: type ?? this.type,
      capacity: capacity ?? this.capacity,
      beds: beds ?? this.beds,
      rent: rent ?? this.rent,
      deposit: deposit ?? this.deposit,
      amenities: amenities ?? this.amenities,
      isOccupied: isOccupied ?? this.isOccupied,
      currentOccupancy: currentOccupancy ?? this.currentOccupancy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        roomNumber,
        floor,
        type,
        capacity,
        beds,
        rent,
        deposit,
        amenities,
        isOccupied,
        currentOccupancy,
        createdAt,
        updatedAt,
      ];
}
