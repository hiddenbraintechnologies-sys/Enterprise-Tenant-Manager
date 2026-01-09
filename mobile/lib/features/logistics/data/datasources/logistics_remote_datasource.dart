import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/logistics_order.dart';
import '../../domain/entities/logistics_vehicle.dart';
import '../../domain/entities/logistics_driver.dart';
import '../../domain/entities/logistics_tracking.dart';

class LogisticsRemoteDataSource {
  final ApiClient _apiClient;
  static const String _basePath = '/api/logistics';

  LogisticsRemoteDataSource(this._apiClient);

  Future<PaginatedResponse<LogisticsOrder>> getOrders(
    PaginationParams params, {
    String? status,
    String? driverId,
    String? customerId,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null && status != 'all') queryParams['status'] = status;
    if (driverId != null) queryParams['driverId'] = driverId;
    if (customerId != null) queryParams['customerId'] = customerId;

    final response = await _apiClient.get(
      '$_basePath/orders',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => LogisticsOrder.fromJson(json),
    );
  }

  Future<LogisticsOrder> getOrder(String id) async {
    final response = await _apiClient.get('$_basePath/orders/$id');
    return LogisticsOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<LogisticsOrder> createOrder(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/orders', data: data);
    return LogisticsOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<LogisticsOrder> updateOrder(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/orders/$id', data: data);
    return LogisticsOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<LogisticsOrder> assignDriver(String orderId, String driverId, {String? vehicleId}) async {
    final data = <String, dynamic>{
      'driverId': driverId,
    };
    if (vehicleId != null) data['vehicleId'] = vehicleId;

    final response = await _apiClient.post('$_basePath/orders/$orderId/assign', data: data);
    return LogisticsOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<LogisticsOrder> updateOrderStatus(String orderId, String status, {String? notes}) async {
    final data = <String, dynamic>{
      'status': status,
    };
    if (notes != null) data['notes'] = notes;

    final response = await _apiClient.patch('$_basePath/orders/$orderId/status', data: data);
    return LogisticsOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<LogisticsVehicle>> getVehicles(
    PaginationParams params, {
    String? type,
    String? status,
  }) async {
    final queryParams = params.toQueryParameters();
    if (type != null && type != 'all') queryParams['type'] = type;
    if (status != null && status != 'all') queryParams['status'] = status;

    final response = await _apiClient.get(
      '$_basePath/vehicles',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => LogisticsVehicle.fromJson(json),
    );
  }

  Future<LogisticsVehicle> getVehicle(String id) async {
    final response = await _apiClient.get('$_basePath/vehicles/$id');
    return LogisticsVehicle.fromJson(response.data as Map<String, dynamic>);
  }

  Future<LogisticsVehicle> createVehicle(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/vehicles', data: data);
    return LogisticsVehicle.fromJson(response.data as Map<String, dynamic>);
  }

  Future<LogisticsVehicle> updateVehicle(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/vehicles/$id', data: data);
    return LogisticsVehicle.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<LogisticsVehicle>> getAvailableVehicles() async {
    final response = await _apiClient.get('$_basePath/vehicles/available');
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => LogisticsVehicle.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<PaginatedResponse<LogisticsDriver>> getDrivers(
    PaginationParams params, {
    String? status,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null && status != 'all') queryParams['status'] = status;

    final response = await _apiClient.get(
      '$_basePath/drivers',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => LogisticsDriver.fromJson(json),
    );
  }

  Future<LogisticsDriver> getDriver(String id) async {
    final response = await _apiClient.get('$_basePath/drivers/$id');
    return LogisticsDriver.fromJson(response.data as Map<String, dynamic>);
  }

  Future<LogisticsDriver> createDriver(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/drivers', data: data);
    return LogisticsDriver.fromJson(response.data as Map<String, dynamic>);
  }

  Future<LogisticsDriver> updateDriver(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/drivers/$id', data: data);
    return LogisticsDriver.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<LogisticsDriver>> getAvailableDrivers() async {
    final response = await _apiClient.get('$_basePath/drivers/available');
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => LogisticsDriver.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<List<LogisticsTracking>> getOrderTracking(String orderId) async {
    final response = await _apiClient.get('$_basePath/orders/$orderId/tracking');
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => LogisticsTracking.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<LogisticsTracking> addTrackingUpdate(String orderId, Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/orders/$orderId/tracking', data: data);
    return LogisticsTracking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _apiClient.get('$_basePath/dashboard/stats');
    return response.data as Map<String, dynamic>;
  }
}
