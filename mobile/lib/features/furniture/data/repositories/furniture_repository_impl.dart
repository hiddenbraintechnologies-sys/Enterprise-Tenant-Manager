import '../../../../core/network/pagination.dart';
import '../../domain/entities/furniture_product.dart';
import '../../domain/entities/raw_material.dart';
import '../../domain/entities/production_order.dart';
import '../../domain/entities/sales_order.dart';
import '../../domain/entities/furniture_invoice.dart';
import '../../domain/entities/notification_log.dart';
import '../../domain/repositories/furniture_repository.dart';
import '../datasources/furniture_remote_datasource.dart';

class FurnitureRepositoryImpl implements FurnitureRepository {
  final FurnitureRemoteDataSource _remoteDataSource;

  FurnitureRepositoryImpl(this._remoteDataSource);

  @override
  Future<PaginatedResponse<FurnitureProduct>> getProducts(
    PaginationParams params, {
    String? productType,
    String? materialType,
    bool? isActive,
  }) {
    return _remoteDataSource.getProducts(
      params,
      productType: productType,
      materialType: materialType,
      isActive: isActive,
    );
  }

  @override
  Future<FurnitureProduct> getProduct(String id) {
    return _remoteDataSource.getProduct(id);
  }

  @override
  Future<PaginatedResponse<RawMaterial>> getRawMaterials(
    PaginationParams params, {
    String? categoryId,
    bool? lowStock,
  }) {
    return _remoteDataSource.getRawMaterials(
      params,
      categoryId: categoryId,
      lowStock: lowStock,
    );
  }

  @override
  Future<RawMaterial> getRawMaterial(String id) {
    return _remoteDataSource.getRawMaterial(id);
  }

  @override
  Future<PaginatedResponse<ProductionOrder>> getProductionOrders(
    PaginationParams params, {
    String? priority,
  }) {
    return _remoteDataSource.getProductionOrders(
      params,
      priority: priority,
    );
  }

  @override
  Future<ProductionOrder> getProductionOrder(String id) {
    return _remoteDataSource.getProductionOrder(id);
  }

  @override
  Future<PaginatedResponse<SalesOrder>> getSalesOrders(
    PaginationParams params, {
    String? orderType,
  }) {
    return _remoteDataSource.getSalesOrders(
      params,
      orderType: orderType,
    );
  }

  @override
  Future<SalesOrder> getSalesOrder(String id) {
    return _remoteDataSource.getSalesOrder(id);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() {
    return _remoteDataSource.getDashboardStats();
  }

  @override
  Future<PaginatedResponse<FurnitureInvoice>> getInvoices(
    PaginationParams params, {
    String? status,
  }) {
    return _remoteDataSource.getInvoices(params, status: status);
  }

  @override
  Future<FurnitureInvoice> getInvoice(String id) {
    return _remoteDataSource.getInvoice(id);
  }

  @override
  Future<List<NotificationLog>> getInvoiceNotifications(String invoiceId) {
    return _remoteDataSource.getInvoiceNotifications(invoiceId);
  }

  @override
  Future<NotificationLog> sendInvoiceNotification(
    String invoiceId, {
    required String channel,
    required String eventType,
  }) {
    return _remoteDataSource.sendInvoiceNotification(
      invoiceId,
      channel: channel,
      eventType: eventType,
    );
  }
}
