/// Clinic Module Models
library clinic_models;

class Patient {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final DateTime? dateOfBirth;
  final String? gender;
  final String? bloodGroup;
  final String status;

  Patient({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.dateOfBirth,
    this.gender,
    this.bloodGroup,
    required this.status,
  });

  factory Patient.fromJson(Map<String, dynamic> json) => Patient(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    email: json['email'],
    phone: json['phone'],
    dateOfBirth: json['dateOfBirth'] != null ? DateTime.parse(json['dateOfBirth']) : null,
    gender: json['gender'],
    bloodGroup: json['bloodGroup'],
    status: json['status'] ?? 'active',
  );

  String get fullName => '$firstName $lastName';
}

class Doctor {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String specialization;
  final String? qualifications;
  final String? email;
  final String? phone;
  final double consultationFee;
  final String status;

  Doctor({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    required this.specialization,
    this.qualifications,
    this.email,
    this.phone,
    required this.consultationFee,
    required this.status,
  });

  factory Doctor.fromJson(Map<String, dynamic> json) => Doctor(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    specialization: json['specialization'],
    qualifications: json['qualifications'],
    email: json['email'],
    phone: json['phone'],
    consultationFee: (json['consultationFee'] ?? 0).toDouble(),
    status: json['status'] ?? 'active',
  );

  String get fullName => 'Dr. $firstName $lastName';
}

class ClinicAppointment {
  final String id;
  final String tenantId;
  final String patientId;
  final String? patientName;
  final String doctorId;
  final String? doctorName;
  final DateTime appointmentDate;
  final String? timeSlot;
  final String status;
  final String? notes;

  ClinicAppointment({
    required this.id,
    required this.tenantId,
    required this.patientId,
    this.patientName,
    required this.doctorId,
    this.doctorName,
    required this.appointmentDate,
    this.timeSlot,
    required this.status,
    this.notes,
  });

  factory ClinicAppointment.fromJson(Map<String, dynamic> json) => ClinicAppointment(
    id: json['id'],
    tenantId: json['tenantId'],
    patientId: json['patientId'],
    patientName: json['patientName'],
    doctorId: json['doctorId'],
    doctorName: json['doctorName'],
    appointmentDate: DateTime.parse(json['appointmentDate']),
    timeSlot: json['timeSlot'],
    status: json['status'] ?? 'scheduled',
    notes: json['notes'],
  );
}

class ClinicDashboardStats {
  final int totalPatients;
  final int activePatients;
  final int totalDoctors;
  final int todayAppointments;
  final int pendingAppointments;
  final int completedToday;

  ClinicDashboardStats({
    required this.totalPatients,
    required this.activePatients,
    required this.totalDoctors,
    required this.todayAppointments,
    required this.pendingAppointments,
    required this.completedToday,
  });

  factory ClinicDashboardStats.fromJson(Map<String, dynamic> json) => ClinicDashboardStats(
    totalPatients: json['totalPatients'] ?? 0,
    activePatients: json['activePatients'] ?? 0,
    totalDoctors: json['totalDoctors'] ?? 0,
    todayAppointments: json['todayAppointments'] ?? 0,
    pendingAppointments: json['pendingAppointments'] ?? 0,
    completedToday: json['completedToday'] ?? 0,
  );
}
