import '../../../../core/network/pagination.dart';
import '../entities/pg_room.dart';
import '../entities/pg_resident.dart';
import '../entities/pg_payment.dart';
import '../entities/pg_maintenance.dart';

abstract class PgRepository {
  Future<PaginatedResponse<PgRoom>> getRooms(
    PaginationParams params, {
    String? type,
    bool? isOccupied,
    int? floor,
  });

  Future<PgRoom> getRoom(String id);

  Future<PgRoom> createRoom(Map<String, dynamic> data);

  Future<PgRoom> updateRoom(String id, Map<String, dynamic> data);

  Future<List<PgRoom>> getAvailableRooms();

  Future<PaginatedResponse<PgResident>> getResidents(
    PaginationParams params, {
    String? status,
    String? roomId,
  });

  Future<PgResident> getResident(String id);

  Future<PgResident> createResident(Map<String, dynamic> data);

  Future<PgResident> updateResident(String id, Map<String, dynamic> data);

  Future<PgResident> checkOutResident(String id, {DateTime? checkOutDate});

  Future<PaginatedResponse<PgPayment>> getPayments(
    PaginationParams params, {
    String? status,
    String? type,
    String? residentId,
    int? month,
    int? year,
  });

  Future<PgPayment> createPayment(Map<String, dynamic> data);

  Future<PgPayment> updatePayment(String id, Map<String, dynamic> data);

  Future<PgPayment> collectPayment(
    String id, {
    required String paymentMethod,
    String? transactionId,
    String? notes,
  });

  Future<List<PgPayment>> getOverduePayments();

  Future<PaginatedResponse<PgMaintenance>> getMaintenanceRequests(
    PaginationParams params, {
    String? status,
    String? priority,
    String? roomId,
  });

  Future<PgMaintenance> createMaintenanceRequest(Map<String, dynamic> data);

  Future<PgMaintenance> updateMaintenanceRequest(
      String id, Map<String, dynamic> data);

  Future<PgMaintenance> completeMaintenanceRequest(String id, {double? actualCost});

  Future<Map<String, dynamic>> getDashboardStats();
}
