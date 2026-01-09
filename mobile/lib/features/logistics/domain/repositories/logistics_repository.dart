import '../../../../core/network/pagination.dart';
import '../entities/logistics_order.dart';
import '../entities/logistics_vehicle.dart';
import '../entities/logistics_driver.dart';
import '../entities/logistics_tracking.dart';

abstract class LogisticsRepository {
  Future<PaginatedResponse<LogisticsOrder>> getOrders(
    PaginationParams params, {
    String? status,
    String? driverId,
    String? customerId,
  });

  Future<LogisticsOrder> getOrder(String id);

  Future<LogisticsOrder> createOrder(Map<String, dynamic> data);

  Future<LogisticsOrder> updateOrder(String id, Map<String, dynamic> data);

  Future<LogisticsOrder> assignDriver(String orderId, String driverId, {String? vehicleId});

  Future<LogisticsOrder> updateOrderStatus(String orderId, String status, {String? notes});

  Future<PaginatedResponse<LogisticsVehicle>> getVehicles(
    PaginationParams params, {
    String? type,
    String? status,
  });

  Future<LogisticsVehicle> getVehicle(String id);

  Future<LogisticsVehicle> createVehicle(Map<String, dynamic> data);

  Future<LogisticsVehicle> updateVehicle(String id, Map<String, dynamic> data);

  Future<List<LogisticsVehicle>> getAvailableVehicles();

  Future<PaginatedResponse<LogisticsDriver>> getDrivers(
    PaginationParams params, {
    String? status,
  });

  Future<LogisticsDriver> getDriver(String id);

  Future<LogisticsDriver> createDriver(Map<String, dynamic> data);

  Future<LogisticsDriver> updateDriver(String id, Map<String, dynamic> data);

  Future<List<LogisticsDriver>> getAvailableDrivers();

  Future<List<LogisticsTracking>> getOrderTracking(String orderId);

  Future<LogisticsTracking> addTrackingUpdate(String orderId, Map<String, dynamic> data);

  Future<Map<String, dynamic>> getDashboardStats();
}
