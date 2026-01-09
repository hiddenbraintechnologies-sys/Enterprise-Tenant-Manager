import '../../../../core/network/pagination.dart';
import '../../domain/entities/clinic_patient.dart';
import '../../domain/entities/clinic_appointment.dart';
import '../../domain/entities/clinic_doctor.dart';
import '../../domain/repositories/clinic_repository.dart';
import '../datasources/clinic_remote_datasource.dart';

class ClinicRepositoryImpl implements ClinicRepository {
  final ClinicRemoteDataSource _remoteDataSource;

  ClinicRepositoryImpl(this._remoteDataSource);

  @override
  Future<PaginatedResponse<ClinicPatient>> getPatients(
    PaginationParams params, {
    String? gender,
    String? bloodGroup,
  }) {
    return _remoteDataSource.getPatients(
      params,
      gender: gender,
      bloodGroup: bloodGroup,
    );
  }

  @override
  Future<ClinicPatient> getPatient(String id) {
    return _remoteDataSource.getPatient(id);
  }

  @override
  Future<ClinicPatient> createPatient(Map<String, dynamic> data) {
    return _remoteDataSource.createPatient(data);
  }

  @override
  Future<ClinicPatient> updatePatient(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updatePatient(id, data);
  }

  @override
  Future<void> deletePatient(String id) {
    return _remoteDataSource.deletePatient(id);
  }

  @override
  Future<PaginatedResponse<ClinicAppointment>> getAppointments(
    PaginationParams params, {
    String? doctorId,
    String? patientId,
    DateTime? date,
  }) {
    return _remoteDataSource.getAppointments(
      params,
      doctorId: doctorId,
      patientId: patientId,
      date: date,
    );
  }

  @override
  Future<ClinicAppointment> getAppointment(String id) {
    return _remoteDataSource.getAppointment(id);
  }

  @override
  Future<ClinicAppointment> createAppointment(Map<String, dynamic> data) {
    return _remoteDataSource.createAppointment(data);
  }

  @override
  Future<ClinicAppointment> updateAppointment(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateAppointment(id, data);
  }

  @override
  Future<ClinicAppointment> cancelAppointment(String id) {
    return _remoteDataSource.cancelAppointment(id);
  }

  @override
  Future<PaginatedResponse<ClinicDoctor>> getDoctors(
    PaginationParams params, {
    String? specialization,
    bool? isActive,
  }) {
    return _remoteDataSource.getDoctors(
      params,
      specialization: specialization,
      isActive: isActive,
    );
  }

  @override
  Future<ClinicDoctor> getDoctor(String id) {
    return _remoteDataSource.getDoctor(id);
  }

  @override
  Future<ClinicDoctor> createDoctor(Map<String, dynamic> data) {
    return _remoteDataSource.createDoctor(data);
  }

  @override
  Future<ClinicDoctor> updateDoctor(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateDoctor(id, data);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() {
    return _remoteDataSource.getDashboardStats();
  }

  @override
  Future<List<ClinicAppointment>> getTodayAppointments() {
    return _remoteDataSource.getTodayAppointments();
  }
}
