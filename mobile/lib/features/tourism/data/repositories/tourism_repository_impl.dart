import '../../../../core/network/pagination.dart';
import '../../domain/entities/tour_package.dart';
import '../../domain/entities/tour_booking.dart';
import '../../domain/entities/tour_itinerary.dart';
import '../../domain/entities/tour_customer.dart';
import '../../domain/repositories/tourism_repository.dart';
import '../datasources/tourism_remote_datasource.dart';

class TourismRepositoryImpl implements TourismRepository {
  final TourismRemoteDataSource _remoteDataSource;

  TourismRepositoryImpl(this._remoteDataSource);

  @override
  Future<PaginatedResponse<TourPackage>> getPackages(
    PaginationParams params, {
    String? category,
    String? destination,
    bool? isActive,
  }) {
    return _remoteDataSource.getPackages(
      params,
      category: category,
      destination: destination,
      isActive: isActive,
    );
  }

  @override
  Future<TourPackage> getPackage(String id) {
    return _remoteDataSource.getPackage(id);
  }

  @override
  Future<TourPackage> createPackage(Map<String, dynamic> data) {
    return _remoteDataSource.createPackage(data);
  }

  @override
  Future<TourPackage> updatePackage(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updatePackage(id, data);
  }

  @override
  Future<void> deletePackage(String id) {
    return _remoteDataSource.deletePackage(id);
  }

  @override
  Future<PaginatedResponse<TourBooking>> getBookings(
    PaginationParams params, {
    String? status,
    String? paymentStatus,
    String? packageId,
    String? customerId,
  }) {
    return _remoteDataSource.getBookings(
      params,
      status: status,
      paymentStatus: paymentStatus,
      packageId: packageId,
      customerId: customerId,
    );
  }

  @override
  Future<TourBooking> getBooking(String id) {
    return _remoteDataSource.getBooking(id);
  }

  @override
  Future<TourBooking> createBooking(Map<String, dynamic> data) {
    return _remoteDataSource.createBooking(data);
  }

  @override
  Future<TourBooking> updateBooking(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateBooking(id, data);
  }

  @override
  Future<TourBooking> cancelBooking(String id) {
    return _remoteDataSource.cancelBooking(id);
  }

  @override
  Future<List<TourItinerary>> getItineraries(String packageId) {
    return _remoteDataSource.getItineraries(packageId);
  }

  @override
  Future<TourItinerary> createItinerary(Map<String, dynamic> data) {
    return _remoteDataSource.createItinerary(data);
  }

  @override
  Future<TourItinerary> updateItinerary(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateItinerary(id, data);
  }

  @override
  Future<void> deleteItinerary(String id) {
    return _remoteDataSource.deleteItinerary(id);
  }

  @override
  Future<PaginatedResponse<TourCustomer>> getCustomers(
    PaginationParams params, {
    String? search,
  }) {
    return _remoteDataSource.getCustomers(params, search: search);
  }

  @override
  Future<TourCustomer> getCustomer(String id) {
    return _remoteDataSource.getCustomer(id);
  }

  @override
  Future<TourCustomer> createCustomer(Map<String, dynamic> data) {
    return _remoteDataSource.createCustomer(data);
  }

  @override
  Future<TourCustomer> updateCustomer(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateCustomer(id, data);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() {
    return _remoteDataSource.getDashboardStats();
  }
}
