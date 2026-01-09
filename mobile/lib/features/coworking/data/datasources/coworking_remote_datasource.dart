import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/coworking_desk.dart';
import '../../domain/entities/coworking_booking.dart';
import '../../domain/entities/coworking_member.dart';
import '../../domain/entities/coworking_meeting_room.dart';

class CoworkingRemoteDataSource {
  final ApiClient _apiClient;
  static const String _basePath = '/api/coworking';

  CoworkingRemoteDataSource(this._apiClient);

  Future<PaginatedResponse<CoworkingDesk>> getDesks(
    PaginationParams params, {
    String? type,
    String? floor,
    bool? isAvailable,
  }) async {
    final queryParams = params.toQueryParameters();
    if (type != null) queryParams['type'] = type;
    if (floor != null) queryParams['floor'] = floor;
    if (isAvailable != null) queryParams['isAvailable'] = isAvailable.toString();

    final response = await _apiClient.get(
      '$_basePath/desks',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => CoworkingDesk.fromJson(json),
    );
  }

  Future<CoworkingDesk> getDesk(String id) async {
    final response = await _apiClient.get('$_basePath/desks/$id');
    return CoworkingDesk.fromJson(response.data as Map<String, dynamic>);
  }

  Future<CoworkingDesk> createDesk(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/desks', data: data);
    return CoworkingDesk.fromJson(response.data as Map<String, dynamic>);
  }

  Future<CoworkingDesk> updateDesk(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/desks/$id', data: data);
    return CoworkingDesk.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteDesk(String id) async {
    await _apiClient.delete('$_basePath/desks/$id');
  }

  Future<Map<String, dynamic>> checkDeskAvailability(
    String deskId, {
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final response = await _apiClient.get(
      '$_basePath/desks/$deskId/availability',
      queryParameters: {
        'startDate': startDate.toIso8601String(),
        'endDate': endDate.toIso8601String(),
      },
    );
    return response.data as Map<String, dynamic>;
  }

  Future<PaginatedResponse<CoworkingBooking>> getBookings(
    PaginationParams params, {
    String? status,
    String? bookingType,
    String? memberId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null) queryParams['status'] = status;
    if (bookingType != null) queryParams['bookingType'] = bookingType;
    if (memberId != null) queryParams['memberId'] = memberId;
    if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
    if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

    final response = await _apiClient.get(
      '$_basePath/bookings',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => CoworkingBooking.fromJson(json),
    );
  }

  Future<CoworkingBooking> getBooking(String id) async {
    final response = await _apiClient.get('$_basePath/bookings/$id');
    return CoworkingBooking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<CoworkingBooking> createBooking(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/bookings', data: data);
    return CoworkingBooking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<CoworkingBooking> updateBooking(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/bookings/$id', data: data);
    return CoworkingBooking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<CoworkingBooking> cancelBooking(String id) async {
    final response = await _apiClient.patch('$_basePath/bookings/$id/cancel');
    return CoworkingBooking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<CoworkingMember>> getMembers(
    PaginationParams params, {
    String? membershipPlan,
    bool? isActive,
  }) async {
    final queryParams = params.toQueryParameters();
    if (membershipPlan != null) queryParams['membershipPlan'] = membershipPlan;
    if (isActive != null) queryParams['isActive'] = isActive.toString();

    final response = await _apiClient.get(
      '$_basePath/members',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => CoworkingMember.fromJson(json),
    );
  }

  Future<CoworkingMember> getMember(String id) async {
    final response = await _apiClient.get('$_basePath/members/$id');
    return CoworkingMember.fromJson(response.data as Map<String, dynamic>);
  }

  Future<CoworkingMember> createMember(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/members', data: data);
    return CoworkingMember.fromJson(response.data as Map<String, dynamic>);
  }

  Future<CoworkingMember> updateMember(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/members/$id', data: data);
    return CoworkingMember.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteMember(String id) async {
    await _apiClient.delete('$_basePath/members/$id');
  }

  Future<PaginatedResponse<CoworkingMeetingRoom>> getMeetingRooms(
    PaginationParams params, {
    int? minCapacity,
    bool? isAvailable,
  }) async {
    final queryParams = params.toQueryParameters();
    if (minCapacity != null) queryParams['minCapacity'] = minCapacity.toString();
    if (isAvailable != null) queryParams['isAvailable'] = isAvailable.toString();

    final response = await _apiClient.get(
      '$_basePath/meeting-rooms',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => CoworkingMeetingRoom.fromJson(json),
    );
  }

  Future<CoworkingMeetingRoom> getMeetingRoom(String id) async {
    final response = await _apiClient.get('$_basePath/meeting-rooms/$id');
    return CoworkingMeetingRoom.fromJson(response.data as Map<String, dynamic>);
  }

  Future<CoworkingMeetingRoom> createMeetingRoom(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/meeting-rooms', data: data);
    return CoworkingMeetingRoom.fromJson(response.data as Map<String, dynamic>);
  }

  Future<CoworkingMeetingRoom> updateMeetingRoom(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/meeting-rooms/$id', data: data);
    return CoworkingMeetingRoom.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteMeetingRoom(String id) async {
    await _apiClient.delete('$_basePath/meeting-rooms/$id');
  }

  Future<CoworkingBooking> bookMeetingRoom(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/meeting-rooms/book', data: data);
    return CoworkingBooking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _apiClient.get('$_basePath/dashboard/stats');
    return response.data as Map<String, dynamic>;
  }
}
