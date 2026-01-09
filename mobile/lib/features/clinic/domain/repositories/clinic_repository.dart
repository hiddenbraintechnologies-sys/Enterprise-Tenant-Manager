import '../../../../core/network/pagination.dart';
import '../entities/clinic_patient.dart';
import '../entities/clinic_appointment.dart';
import '../entities/clinic_doctor.dart';

abstract class ClinicRepository {
  Future<PaginatedResponse<ClinicPatient>> getPatients(
    PaginationParams params, {
    String? gender,
    String? bloodGroup,
  });

  Future<ClinicPatient> getPatient(String id);

  Future<ClinicPatient> createPatient(Map<String, dynamic> data);

  Future<ClinicPatient> updatePatient(String id, Map<String, dynamic> data);

  Future<void> deletePatient(String id);

  Future<PaginatedResponse<ClinicAppointment>> getAppointments(
    PaginationParams params, {
    String? doctorId,
    String? patientId,
    DateTime? date,
  });

  Future<ClinicAppointment> getAppointment(String id);

  Future<ClinicAppointment> createAppointment(Map<String, dynamic> data);

  Future<ClinicAppointment> updateAppointment(String id, Map<String, dynamic> data);

  Future<ClinicAppointment> cancelAppointment(String id);

  Future<PaginatedResponse<ClinicDoctor>> getDoctors(
    PaginationParams params, {
    String? specialization,
    bool? isActive,
  });

  Future<ClinicDoctor> getDoctor(String id);

  Future<ClinicDoctor> createDoctor(Map<String, dynamic> data);

  Future<ClinicDoctor> updateDoctor(String id, Map<String, dynamic> data);

  Future<Map<String, dynamic>> getDashboardStats();

  Future<List<ClinicAppointment>> getTodayAppointments();
}
