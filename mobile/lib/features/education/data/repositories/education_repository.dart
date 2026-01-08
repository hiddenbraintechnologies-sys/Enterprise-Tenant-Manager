/// Education Repository
library education_repository;

import 'package:dio/dio.dart';
import '../models/education_models.dart';
import '../../legal/data/models/legal_models.dart' show PaginatedResponse, PaginationInfo;

class EducationRepository {
  final Dio _dio;

  EducationRepository(this._dio);

  Future<EduDashboardStats> getDashboardStats() async {
    final response = await _dio.get('/api/education/dashboard');
    return EduDashboardStats.fromJson(response.data);
  }

  Future<PaginatedResponse<EduStudent>> getStudents({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
  }) async {
    final response = await _dio.get('/api/education/students', queryParameters: {
      'page': page,
      'limit': limit,
      if (search != null) 'search': search,
      if (status != null) 'status': status,
    });
    
    final data = (response.data['data'] as List).map((e) => EduStudent.fromJson(e)).toList();
    final pagination = PaginationInfo.fromJson(response.data['pagination']);
    return PaginatedResponse(data: data, pagination: pagination);
  }

  Future<EduStudent> createStudent(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/education/students', data: data);
    return EduStudent.fromJson(response.data);
  }

  Future<EduStudent> updateStudent(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('/api/education/students/$id', data: data);
    return EduStudent.fromJson(response.data);
  }

  Future<void> deleteStudent(String id) async {
    await _dio.delete('/api/education/students/$id');
  }

  Future<PaginatedResponse<EduCourse>> getCourses({int page = 1, int limit = 20}) async {
    final response = await _dio.get('/api/education/courses', queryParameters: {
      'page': page,
      'limit': limit,
    });
    final data = (response.data['data'] as List).map((e) => EduCourse.fromJson(e)).toList();
    final pagination = PaginationInfo.fromJson(response.data['pagination']);
    return PaginatedResponse(data: data, pagination: pagination);
  }

  Future<EduCourse> createCourse(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/education/courses', data: data);
    return EduCourse.fromJson(response.data);
  }

  Future<PaginatedResponse<EduBatch>> getBatches({int page = 1, int limit = 20}) async {
    final response = await _dio.get('/api/education/batches', queryParameters: {
      'page': page,
      'limit': limit,
    });
    final data = (response.data['data'] as List).map((e) => EduBatch.fromJson(e)).toList();
    final pagination = PaginationInfo.fromJson(response.data['pagination']);
    return PaginatedResponse(data: data, pagination: pagination);
  }

  Future<EduBatch> createBatch(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/education/batches', data: data);
    return EduBatch.fromJson(response.data);
  }
}
