import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/gym_member.dart';
import '../../domain/entities/gym_subscription.dart';
import '../../domain/entities/gym_trainer.dart';
import '../../domain/entities/gym_attendance.dart';

class GymRemoteDataSource {
  final ApiClient _apiClient;
  static const String _basePath = '/api/gym';

  GymRemoteDataSource(this._apiClient);

  Future<PaginatedResponse<GymMember>> getMembers(
    PaginationParams params, {
    String? membershipType,
    String? status,
  }) async {
    final queryParams = params.toQueryParameters();
    if (membershipType != null) queryParams['membershipType'] = membershipType;
    if (status != null) queryParams['status'] = status;

    final response = await _apiClient.get(
      '$_basePath/members',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => GymMember.fromJson(json),
    );
  }

  Future<GymMember> getMember(String id) async {
    final response = await _apiClient.get('$_basePath/members/$id');
    return GymMember.fromJson(response.data as Map<String, dynamic>);
  }

  Future<GymMember> createMember(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/members', data: data);
    return GymMember.fromJson(response.data as Map<String, dynamic>);
  }

  Future<GymMember> updateMember(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/members/$id', data: data);
    return GymMember.fromJson(response.data as Map<String, dynamic>);
  }

  Future<GymMember> renewMembership(String id, {
    required String subscriptionId,
    required DateTime startDate,
  }) async {
    final response = await _apiClient.post(
      '$_basePath/members/$id/renew',
      data: {
        'subscriptionId': subscriptionId,
        'startDate': startDate.toIso8601String(),
      },
    );
    return GymMember.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteMember(String id) async {
    await _apiClient.delete('$_basePath/members/$id');
  }

  Future<PaginatedResponse<GymSubscription>> getSubscriptions(
    PaginationParams params, {
    bool? isActive,
  }) async {
    final queryParams = params.toQueryParameters();
    if (isActive != null) queryParams['isActive'] = isActive.toString();

    final response = await _apiClient.get(
      '$_basePath/subscriptions',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => GymSubscription.fromJson(json),
    );
  }

  Future<GymSubscription> getSubscription(String id) async {
    final response = await _apiClient.get('$_basePath/subscriptions/$id');
    return GymSubscription.fromJson(response.data as Map<String, dynamic>);
  }

  Future<GymSubscription> createSubscription(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/subscriptions', data: data);
    return GymSubscription.fromJson(response.data as Map<String, dynamic>);
  }

  Future<GymSubscription> updateSubscription(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/subscriptions/$id', data: data);
    return GymSubscription.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteSubscription(String id) async {
    await _apiClient.delete('$_basePath/subscriptions/$id');
  }

  Future<PaginatedResponse<GymTrainer>> getTrainers(
    PaginationParams params, {
    String? specialization,
    bool? isActive,
  }) async {
    final queryParams = params.toQueryParameters();
    if (specialization != null) queryParams['specialization'] = specialization;
    if (isActive != null) queryParams['isActive'] = isActive.toString();

    final response = await _apiClient.get(
      '$_basePath/trainers',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => GymTrainer.fromJson(json),
    );
  }

  Future<GymTrainer> getTrainer(String id) async {
    final response = await _apiClient.get('$_basePath/trainers/$id');
    return GymTrainer.fromJson(response.data as Map<String, dynamic>);
  }

  Future<GymTrainer> createTrainer(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/trainers', data: data);
    return GymTrainer.fromJson(response.data as Map<String, dynamic>);
  }

  Future<GymTrainer> updateTrainer(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/trainers/$id', data: data);
    return GymTrainer.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteTrainer(String id) async {
    await _apiClient.delete('$_basePath/trainers/$id');
  }

  Future<PaginatedResponse<GymAttendance>> getAttendance(
    PaginationParams params, {
    String? memberId,
    DateTime? date,
  }) async {
    final queryParams = params.toQueryParameters();
    if (memberId != null) queryParams['memberId'] = memberId;
    if (date != null) queryParams['date'] = date.toIso8601String().split('T').first;

    final response = await _apiClient.get(
      '$_basePath/attendance',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => GymAttendance.fromJson(json),
    );
  }

  Future<GymAttendance> checkIn(String memberId, {String? notes}) async {
    final response = await _apiClient.post(
      '$_basePath/attendance/check-in',
      data: {
        'memberId': memberId,
        if (notes != null) 'notes': notes,
      },
    );
    return GymAttendance.fromJson(response.data as Map<String, dynamic>);
  }

  Future<GymAttendance> checkOut(String attendanceId, {String? notes}) async {
    final response = await _apiClient.post(
      '$_basePath/attendance/$attendanceId/check-out',
      data: {
        if (notes != null) 'notes': notes,
      },
    );
    return GymAttendance.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _apiClient.get('$_basePath/dashboard/stats');
    return response.data as Map<String, dynamic>;
  }

  Future<List<GymMember>> getExpiringMemberships({int days = 7}) async {
    final response = await _apiClient.get(
      '$_basePath/members/expiring',
      queryParameters: {'days': days.toString()},
    );
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => GymMember.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<List<GymAttendance>> getTodayAttendance() async {
    final response = await _apiClient.get('$_basePath/attendance/today');
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => GymAttendance.fromJson(json as Map<String, dynamic>)).toList();
  }
}
