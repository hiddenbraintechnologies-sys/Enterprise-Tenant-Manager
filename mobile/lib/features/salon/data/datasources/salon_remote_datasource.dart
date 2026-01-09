import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/salon_service.dart';
import '../../domain/entities/salon_appointment.dart';
import '../../domain/entities/salon_staff.dart';
import '../../domain/entities/salon_customer.dart';

class SalonRemoteDataSource {
  final ApiClient _apiClient;
  static const String _basePath = '/api/salon';

  SalonRemoteDataSource(this._apiClient);

  Future<PaginatedResponse<SalonService>> getServices(
    PaginationParams params, {
    String? category,
    bool? isActive,
  }) async {
    final queryParams = params.toQueryParameters();
    if (category != null) queryParams['category'] = category;
    if (isActive != null) queryParams['isActive'] = isActive.toString();

    final response = await _apiClient.get(
      '$_basePath/services',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => SalonService.fromJson(json),
    );
  }

  Future<SalonService> getService(String id) async {
    final response = await _apiClient.get('$_basePath/services/$id');
    return SalonService.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalonService> createService(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/services', data: data);
    return SalonService.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalonService> updateService(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/services/$id', data: data);
    return SalonService.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteService(String id) async {
    await _apiClient.delete('$_basePath/services/$id');
  }

  Future<PaginatedResponse<SalonAppointment>> getAppointments(
    PaginationParams params, {
    String? status,
    String? staffId,
    String? customerId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null && status != 'all') queryParams['status'] = status;
    if (staffId != null) queryParams['staffId'] = staffId;
    if (customerId != null) queryParams['customerId'] = customerId;
    if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
    if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

    final response = await _apiClient.get(
      '$_basePath/appointments',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => SalonAppointment.fromJson(json),
    );
  }

  Future<SalonAppointment> getAppointment(String id) async {
    final response = await _apiClient.get('$_basePath/appointments/$id');
    return SalonAppointment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalonAppointment> createAppointment(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/appointments', data: data);
    return SalonAppointment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalonAppointment> updateAppointment(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/appointments/$id', data: data);
    return SalonAppointment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalonAppointment> cancelAppointment(String id) async {
    final response = await _apiClient.patch(
      '$_basePath/appointments/$id/cancel',
    );
    return SalonAppointment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<SalonStaff>> getStaff(
    PaginationParams params, {
    bool? isActive,
    String? specialization,
  }) async {
    final queryParams = params.toQueryParameters();
    if (isActive != null) queryParams['isActive'] = isActive.toString();
    if (specialization != null) queryParams['specialization'] = specialization;

    final response = await _apiClient.get(
      '$_basePath/staff',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => SalonStaff.fromJson(json),
    );
  }

  Future<SalonStaff> getStaffMember(String id) async {
    final response = await _apiClient.get('$_basePath/staff/$id');
    return SalonStaff.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalonStaff> createStaff(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/staff', data: data);
    return SalonStaff.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalonStaff> updateStaff(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/staff/$id', data: data);
    return SalonStaff.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<SalonCustomer>> getCustomers(
    PaginationParams params, {
    String? search,
    int? minLoyaltyPoints,
  }) async {
    final queryParams = params.toQueryParameters();
    if (search != null) queryParams['search'] = search;
    if (minLoyaltyPoints != null) {
      queryParams['minLoyaltyPoints'] = minLoyaltyPoints.toString();
    }

    final response = await _apiClient.get(
      '$_basePath/customers',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => SalonCustomer.fromJson(json),
    );
  }

  Future<SalonCustomer> getCustomer(String id) async {
    final response = await _apiClient.get('$_basePath/customers/$id');
    return SalonCustomer.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalonCustomer> createCustomer(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/customers', data: data);
    return SalonCustomer.fromJson(response.data as Map<String, dynamic>);
  }

  Future<SalonCustomer> updateCustomer(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/customers/$id', data: data);
    return SalonCustomer.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _apiClient.get('$_basePath/dashboard/stats');
    return response.data as Map<String, dynamic>;
  }

  Future<List<SalonAppointment>> getTodayAppointments() async {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));

    final response = await _apiClient.get(
      '$_basePath/appointments',
      queryParameters: {
        'startDate': startOfDay.toIso8601String(),
        'endDate': endOfDay.toIso8601String(),
        'limit': '100',
      },
    );

    final data = response.data as Map<String, dynamic>;
    final items = data['data'] as List<dynamic>? ?? [];
    return items
        .map((json) => SalonAppointment.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}
