import 'package:equatable/equatable.dart';

class CoworkingBooking extends Equatable {
  final String id;
  final String tenantId;
  final String memberId;
  final String? memberName;
  final String? deskId;
  final String? deskName;
  final String? meetingRoomId;
  final String? meetingRoomName;
  final DateTime startDate;
  final DateTime endDate;
  final String bookingType;
  final String status;
  final double totalAmount;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const CoworkingBooking({
    required this.id,
    required this.tenantId,
    required this.memberId,
    this.memberName,
    this.deskId,
    this.deskName,
    this.meetingRoomId,
    this.meetingRoomName,
    required this.startDate,
    required this.endDate,
    required this.bookingType,
    required this.status,
    required this.totalAmount,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CoworkingBooking.fromJson(Map<String, dynamic> json) {
    return CoworkingBooking(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      memberId: json['memberId'] as String,
      memberName: json['memberName'] as String?,
      deskId: json['deskId'] as String?,
      deskName: json['deskName'] as String?,
      meetingRoomId: json['meetingRoomId'] as String?,
      meetingRoomName: json['meetingRoomName'] as String?,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      bookingType: json['bookingType'] as String,
      status: json['status'] as String,
      totalAmount: _parseDouble(json['totalAmount']),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
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
      'memberId': memberId,
      'memberName': memberName,
      'deskId': deskId,
      'deskName': deskName,
      'meetingRoomId': meetingRoomId,
      'meetingRoomName': meetingRoomName,
      'startDate': startDate.toIso8601String(),
      'endDate': endDate.toIso8601String(),
      'bookingType': bookingType,
      'status': status,
      'totalAmount': totalAmount,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  CoworkingBooking copyWith({
    String? id,
    String? tenantId,
    String? memberId,
    String? memberName,
    String? deskId,
    String? deskName,
    String? meetingRoomId,
    String? meetingRoomName,
    DateTime? startDate,
    DateTime? endDate,
    String? bookingType,
    String? status,
    double? totalAmount,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CoworkingBooking(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      memberId: memberId ?? this.memberId,
      memberName: memberName ?? this.memberName,
      deskId: deskId ?? this.deskId,
      deskName: deskName ?? this.deskName,
      meetingRoomId: meetingRoomId ?? this.meetingRoomId,
      meetingRoomName: meetingRoomName ?? this.meetingRoomName,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      bookingType: bookingType ?? this.bookingType,
      status: status ?? this.status,
      totalAmount: totalAmount ?? this.totalAmount,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        memberId,
        memberName,
        deskId,
        deskName,
        meetingRoomId,
        meetingRoomName,
        startDate,
        endDate,
        bookingType,
        status,
        totalAmount,
        notes,
        createdAt,
        updatedAt,
      ];
}
