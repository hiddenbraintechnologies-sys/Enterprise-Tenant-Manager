import '../../../../core/network/pagination.dart';
import '../../domain/entities/salon_service.dart';
import '../../domain/entities/salon_appointment.dart';
import '../../domain/entities/salon_staff.dart';
import '../../domain/entities/salon_customer.dart';
import '../../domain/repositories/salon_repository.dart';
import '../datasources/salon_remote_datasource.dart';

class SalonRepositoryImpl implements SalonRepository {
  final SalonRemoteDataSource _remoteDataSource;

  SalonRepositoryImpl(this._remoteDataSource);

  @override
  Future<PaginatedResponse<SalonService>> getServices(
    PaginationParams params, {
    String? category,
    bool? isActive,
  }) {
    return _remoteDataSource.getServices(
      params,
      category: category,
      isActive: isActive,
    );
  }

  @override
  Future<SalonService> getService(String id) {
    return _remoteDataSource.getService(id);
  }

  @override
  Future<SalonService> createService(Map<String, dynamic> data) {
    return _remoteDataSource.createService(data);
  }

  @override
  Future<SalonService> updateService(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateService(id, data);
  }

  @override
  Future<void> deleteService(String id) {
    return _remoteDataSource.deleteService(id);
  }

  @override
  Future<PaginatedResponse<SalonAppointment>> getAppointments(
    PaginationParams params, {
    String? status,
    String? staffId,
    String? customerId,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    return _remoteDataSource.getAppointments(
      params,
      status: status,
      staffId: staffId,
      customerId: customerId,
      startDate: startDate,
      endDate: endDate,
    );
  }

  @override
  Future<SalonAppointment> getAppointment(String id) {
    return _remoteDataSource.getAppointment(id);
  }

  @override
  Future<SalonAppointment> createAppointment(Map<String, dynamic> data) {
    return _remoteDataSource.createAppointment(data);
  }

  @override
  Future<SalonAppointment> updateAppointment(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateAppointment(id, data);
  }

  @override
  Future<SalonAppointment> cancelAppointment(String id) {
    return _remoteDataSource.cancelAppointment(id);
  }

  @override
  Future<PaginatedResponse<SalonStaff>> getStaff(
    PaginationParams params, {
    bool? isActive,
    String? specialization,
  }) {
    return _remoteDataSource.getStaff(
      params,
      isActive: isActive,
      specialization: specialization,
    );
  }

  @override
  Future<SalonStaff> getStaffMember(String id) {
    return _remoteDataSource.getStaffMember(id);
  }

  @override
  Future<SalonStaff> createStaff(Map<String, dynamic> data) {
    return _remoteDataSource.createStaff(data);
  }

  @override
  Future<SalonStaff> updateStaff(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateStaff(id, data);
  }

  @override
  Future<PaginatedResponse<SalonCustomer>> getCustomers(
    PaginationParams params, {
    String? search,
    int? minLoyaltyPoints,
  }) {
    return _remoteDataSource.getCustomers(
      params,
      search: search,
      minLoyaltyPoints: minLoyaltyPoints,
    );
  }

  @override
  Future<SalonCustomer> getCustomer(String id) {
    return _remoteDataSource.getCustomer(id);
  }

  @override
  Future<SalonCustomer> createCustomer(Map<String, dynamic> data) {
    return _remoteDataSource.createCustomer(data);
  }

  @override
  Future<SalonCustomer> updateCustomer(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateCustomer(id, data);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() {
    return _remoteDataSource.getDashboardStats();
  }

  @override
  Future<List<SalonAppointment>> getTodayAppointments() {
    return _remoteDataSource.getTodayAppointments();
  }
}
