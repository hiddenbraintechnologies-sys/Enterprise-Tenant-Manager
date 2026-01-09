import 'package:equatable/equatable.dart';

class GymAttendance extends Equatable {
  final String id;
  final String tenantId;
  final String memberId;
  final String? memberName;
  final DateTime checkIn;
  final DateTime? checkOut;
  final DateTime date;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const GymAttendance({
    required this.id,
    required this.tenantId,
    required this.memberId,
    this.memberName,
    required this.checkIn,
    this.checkOut,
    required this.date,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory GymAttendance.fromJson(Map<String, dynamic> json) {
    return GymAttendance(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      memberId: json['memberId'] as String,
      memberName: json['memberName'] as String?,
      checkIn: DateTime.parse(json['checkIn'] as String),
      checkOut: json['checkOut'] != null
          ? DateTime.parse(json['checkOut'] as String)
          : null,
      date: DateTime.parse(json['date'] as String),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'memberId': memberId,
      'memberName': memberName,
      'checkIn': checkIn.toIso8601String(),
      'checkOut': checkOut?.toIso8601String(),
      'date': date.toIso8601String(),
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  bool get isCheckedOut => checkOut != null;

  Duration? get duration {
    if (checkOut == null) return null;
    return checkOut!.difference(checkIn);
  }

  String get formattedDuration {
    final dur = duration;
    if (dur == null) return 'In progress';
    final hours = dur.inHours;
    final minutes = dur.inMinutes.remainder(60);
    if (hours > 0) {
      return '${hours}h ${minutes}m';
    }
    return '${minutes}m';
  }

  GymAttendance copyWith({
    String? id,
    String? tenantId,
    String? memberId,
    String? memberName,
    DateTime? checkIn,
    DateTime? checkOut,
    DateTime? date,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return GymAttendance(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      memberId: memberId ?? this.memberId,
      memberName: memberName ?? this.memberName,
      checkIn: checkIn ?? this.checkIn,
      checkOut: checkOut ?? this.checkOut,
      date: date ?? this.date,
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
        checkIn,
        checkOut,
        date,
        notes,
        createdAt,
        updatedAt,
      ];
}
