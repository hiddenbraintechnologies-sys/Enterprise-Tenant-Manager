import 'package:equatable/equatable.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/furniture_product.dart';
import '../../domain/entities/raw_material.dart';
import '../../domain/entities/production_order.dart';
import '../../domain/entities/sales_order.dart';

enum FurnitureStatus { initial, loading, loadingMore, success, failure }

class FurnitureState extends Equatable {
  final FurnitureStatus productsStatus;
  final List<FurnitureProduct> products;
  final PaginationMeta? productsPagination;
  final String? productsError;

  final FurnitureStatus rawMaterialsStatus;
  final List<RawMaterial> rawMaterials;
  final PaginationMeta? rawMaterialsPagination;
  final String? rawMaterialsError;

  final FurnitureStatus productionOrdersStatus;
  final List<ProductionOrder> productionOrders;
  final PaginationMeta? productionOrdersPagination;
  final String? productionOrdersError;

  final FurnitureStatus salesOrdersStatus;
  final List<SalesOrder> salesOrders;
  final PaginationMeta? salesOrdersPagination;
  final String? salesOrdersError;

  final FurnitureStatus dashboardStatus;
  final Map<String, dynamic>? dashboardStats;
  final String? dashboardError;

  final PaginationParams currentProductsParams;
  final PaginationParams currentRawMaterialsParams;
  final PaginationParams currentProductionOrdersParams;
  final PaginationParams currentSalesOrdersParams;

  const FurnitureState({
    this.productsStatus = FurnitureStatus.initial,
    this.products = const [],
    this.productsPagination,
    this.productsError,
    this.rawMaterialsStatus = FurnitureStatus.initial,
    this.rawMaterials = const [],
    this.rawMaterialsPagination,
    this.rawMaterialsError,
    this.productionOrdersStatus = FurnitureStatus.initial,
    this.productionOrders = const [],
    this.productionOrdersPagination,
    this.productionOrdersError,
    this.salesOrdersStatus = FurnitureStatus.initial,
    this.salesOrders = const [],
    this.salesOrdersPagination,
    this.salesOrdersError,
    this.dashboardStatus = FurnitureStatus.initial,
    this.dashboardStats,
    this.dashboardError,
    PaginationParams? currentProductsParams,
    PaginationParams? currentRawMaterialsParams,
    PaginationParams? currentProductionOrdersParams,
    PaginationParams? currentSalesOrdersParams,
  })  : currentProductsParams = currentProductsParams ?? const _DefaultPaginationParams(),
        currentRawMaterialsParams = currentRawMaterialsParams ?? const _DefaultPaginationParams(),
        currentProductionOrdersParams = currentProductionOrdersParams ?? const _DefaultPaginationParams(),
        currentSalesOrdersParams = currentSalesOrdersParams ?? const _DefaultPaginationParams();

  bool get hasMoreProducts => productsPagination?.hasNext ?? false;
  bool get hasMoreRawMaterials => rawMaterialsPagination?.hasNext ?? false;
  bool get hasMoreProductionOrders => productionOrdersPagination?.hasNext ?? false;
  bool get hasMoreSalesOrders => salesOrdersPagination?.hasNext ?? false;

  FurnitureState copyWith({
    FurnitureStatus? productsStatus,
    List<FurnitureProduct>? products,
    PaginationMeta? productsPagination,
    String? productsError,
    FurnitureStatus? rawMaterialsStatus,
    List<RawMaterial>? rawMaterials,
    PaginationMeta? rawMaterialsPagination,
    String? rawMaterialsError,
    FurnitureStatus? productionOrdersStatus,
    List<ProductionOrder>? productionOrders,
    PaginationMeta? productionOrdersPagination,
    String? productionOrdersError,
    FurnitureStatus? salesOrdersStatus,
    List<SalesOrder>? salesOrders,
    PaginationMeta? salesOrdersPagination,
    String? salesOrdersError,
    FurnitureStatus? dashboardStatus,
    Map<String, dynamic>? dashboardStats,
    String? dashboardError,
    PaginationParams? currentProductsParams,
    PaginationParams? currentRawMaterialsParams,
    PaginationParams? currentProductionOrdersParams,
    PaginationParams? currentSalesOrdersParams,
  }) {
    return FurnitureState(
      productsStatus: productsStatus ?? this.productsStatus,
      products: products ?? this.products,
      productsPagination: productsPagination ?? this.productsPagination,
      productsError: productsError,
      rawMaterialsStatus: rawMaterialsStatus ?? this.rawMaterialsStatus,
      rawMaterials: rawMaterials ?? this.rawMaterials,
      rawMaterialsPagination: rawMaterialsPagination ?? this.rawMaterialsPagination,
      rawMaterialsError: rawMaterialsError,
      productionOrdersStatus: productionOrdersStatus ?? this.productionOrdersStatus,
      productionOrders: productionOrders ?? this.productionOrders,
      productionOrdersPagination: productionOrdersPagination ?? this.productionOrdersPagination,
      productionOrdersError: productionOrdersError,
      salesOrdersStatus: salesOrdersStatus ?? this.salesOrdersStatus,
      salesOrders: salesOrders ?? this.salesOrders,
      salesOrdersPagination: salesOrdersPagination ?? this.salesOrdersPagination,
      salesOrdersError: salesOrdersError,
      dashboardStatus: dashboardStatus ?? this.dashboardStatus,
      dashboardStats: dashboardStats ?? this.dashboardStats,
      dashboardError: dashboardError,
      currentProductsParams: currentProductsParams ?? this.currentProductsParams,
      currentRawMaterialsParams: currentRawMaterialsParams ?? this.currentRawMaterialsParams,
      currentProductionOrdersParams: currentProductionOrdersParams ?? this.currentProductionOrdersParams,
      currentSalesOrdersParams: currentSalesOrdersParams ?? this.currentSalesOrdersParams,
    );
  }

  @override
  List<Object?> get props => [
        productsStatus,
        products,
        productsPagination,
        productsError,
        rawMaterialsStatus,
        rawMaterials,
        rawMaterialsPagination,
        rawMaterialsError,
        productionOrdersStatus,
        productionOrders,
        productionOrdersPagination,
        productionOrdersError,
        salesOrdersStatus,
        salesOrders,
        salesOrdersPagination,
        salesOrdersError,
        dashboardStatus,
        dashboardStats,
        dashboardError,
      ];
}

class _DefaultPaginationParams implements PaginationParams {
  const _DefaultPaginationParams();
  
  @override
  int get page => 1;
  @override
  int get limit => 20;
  @override
  String? get search => null;
  @override
  String? get status => null;
  @override
  String? get sortBy => null;
  @override
  String get sortOrder => 'desc';
  @override
  Map<String, String>? get additionalFilters => null;

  @override
  Map<String, dynamic> toQueryParameters() => {'page': '1', 'limit': '20'};

  @override
  PaginationParams copyWith({
    int? page,
    int? limit,
    String? search,
    String? status,
    String? sortBy,
    String? sortOrder,
    Map<String, String>? additionalFilters,
  }) {
    return PaginationParams(
      page: page ?? this.page,
      limit: limit ?? this.limit,
      search: search ?? this.search,
      status: status ?? this.status,
      sortBy: sortBy ?? this.sortBy,
      sortOrder: sortOrder ?? this.sortOrder,
      additionalFilters: additionalFilters ?? this.additionalFilters,
    );
  }
}
