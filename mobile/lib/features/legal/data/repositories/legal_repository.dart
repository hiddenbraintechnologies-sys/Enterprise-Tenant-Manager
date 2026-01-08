/// Legal Services Repository
///
/// API communication layer for the Legal Services module.
library legal_repository;

import 'package:dio/dio.dart';
import '../models/legal_models.dart';

class LegalRepository {
  final Dio _dio;

  LegalRepository(this._dio);

  Future<LegalDashboardStats> getDashboardStats() async {
    final response = await _dio.get('/api/legal/dashboard');
    return LegalDashboardStats.fromJson(response.data);
  }

  Future<PaginatedResponse<LegalClient>> getClients({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
    String? clientType,
  }) async {
    final response = await _dio.get('/api/legal/clients', queryParameters: {
      'page': page,
      'limit': limit,
      if (search != null) 'search': search,
      if (status != null) 'status': status,
      if (clientType != null) 'clientType': clientType,
    });
    
    final data = (response.data['data'] as List)
        .map((e) => LegalClient.fromJson(e))
        .toList();
    final pagination = PaginationInfo.fromJson(response.data['pagination']);
    
    return PaginatedResponse(data: data, pagination: pagination);
  }

  Future<LegalClient> getClient(String id) async {
    final response = await _dio.get('/api/legal/clients/$id');
    return LegalClient.fromJson(response.data);
  }

  Future<LegalClient> createClient(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/legal/clients', data: data);
    return LegalClient.fromJson(response.data);
  }

  Future<LegalClient> updateClient(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('/api/legal/clients/$id', data: data);
    return LegalClient.fromJson(response.data);
  }

  Future<void> deleteClient(String id) async {
    await _dio.delete('/api/legal/clients/$id');
  }

  Future<PaginatedResponse<LegalCase>> getCases({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
    String? caseType,
    String? clientId,
  }) async {
    final response = await _dio.get('/api/legal/cases', queryParameters: {
      'page': page,
      'limit': limit,
      if (search != null) 'search': search,
      if (status != null) 'status': status,
      if (caseType != null) 'caseType': caseType,
      if (clientId != null) 'clientId': clientId,
    });
    
    final data = (response.data['data'] as List)
        .map((e) => LegalCase.fromJson(e))
        .toList();
    final pagination = PaginationInfo.fromJson(response.data['pagination']);
    
    return PaginatedResponse(data: data, pagination: pagination);
  }

  Future<LegalCase> getCase(String id) async {
    final response = await _dio.get('/api/legal/cases/$id');
    return LegalCase.fromJson(response.data);
  }

  Future<LegalCase> createCase(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/legal/cases', data: data);
    return LegalCase.fromJson(response.data);
  }

  Future<LegalCase> updateCase(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('/api/legal/cases/$id', data: data);
    return LegalCase.fromJson(response.data);
  }

  Future<void> deleteCase(String id) async {
    await _dio.delete('/api/legal/cases/$id');
  }
}
