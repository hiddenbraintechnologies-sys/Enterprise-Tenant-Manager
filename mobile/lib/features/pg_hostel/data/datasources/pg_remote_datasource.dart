import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/pg_room.dart';
import '../../domain/entities/pg_resident.dart';
import '../../domain/entities/pg_payment.dart';
import '../../domain/entities/pg_maintenance.dart';

class PgRemoteDataSource {
  final ApiClient _apiClient;
  static const String _basePath = '/api/pg-hostel';

  PgRemoteDataSource(this._apiClient);

  Future<PaginatedResponse<PgRoom>> getRooms(
    PaginationParams params, {
    String? type,
    bool? isOccupied,
    int? floor,
  }) async {
    final queryParams = params.toQueryParameters();
    if (type != null) queryParams['type'] = type;
    if (isOccupied != null) queryParams['isOccupied'] = isOccupied.toString();
    if (floor != null) queryParams['floor'] = floor.toString();

    final response = await _apiClient.get(
      '$_basePath/rooms',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => PgRoom.fromJson(json),
    );
  }

  Future<PgRoom> getRoom(String id) async {
    final response = await _apiClient.get('$_basePath/rooms/$id');
    return PgRoom.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PgRoom> createRoom(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/rooms', data: data);
    return PgRoom.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PgRoom> updateRoom(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/rooms/$id', data: data);
    return PgRoom.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<PgRoom>> getAvailableRooms() async {
    final response = await _apiClient.get('$_basePath/rooms/available');
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => PgRoom.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<PaginatedResponse<PgResident>> getResidents(
    PaginationParams params, {
    String? status,
    String? roomId,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null) queryParams['status'] = status;
    if (roomId != null) queryParams['roomId'] = roomId;

    final response = await _apiClient.get(
      '$_basePath/residents',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => PgResident.fromJson(json),
    );
  }

  Future<PgResident> getResident(String id) async {
    final response = await _apiClient.get('$_basePath/residents/$id');
    return PgResident.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PgResident> createResident(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/residents', data: data);
    return PgResident.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PgResident> updateResident(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/residents/$id', data: data);
    return PgResident.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PgResident> checkOutResident(String id, {DateTime? checkOutDate}) async {
    final data = <String, dynamic>{};
    if (checkOutDate != null) {
      data['checkOutDate'] = checkOutDate.toIso8601String();
    }
    final response = await _apiClient.post('$_basePath/residents/$id/checkout', data: data);
    return PgResident.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<PgPayment>> getPayments(
    PaginationParams params, {
    String? status,
    String? type,
    String? residentId,
    int? month,
    int? year,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null) queryParams['status'] = status;
    if (type != null) queryParams['type'] = type;
    if (residentId != null) queryParams['residentId'] = residentId;
    if (month != null) queryParams['month'] = month.toString();
    if (year != null) queryParams['year'] = year.toString();

    final response = await _apiClient.get(
      '$_basePath/payments',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => PgPayment.fromJson(json),
    );
  }

  Future<PgPayment> createPayment(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/payments', data: data);
    return PgPayment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PgPayment> updatePayment(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/payments/$id', data: data);
    return PgPayment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PgPayment> collectPayment(
    String id, {
    required String paymentMethod,
    String? transactionId,
    String? notes,
  }) async {
    final data = <String, dynamic>{
      'paymentMethod': paymentMethod,
      'status': 'paid',
      'paidDate': DateTime.now().toIso8601String(),
    };
    if (transactionId != null) data['transactionId'] = transactionId;
    if (notes != null) data['notes'] = notes;

    final response = await _apiClient.post('$_basePath/payments/$id/collect', data: data);
    return PgPayment.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<PgPayment>> getOverduePayments() async {
    final response = await _apiClient.get('$_basePath/payments/overdue');
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => PgPayment.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<PaginatedResponse<PgMaintenance>> getMaintenanceRequests(
    PaginationParams params, {
    String? status,
    String? priority,
    String? roomId,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null) queryParams['status'] = status;
    if (priority != null) queryParams['priority'] = priority;
    if (roomId != null) queryParams['roomId'] = roomId;

    final response = await _apiClient.get(
      '$_basePath/maintenance',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => PgMaintenance.fromJson(json),
    );
  }

  Future<PgMaintenance> createMaintenanceRequest(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/maintenance', data: data);
    return PgMaintenance.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PgMaintenance> updateMaintenanceRequest(
      String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/maintenance/$id', data: data);
    return PgMaintenance.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PgMaintenance> completeMaintenanceRequest(String id, {double? actualCost}) async {
    final data = <String, dynamic>{
      'status': 'completed',
      'completedAt': DateTime.now().toIso8601String(),
    };
    if (actualCost != null) data['actualCost'] = actualCost;

    final response = await _apiClient.post('$_basePath/maintenance/$id/complete', data: data);
    return PgMaintenance.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _apiClient.get('$_basePath/dashboard/stats');
    return response.data as Map<String, dynamic>;
  }
}
