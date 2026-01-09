import 'package:equatable/equatable.dart';

enum AppointmentStatus { scheduled, completed, cancelled }

class ClinicAppointment extends Equatable {
  final String id;
  final String tenantId;
  final String patientId;
  final String doctorId;
  final DateTime dateTime;
  final AppointmentStatus status;
  final String? notes;
  final String? patientName;
  final String? doctorName;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ClinicAppointment({
    required this.id,
    required this.tenantId,
    required this.patientId,
    required this.doctorId,
    required this.dateTime,
    required this.status,
    this.notes,
    this.patientName,
    this.doctorName,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ClinicAppointment.fromJson(Map<String, dynamic> json) {
    return ClinicAppointment(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      patientId: json['patientId'] as String,
      doctorId: json['doctorId'] as String,
      dateTime: DateTime.parse(json['dateTime'] as String),
      status: _parseStatus(json['status'] as String),
      notes: json['notes'] as String?,
      patientName: json['patientName'] as String?,
      doctorName: json['doctorName'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  static AppointmentStatus _parseStatus(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
        return AppointmentStatus.completed;
      case 'cancelled':
        return AppointmentStatus.cancelled;
      case 'scheduled':
      default:
        return AppointmentStatus.scheduled;
    }
  }

  String get statusString {
    switch (status) {
      case AppointmentStatus.completed:
        return 'completed';
      case AppointmentStatus.cancelled:
        return 'cancelled';
      case AppointmentStatus.scheduled:
        return 'scheduled';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tenantId': tenantId,
      'patientId': patientId,
      'doctorId': doctorId,
      'dateTime': dateTime.toIso8601String(),
      'status': statusString,
      'notes': notes,
      'patientName': patientName,
      'doctorName': doctorName,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  ClinicAppointment copyWith({
    String? id,
    String? tenantId,
    String? patientId,
    String? doctorId,
    DateTime? dateTime,
    AppointmentStatus? status,
    String? notes,
    String? patientName,
    String? doctorName,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ClinicAppointment(
      id: id ?? this.id,
      tenantId: tenantId ?? this.tenantId,
      patientId: patientId ?? this.patientId,
      doctorId: doctorId ?? this.doctorId,
      dateTime: dateTime ?? this.dateTime,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      patientName: patientName ?? this.patientName,
      doctorName: doctorName ?? this.doctorName,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tenantId,
        patientId,
        doctorId,
        dateTime,
        status,
        notes,
        patientName,
        doctorName,
        createdAt,
        updatedAt,
      ];
}
