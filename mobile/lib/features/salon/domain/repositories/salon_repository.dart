import '../../../../core/network/pagination.dart';
import '../entities/salon_service.dart';
import '../entities/salon_appointment.dart';
import '../entities/salon_staff.dart';
import '../entities/salon_customer.dart';

abstract class SalonRepository {
  Future<PaginatedResponse<SalonService>> getServices(
    PaginationParams params, {
    String? category,
    bool? isActive,
  });

  Future<SalonService> getService(String id);

  Future<SalonService> createService(Map<String, dynamic> data);

  Future<SalonService> updateService(String id, Map<String, dynamic> data);

  Future<void> deleteService(String id);

  Future<PaginatedResponse<SalonAppointment>> getAppointments(
    PaginationParams params, {
    String? status,
    String? staffId,
    String? customerId,
    DateTime? startDate,
    DateTime? endDate,
  });

  Future<SalonAppointment> getAppointment(String id);

  Future<SalonAppointment> createAppointment(Map<String, dynamic> data);

  Future<SalonAppointment> updateAppointment(String id, Map<String, dynamic> data);

  Future<SalonAppointment> cancelAppointment(String id);

  Future<PaginatedResponse<SalonStaff>> getStaff(
    PaginationParams params, {
    bool? isActive,
    String? specialization,
  });

  Future<SalonStaff> getStaffMember(String id);

  Future<SalonStaff> createStaff(Map<String, dynamic> data);

  Future<SalonStaff> updateStaff(String id, Map<String, dynamic> data);

  Future<PaginatedResponse<SalonCustomer>> getCustomers(
    PaginationParams params, {
    String? search,
    int? minLoyaltyPoints,
  });

  Future<SalonCustomer> getCustomer(String id);

  Future<SalonCustomer> createCustomer(Map<String, dynamic> data);

  Future<SalonCustomer> updateCustomer(String id, Map<String, dynamic> data);

  Future<Map<String, dynamic>> getDashboardStats();

  Future<List<SalonAppointment>> getTodayAppointments();
}
