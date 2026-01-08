import '../../../../core/network/pagination.dart';
import '../entities/furniture_product.dart';
import '../entities/raw_material.dart';
import '../entities/production_order.dart';
import '../entities/sales_order.dart';
import '../entities/furniture_invoice.dart';
import '../entities/notification_log.dart';

abstract class FurnitureRepository {
  Future<PaginatedResponse<FurnitureProduct>> getProducts(
    PaginationParams params, {
    String? productType,
    String? materialType,
    bool? isActive,
  });

  Future<FurnitureProduct> getProduct(String id);

  Future<PaginatedResponse<RawMaterial>> getRawMaterials(
    PaginationParams params, {
    String? categoryId,
    bool? lowStock,
  });

  Future<RawMaterial> getRawMaterial(String id);

  Future<PaginatedResponse<ProductionOrder>> getProductionOrders(
    PaginationParams params, {
    String? priority,
  });

  Future<ProductionOrder> getProductionOrder(String id);

  Future<PaginatedResponse<SalesOrder>> getSalesOrders(
    PaginationParams params, {
    String? orderType,
  });

  Future<SalesOrder> getSalesOrder(String id);

  Future<Map<String, dynamic>> getDashboardStats();

  Future<PaginatedResponse<FurnitureInvoice>> getInvoices(
    PaginationParams params, {
    String? status,
  });

  Future<FurnitureInvoice> getInvoice(String id);

  Future<List<NotificationLog>> getInvoiceNotifications(String invoiceId);

  Future<NotificationLog> sendInvoiceNotification(
    String invoiceId, {
    required String channel,
    required String eventType,
  });
}
