import 'package:dio/dio.dart';
import '../models/hr_models.dart';

class HrRepository {
  final Dio _dio;

  HrRepository(this._dio);

  Future<HrDashboardStats> getDashboardStats() async {
    final response = await _dio.get('/api/hr/dashboard');
    return HrDashboardStats.fromJson(response.data);
  }

  Future<PaginatedResponse<HrEmployee>> getEmployees({
    String? status,
    String? departmentId,
    String? search,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get('/api/hr/employees', queryParameters: {
      if (status != null) 'status': status,
      if (departmentId != null) 'departmentId': departmentId,
      if (search != null && search.isNotEmpty) 'search': search,
      'page': page,
      'limit': limit,
    });

    final data = response.data;
    final list = (data['data'] as List? ?? [])
        .map((e) => HrEmployee.fromJson(e))
        .toList();

    return PaginatedResponse(
      data: list,
      total: data['total'] ?? list.length,
      page: data['page'] ?? page,
      limit: data['limit'] ?? limit,
      totalPages: data['totalPages'] ?? 1,
    );
  }

  Future<HrEmployee> getEmployee(String id) async {
    final response = await _dio.get('/api/hr/employees/$id');
    return HrEmployee.fromJson(response.data);
  }

  Future<HrEmployee> createEmployee(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/hr/employees', data: data);
    return HrEmployee.fromJson(response.data);
  }

  Future<HrEmployee> updateEmployee(String id, Map<String, dynamic> data) async {
    final response = await _dio.patch('/api/hr/employees/$id', data: data);
    return HrEmployee.fromJson(response.data);
  }

  Future<void> deleteEmployee(String id) async {
    await _dio.delete('/api/hr/employees/$id');
  }

  Future<List<HrDepartment>> getDepartments() async {
    final response = await _dio.get('/api/hr/departments');
    return (response.data as List? ?? [])
        .map((e) => HrDepartment.fromJson(e))
        .toList();
  }

  Future<PaginatedResponse<HrAttendance>> getAttendance({
    String? employeeId,
    String? startDate,
    String? endDate,
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get('/api/hr/attendance', queryParameters: {
      if (employeeId != null) 'employeeId': employeeId,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
      if (status != null) 'status': status,
      'page': page,
      'limit': limit,
    });

    final data = response.data;
    final list = (data['data'] as List? ?? [])
        .map((e) => HrAttendance.fromJson(e))
        .toList();

    return PaginatedResponse(
      data: list,
      total: data['total'] ?? list.length,
      page: data['page'] ?? page,
      limit: data['limit'] ?? limit,
    );
  }

  Future<HrAttendance> checkIn(String employeeId) async {
    final response = await _dio.post('/api/hr/$employeeId/checkin');
    return HrAttendance.fromJson(response.data);
  }

  Future<HrAttendance> checkOut(String employeeId) async {
    final response = await _dio.post('/api/hr/$employeeId/checkout');
    return HrAttendance.fromJson(response.data);
  }

  Future<HrAttendance> markAttendance(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/hr/attendance', data: data);
    return HrAttendance.fromJson(response.data);
  }

  Future<List<HrLeaveType>> getLeaveTypes() async {
    final response = await _dio.get('/api/hr/leave-types');
    return (response.data as List? ?? [])
        .map((e) => HrLeaveType.fromJson(e))
        .toList();
  }

  Future<PaginatedResponse<HrLeave>> getLeaves({
    String? employeeId,
    String? status,
    String? startDate,
    String? endDate,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get('/api/hr/leaves', queryParameters: {
      if (employeeId != null) 'employeeId': employeeId,
      if (status != null) 'status': status,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
      'page': page,
      'limit': limit,
    });

    final data = response.data;
    final list = (data['data'] as List? ?? [])
        .map((e) => HrLeave.fromJson(e))
        .toList();

    return PaginatedResponse(
      data: list,
      total: data['total'] ?? list.length,
      page: data['page'] ?? page,
      limit: data['limit'] ?? limit,
    );
  }

  Future<HrLeave> applyLeave(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/hr/leaves', data: data);
    return HrLeave.fromJson(response.data);
  }

  Future<HrLeave> updateLeaveStatus(String id, String status) async {
    final response = await _dio.patch('/api/hr/leaves/$id', data: {'status': status});
    return HrLeave.fromJson(response.data);
  }

  Future<PaginatedResponse<HrPayroll>> getPayroll({
    String? employeeId,
    int? month,
    int? year,
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get('/api/hr/payroll', queryParameters: {
      if (employeeId != null) 'employeeId': employeeId,
      if (month != null) 'month': month,
      if (year != null) 'year': year,
      if (status != null) 'status': status,
      'page': page,
      'limit': limit,
    });

    final data = response.data;
    final list = (data['data'] as List? ?? [])
        .map((e) => HrPayroll.fromJson(e))
        .toList();

    return PaginatedResponse(
      data: list,
      total: data['total'] ?? list.length,
      page: data['page'] ?? page,
      limit: data['limit'] ?? limit,
    );
  }

  Future<HrPayroll> runPayroll(Map<String, dynamic> data) async {
    final response = await _dio.post('/api/hr/payroll', data: data);
    return HrPayroll.fromJson(response.data);
  }

  Future<HrPayroll> updatePayrollStatus(String id, String status) async {
    final response = await _dio.patch('/api/hr/payroll/$id', data: {'status': status});
    return HrPayroll.fromJson(response.data);
  }
}
