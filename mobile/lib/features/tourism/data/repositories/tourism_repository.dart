/// Tourism Repository
library tourism_repository;

import 'package:dio/dio.dart';
import '../models/tourism_models.dart';
import '../../legal/data/models/legal_models.dart' show PaginatedResponse, PaginationInfo;

class TourismRepository {
  final Dio _dio;

  TourismRepository(this._dio);

  Future<TourDashboardStats> getDashboardStats() async {
    final response = await _dio.get('/api/tourism/dashboard');
    return TourDashboardStats.fromJson(response.data);
  }

  Future<PaginatedResponse<TourPackage>> getPackages({int page = 1, int limit = 20, String? status}) async {
    final response = await _dio.get('/api/tourism/packages', queryParameters: {
      'page': page,
      'limit': limit,
      if (status != null) 'status': status,
    });
    final data = (response.data['data'] as List).map((e) => TourPackage.fromJson(e)).toList();
    final pagination = PaginationInfo.fromJson(response.data['pagination']);
    return PaginatedResponse(data: data, pagination: pagination);
  }

  Future<TourPackage> createPackage(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/tourism/packages', data: data);
    return TourPackage.fromJson(response.data);
  }

  Future<PaginatedResponse<TourBooking>> getBookings({int page = 1, int limit = 20, String? status}) async {
    final response = await _dio.get('/api/tourism/bookings', queryParameters: {
      'page': page,
      'limit': limit,
      if (status != null) 'status': status,
    });
    final data = (response.data['data'] as List).map((e) => TourBooking.fromJson(e)).toList();
    final pagination = PaginationInfo.fromJson(response.data['pagination']);
    return PaginatedResponse(data: data, pagination: pagination);
  }

  Future<TourBooking> createBooking(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/tourism/bookings', data: data);
    return TourBooking.fromJson(response.data);
  }

  Future<TourBooking> updateBookingStatus(String id, String status) async {
    final response = await _dio.patch('/api/tourism/bookings/$id/status', data: {'status': status});
    return TourBooking.fromJson(response.data);
  }
}
