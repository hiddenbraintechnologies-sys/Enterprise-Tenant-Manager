import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/tour_package.dart';
import '../../domain/entities/tour_booking.dart';
import '../../domain/entities/tour_itinerary.dart';
import '../../domain/entities/tour_customer.dart';

class TourismRemoteDataSource {
  final ApiClient _apiClient;
  static const String _basePath = '/api/tourism';

  TourismRemoteDataSource(this._apiClient);

  Future<PaginatedResponse<TourPackage>> getPackages(
    PaginationParams params, {
    String? category,
    String? destination,
    bool? isActive,
  }) async {
    final queryParams = params.toQueryParameters();
    if (category != null) queryParams['category'] = category;
    if (destination != null) queryParams['destination'] = destination;
    if (isActive != null) queryParams['isActive'] = isActive.toString();

    final response = await _apiClient.get(
      '$_basePath/packages',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => TourPackage.fromJson(json),
    );
  }

  Future<TourPackage> getPackage(String id) async {
    final response = await _apiClient.get('$_basePath/packages/$id');
    return TourPackage.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TourPackage> createPackage(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/packages', data: data);
    return TourPackage.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TourPackage> updatePackage(
      String id, Map<String, dynamic> data) async {
    final response =
        await _apiClient.patch('$_basePath/packages/$id', data: data);
    return TourPackage.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deletePackage(String id) async {
    await _apiClient.delete('$_basePath/packages/$id');
  }

  Future<PaginatedResponse<TourBooking>> getBookings(
    PaginationParams params, {
    String? status,
    String? paymentStatus,
    String? packageId,
    String? customerId,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null && status != 'all') queryParams['status'] = status;
    if (paymentStatus != null && paymentStatus != 'all') {
      queryParams['paymentStatus'] = paymentStatus;
    }
    if (packageId != null) queryParams['packageId'] = packageId;
    if (customerId != null) queryParams['customerId'] = customerId;

    final response = await _apiClient.get(
      '$_basePath/bookings',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => TourBooking.fromJson(json),
    );
  }

  Future<TourBooking> getBooking(String id) async {
    final response = await _apiClient.get('$_basePath/bookings/$id');
    return TourBooking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TourBooking> createBooking(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/bookings', data: data);
    return TourBooking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TourBooking> updateBooking(
      String id, Map<String, dynamic> data) async {
    final response =
        await _apiClient.patch('$_basePath/bookings/$id', data: data);
    return TourBooking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TourBooking> cancelBooking(String id) async {
    final response = await _apiClient.patch('$_basePath/bookings/$id/cancel');
    return TourBooking.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<TourItinerary>> getItineraries(String packageId) async {
    final response = await _apiClient
        .get('$_basePath/packages/$packageId/itineraries');
    final List<dynamic> data = response.data as List<dynamic>;
    return data
        .map((json) => TourItinerary.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<TourItinerary> createItinerary(Map<String, dynamic> data) async {
    final response =
        await _apiClient.post('$_basePath/itineraries', data: data);
    return TourItinerary.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TourItinerary> updateItinerary(
      String id, Map<String, dynamic> data) async {
    final response =
        await _apiClient.patch('$_basePath/itineraries/$id', data: data);
    return TourItinerary.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteItinerary(String id) async {
    await _apiClient.delete('$_basePath/itineraries/$id');
  }

  Future<PaginatedResponse<TourCustomer>> getCustomers(
    PaginationParams params, {
    String? search,
  }) async {
    final queryParams = params.toQueryParameters();
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    final response = await _apiClient.get(
      '$_basePath/customers',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => TourCustomer.fromJson(json),
    );
  }

  Future<TourCustomer> getCustomer(String id) async {
    final response = await _apiClient.get('$_basePath/customers/$id');
    return TourCustomer.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TourCustomer> createCustomer(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/customers', data: data);
    return TourCustomer.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TourCustomer> updateCustomer(
      String id, Map<String, dynamic> data) async {
    final response =
        await _apiClient.patch('$_basePath/customers/$id', data: data);
    return TourCustomer.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _apiClient.get('$_basePath/dashboard/stats');
    return response.data as Map<String, dynamic>;
  }
}
