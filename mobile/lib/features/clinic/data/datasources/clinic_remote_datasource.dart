import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/clinic_patient.dart';
import '../../domain/entities/clinic_appointment.dart';
import '../../domain/entities/clinic_doctor.dart';

class ClinicRemoteDataSource {
  final ApiClient _apiClient;
  static const String _basePath = '/api/clinic';

  ClinicRemoteDataSource(this._apiClient);

  Future<PaginatedResponse<ClinicPatient>> getPatients(
    PaginationParams params, {
    String? gender,
    String? bloodGroup,
  }) async {
    final queryParams = params.toQueryParameters();
    if (gender != null) queryParams['gender'] = gender;
    if (bloodGroup != null) queryParams['bloodGroup'] = bloodGroup;

    final response = await _apiClient.get(
      '$_basePath/patients',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => ClinicPatient.fromJson(json),
    );
  }

  Future<ClinicPatient> getPatient(String id) async {
    final response = await _apiClient.get('$_basePath/patients/$id');
    return ClinicPatient.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ClinicPatient> createPatient(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/patients', data: data);
    return ClinicPatient.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ClinicPatient> updatePatient(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/patients/$id', data: data);
    return ClinicPatient.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deletePatient(String id) async {
    await _apiClient.delete('$_basePath/patients/$id');
  }

  Future<PaginatedResponse<ClinicAppointment>> getAppointments(
    PaginationParams params, {
    String? doctorId,
    String? patientId,
    DateTime? date,
  }) async {
    final queryParams = params.toQueryParameters();
    if (doctorId != null) queryParams['doctorId'] = doctorId;
    if (patientId != null) queryParams['patientId'] = patientId;
    if (date != null) queryParams['date'] = date.toIso8601String().split('T')[0];

    final response = await _apiClient.get(
      '$_basePath/appointments',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => ClinicAppointment.fromJson(json),
    );
  }

  Future<ClinicAppointment> getAppointment(String id) async {
    final response = await _apiClient.get('$_basePath/appointments/$id');
    return ClinicAppointment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ClinicAppointment> createAppointment(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/appointments', data: data);
    return ClinicAppointment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ClinicAppointment> updateAppointment(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/appointments/$id', data: data);
    return ClinicAppointment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ClinicAppointment> cancelAppointment(String id) async {
    final response = await _apiClient.patch(
      '$_basePath/appointments/$id',
      data: {'status': 'cancelled'},
    );
    return ClinicAppointment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<ClinicDoctor>> getDoctors(
    PaginationParams params, {
    String? specialization,
    bool? isActive,
  }) async {
    final queryParams = params.toQueryParameters();
    if (specialization != null) queryParams['specialization'] = specialization;
    if (isActive != null) queryParams['isActive'] = isActive.toString();

    final response = await _apiClient.get(
      '$_basePath/doctors',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => ClinicDoctor.fromJson(json),
    );
  }

  Future<ClinicDoctor> getDoctor(String id) async {
    final response = await _apiClient.get('$_basePath/doctors/$id');
    return ClinicDoctor.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ClinicDoctor> createDoctor(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/doctors', data: data);
    return ClinicDoctor.fromJson(response.data as Map<String, dynamic>);
  }

  Future<ClinicDoctor> updateDoctor(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/doctors/$id', data: data);
    return ClinicDoctor.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _apiClient.get('$_basePath/dashboard/stats');
    return response.data as Map<String, dynamic>;
  }

  Future<List<ClinicAppointment>> getTodayAppointments() async {
    final today = DateTime.now().toIso8601String().split('T')[0];
    final response = await _apiClient.get(
      '$_basePath/appointments',
      queryParameters: {'date': today, 'limit': '50'},
    );

    final data = response.data as Map<String, dynamic>;
    final List<dynamic> appointments = data['data'] as List<dynamic>;
    return appointments
        .map((json) => ClinicAppointment.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
