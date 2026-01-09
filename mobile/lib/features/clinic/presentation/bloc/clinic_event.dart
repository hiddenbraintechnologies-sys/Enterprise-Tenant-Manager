import 'package:equatable/equatable.dart';

abstract class ClinicEvent extends Equatable {
  const ClinicEvent();

  @override
  List<Object?> get props => [];
}

class LoadPatients extends ClinicEvent {
  final int page;
  final int limit;
  final String? search;
  final String? gender;
  final String? bloodGroup;
  final String? sortBy;
  final String sortOrder;

  const LoadPatients({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.gender,
    this.bloodGroup,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, gender, bloodGroup, sortBy, sortOrder];
}

class LoadMorePatients extends ClinicEvent {
  const LoadMorePatients();
}

class LoadPatientDetail extends ClinicEvent {
  final String patientId;

  const LoadPatientDetail(this.patientId);

  @override
  List<Object?> get props => [patientId];
}

class CreatePatient extends ClinicEvent {
  final Map<String, dynamic> data;

  const CreatePatient(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdatePatient extends ClinicEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdatePatient(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class DeletePatient extends ClinicEvent {
  final String id;

  const DeletePatient(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadAppointments extends ClinicEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? doctorId;
  final String? patientId;
  final DateTime? date;
  final String? sortBy;
  final String sortOrder;

  const LoadAppointments({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.doctorId,
    this.patientId,
    this.date,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, doctorId, patientId, date, sortBy, sortOrder];
}

class LoadMoreAppointments extends ClinicEvent {
  const LoadMoreAppointments();
}

class CreateAppointment extends ClinicEvent {
  final Map<String, dynamic> data;

  const CreateAppointment(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateAppointment extends ClinicEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateAppointment(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class CancelAppointment extends ClinicEvent {
  final String id;

  const CancelAppointment(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadDoctors extends ClinicEvent {
  final int page;
  final int limit;
  final String? search;
  final String? specialization;
  final bool? isActive;
  final String? sortBy;
  final String sortOrder;

  const LoadDoctors({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.specialization,
    this.isActive,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, specialization, isActive, sortBy, sortOrder];
}

class LoadMoreDoctors extends ClinicEvent {
  const LoadMoreDoctors();
}

class CreateDoctor extends ClinicEvent {
  final Map<String, dynamic> data;

  const CreateDoctor(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateDoctor extends ClinicEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateDoctor(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class LoadDashboardStats extends ClinicEvent {
  const LoadDashboardStats();
}

class LoadTodayAppointments extends ClinicEvent {
  const LoadTodayAppointments();
}

class ClearFilters extends ClinicEvent {
  const ClearFilters();
}

class RefreshData extends ClinicEvent {
  const RefreshData();
}

class ClearSelectedPatient extends ClinicEvent {
  const ClearSelectedPatient();
}
