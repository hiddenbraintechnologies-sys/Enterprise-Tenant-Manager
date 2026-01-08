import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/furniture_product.dart';
import '../../domain/entities/raw_material.dart';
import '../../domain/entities/production_order.dart';
import '../../domain/entities/sales_order.dart';

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
}
