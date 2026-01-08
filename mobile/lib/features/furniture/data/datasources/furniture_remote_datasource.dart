import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/furniture_product.dart';
import '../../domain/entities/raw_material.dart';
import '../../domain/entities/production_order.dart';
import '../../domain/entities/sales_order.dart';
import '../../domain/entities/furniture_invoice.dart';
import '../../domain/entities/notification_log.dart';
import '../../domain/entities/analytics_overview.dart';
import '../../domain/entities/ai_insight.dart';

class FurnitureRemoteDataSource {
  final ApiClient _apiClient;
  static const String _basePath = '/api/furniture';

  FurnitureRemoteDataSource(this._apiClient);

  Future<PaginatedResponse<FurnitureProduct>> getProducts(
    PaginationParams params, {
    String? productType,
    String? materialType,
    bool? isActive,
  }) async {
    final queryParams = params.toQueryParameters();
    if (productType != null) queryParams['productType'] = productType;
    if (materialType != null) queryParams['materialType'] = materialType;
    if (isActive != null) queryParams['isActive'] = isActive.toString();

    final response = await _apiClient.get(
      '$_basePath/products',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => FurnitureProduct.fromJson(json),
    );
  }

  Future<FurnitureProduct> getProduct(String id) async {
    final response = await _apiClient.get('$_basePath/products/$id');
    return FurnitureProduct.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<RawMaterial>> getRawMaterials(
    PaginationParams params, {
    String? categoryId,
    bool? lowStock,
  }) async {
    final queryParams = params.toQueryParameters();
    if (categoryId != null) queryParams['categoryId'] = categoryId;
    if (lowStock == true) queryParams['lowStock'] = 'true';

    final response = await _apiClient.get(
      '$_basePath/raw-materials',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => RawMaterial.fromJson(json),
    );
  }

  Future<RawMaterial> getRawMaterial(String id) async {
    final response = await _apiClient.get('$_basePath/raw-materials/$id');
    return RawMaterial.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<ProductionOrder>> getProductionOrders(
    PaginationParams params, {
    String? priority,
  }) async {
    final queryParams = params.toQueryParameters();
    if (priority != null) queryParams['priority'] = priority;

    final response = await _apiClient.get(
      '$_basePath/production-orders',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => ProductionOrder.fromJson(json),
    );
  }

  Future<ProductionOrder> getProductionOrder(String id) async {
    final response = await _apiClient.get('$_basePath/production-orders/$id');
    return ProductionOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<SalesOrder>> getSalesOrders(
    PaginationParams params, {
    String? orderType,
  }) async {
    final queryParams = params.toQueryParameters();
    if (orderType != null) queryParams['orderType'] = orderType;

    final response = await _apiClient.get(
      '$_basePath/sales-orders',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => SalesOrder.fromJson(json),
    );
  }

  Future<SalesOrder> getSalesOrder(String id) async {
    final response = await _apiClient.get('$_basePath/sales-orders/$id');
    return SalesOrder.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _apiClient.get('$_basePath/dashboard/stats');
    return response.data as Map<String, dynamic>;
  }

  Future<PaginatedResponse<FurnitureInvoice>> getInvoices(
    PaginationParams params, {
    String? status,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null && status != 'all') queryParams['status'] = status;

    final response = await _apiClient.get(
      '$_basePath/invoices',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => FurnitureInvoice.fromJson(json),
    );
  }

  Future<FurnitureInvoice> getInvoice(String id) async {
    final response = await _apiClient.get('$_basePath/invoices/$id');
    return FurnitureInvoice.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<NotificationLog>> getInvoiceNotifications(String invoiceId) async {
    final response = await _apiClient.get('$_basePath/invoices/$invoiceId/notifications');
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => NotificationLog.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<NotificationLog> sendInvoiceNotification(
    String invoiceId, {
    required String channel,
    required String eventType,
  }) async {
    final response = await _apiClient.post(
      '$_basePath/invoices/$invoiceId/notify',
      queryParameters: {'channel': channel},
      data: {'eventType': eventType},
    );
    return NotificationLog.fromJson(response.data['notification'] as Map<String, dynamic>);
  }

  Future<AnalyticsOverview> getAnalyticsOverview({String period = '30d'}) async {
    final response = await _apiClient.get(
      '$_basePath/analytics/overview',
      queryParameters: {'period': period},
    );
    return AnalyticsOverview.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<AiInsight>> getInsights({
    String? category,
    String? severity,
    bool includeRead = false,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'limit': limit.toString(),
      'includeRead': includeRead.toString(),
    };
    if (category != null) queryParams['category'] = category;
    if (severity != null) queryParams['severity'] = severity;

    final response = await _apiClient.get(
      '$_basePath/insights',
      queryParameters: queryParams,
    );
    final List<dynamic> data = response.data as List<dynamic>;
    return data.map((json) => AiInsight.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> generateInsights() async {
    final response = await _apiClient.post('$_basePath/insights/generate');
    return response.data as Map<String, dynamic>;
  }

  Future<AiInsight> markInsightRead(String id) async {
    final response = await _apiClient.patch('$_basePath/insights/$id/read');
    return AiInsight.fromJson(response.data as Map<String, dynamic>);
  }

  Future<AiInsight> dismissInsight(String id) async {
    final response = await _apiClient.patch('$_basePath/insights/$id/dismiss');
    return AiInsight.fromJson(response.data as Map<String, dynamic>);
  }
}
