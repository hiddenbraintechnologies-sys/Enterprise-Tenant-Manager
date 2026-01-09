import '../../../../core/network/pagination.dart';
import '../entities/tour_package.dart';
import '../entities/tour_booking.dart';
import '../entities/tour_itinerary.dart';
import '../entities/tour_customer.dart';

abstract class TourismRepository {
  Future<PaginatedResponse<TourPackage>> getPackages(
    PaginationParams params, {
    String? category,
    String? destination,
    bool? isActive,
  });

  Future<TourPackage> getPackage(String id);

  Future<TourPackage> createPackage(Map<String, dynamic> data);

  Future<TourPackage> updatePackage(String id, Map<String, dynamic> data);

  Future<void> deletePackage(String id);

  Future<PaginatedResponse<TourBooking>> getBookings(
    PaginationParams params, {
    String? status,
    String? paymentStatus,
    String? packageId,
    String? customerId,
  });

  Future<TourBooking> getBooking(String id);

  Future<TourBooking> createBooking(Map<String, dynamic> data);

  Future<TourBooking> updateBooking(String id, Map<String, dynamic> data);

  Future<TourBooking> cancelBooking(String id);

  Future<List<TourItinerary>> getItineraries(String packageId);

  Future<TourItinerary> createItinerary(Map<String, dynamic> data);

  Future<TourItinerary> updateItinerary(String id, Map<String, dynamic> data);

  Future<void> deleteItinerary(String id);

  Future<PaginatedResponse<TourCustomer>> getCustomers(
    PaginationParams params, {
    String? search,
  });

  Future<TourCustomer> getCustomer(String id);

  Future<TourCustomer> createCustomer(Map<String, dynamic> data);

  Future<TourCustomer> updateCustomer(String id, Map<String, dynamic> data);

  Future<Map<String, dynamic>> getDashboardStats();
}
