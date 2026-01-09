import '../../../../core/network/pagination.dart';
import '../../domain/entities/pg_room.dart';
import '../../domain/entities/pg_resident.dart';
import '../../domain/entities/pg_payment.dart';
import '../../domain/entities/pg_maintenance.dart';
import '../../domain/repositories/pg_repository.dart';
import '../datasources/pg_remote_datasource.dart';

class PgRepositoryImpl implements PgRepository {
  final PgRemoteDataSource _remoteDataSource;

  PgRepositoryImpl(this._remoteDataSource);

  @override
  Future<PaginatedResponse<PgRoom>> getRooms(
    PaginationParams params, {
    String? type,
    bool? isOccupied,
    int? floor,
  }) {
    return _remoteDataSource.getRooms(
      params,
      type: type,
      isOccupied: isOccupied,
      floor: floor,
    );
  }

  @override
  Future<PgRoom> getRoom(String id) {
    return _remoteDataSource.getRoom(id);
  }

  @override
  Future<PgRoom> createRoom(Map<String, dynamic> data) {
    return _remoteDataSource.createRoom(data);
  }

  @override
  Future<PgRoom> updateRoom(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateRoom(id, data);
  }

  @override
  Future<List<PgRoom>> getAvailableRooms() {
    return _remoteDataSource.getAvailableRooms();
  }

  @override
  Future<PaginatedResponse<PgResident>> getResidents(
    PaginationParams params, {
    String? status,
    String? roomId,
  }) {
    return _remoteDataSource.getResidents(
      params,
      status: status,
      roomId: roomId,
    );
  }

  @override
  Future<PgResident> getResident(String id) {
    return _remoteDataSource.getResident(id);
  }

  @override
  Future<PgResident> createResident(Map<String, dynamic> data) {
    return _remoteDataSource.createResident(data);
  }

  @override
  Future<PgResident> updateResident(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateResident(id, data);
  }

  @override
  Future<PgResident> checkOutResident(String id, {DateTime? checkOutDate}) {
    return _remoteDataSource.checkOutResident(id, checkOutDate: checkOutDate);
  }

  @override
  Future<PaginatedResponse<PgPayment>> getPayments(
    PaginationParams params, {
    String? status,
    String? type,
    String? residentId,
    int? month,
    int? year,
  }) {
    return _remoteDataSource.getPayments(
      params,
      status: status,
      type: type,
      residentId: residentId,
      month: month,
      year: year,
    );
  }

  @override
  Future<PgPayment> createPayment(Map<String, dynamic> data) {
    return _remoteDataSource.createPayment(data);
  }

  @override
  Future<PgPayment> updatePayment(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updatePayment(id, data);
  }

  @override
  Future<PgPayment> collectPayment(
    String id, {
    required String paymentMethod,
    String? transactionId,
    String? notes,
  }) {
    return _remoteDataSource.collectPayment(
      id,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      notes: notes,
    );
  }

  @override
  Future<List<PgPayment>> getOverduePayments() {
    return _remoteDataSource.getOverduePayments();
  }

  @override
  Future<PaginatedResponse<PgMaintenance>> getMaintenanceRequests(
    PaginationParams params, {
    String? status,
    String? priority,
    String? roomId,
  }) {
    return _remoteDataSource.getMaintenanceRequests(
      params,
      status: status,
      priority: priority,
      roomId: roomId,
    );
  }

  @override
  Future<PgMaintenance> createMaintenanceRequest(Map<String, dynamic> data) {
    return _remoteDataSource.createMaintenanceRequest(data);
  }

  @override
  Future<PgMaintenance> updateMaintenanceRequest(
      String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateMaintenanceRequest(id, data);
  }

  @override
  Future<PgMaintenance> completeMaintenanceRequest(String id, {double? actualCost}) {
    return _remoteDataSource.completeMaintenanceRequest(id, actualCost: actualCost);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() {
    return _remoteDataSource.getDashboardStats();
  }
}
