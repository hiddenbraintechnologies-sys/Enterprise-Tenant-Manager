import '../../../../core/network/pagination.dart';
import '../../domain/entities/logistics_order.dart';
import '../../domain/entities/logistics_vehicle.dart';
import '../../domain/entities/logistics_driver.dart';
import '../../domain/entities/logistics_tracking.dart';
import '../../domain/repositories/logistics_repository.dart';
import '../datasources/logistics_remote_datasource.dart';

class LogisticsRepositoryImpl implements LogisticsRepository {
  final LogisticsRemoteDataSource _remoteDataSource;

  LogisticsRepositoryImpl(this._remoteDataSource);

  @override
  Future<PaginatedResponse<LogisticsOrder>> getOrders(
    PaginationParams params, {
    String? status,
    String? driverId,
    String? customerId,
  }) {
    return _remoteDataSource.getOrders(
      params,
      status: status,
      driverId: driverId,
      customerId: customerId,
    );
  }

  @override
  Future<LogisticsOrder> getOrder(String id) {
    return _remoteDataSource.getOrder(id);
  }

  @override
  Future<LogisticsOrder> createOrder(Map<String, dynamic> data) {
    return _remoteDataSource.createOrder(data);
  }

  @override
  Future<LogisticsOrder> updateOrder(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateOrder(id, data);
  }

  @override
  Future<LogisticsOrder> assignDriver(String orderId, String driverId, {String? vehicleId}) {
    return _remoteDataSource.assignDriver(orderId, driverId, vehicleId: vehicleId);
  }

  @override
  Future<LogisticsOrder> updateOrderStatus(String orderId, String status, {String? notes}) {
    return _remoteDataSource.updateOrderStatus(orderId, status, notes: notes);
  }

  @override
  Future<PaginatedResponse<LogisticsVehicle>> getVehicles(
    PaginationParams params, {
    String? type,
    String? status,
  }) {
    return _remoteDataSource.getVehicles(
      params,
      type: type,
      status: status,
    );
  }

  @override
  Future<LogisticsVehicle> getVehicle(String id) {
    return _remoteDataSource.getVehicle(id);
  }

  @override
  Future<LogisticsVehicle> createVehicle(Map<String, dynamic> data) {
    return _remoteDataSource.createVehicle(data);
  }

  @override
  Future<LogisticsVehicle> updateVehicle(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateVehicle(id, data);
  }

  @override
  Future<List<LogisticsVehicle>> getAvailableVehicles() {
    return _remoteDataSource.getAvailableVehicles();
  }

  @override
  Future<PaginatedResponse<LogisticsDriver>> getDrivers(
    PaginationParams params, {
    String? status,
  }) {
    return _remoteDataSource.getDrivers(
      params,
      status: status,
    );
  }

  @override
  Future<LogisticsDriver> getDriver(String id) {
    return _remoteDataSource.getDriver(id);
  }

  @override
  Future<LogisticsDriver> createDriver(Map<String, dynamic> data) {
    return _remoteDataSource.createDriver(data);
  }

  @override
  Future<LogisticsDriver> updateDriver(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateDriver(id, data);
  }

  @override
  Future<List<LogisticsDriver>> getAvailableDrivers() {
    return _remoteDataSource.getAvailableDrivers();
  }

  @override
  Future<List<LogisticsTracking>> getOrderTracking(String orderId) {
    return _remoteDataSource.getOrderTracking(orderId);
  }

  @override
  Future<LogisticsTracking> addTrackingUpdate(String orderId, Map<String, dynamic> data) {
    return _remoteDataSource.addTrackingUpdate(orderId, data);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() {
    return _remoteDataSource.getDashboardStats();
  }
}
