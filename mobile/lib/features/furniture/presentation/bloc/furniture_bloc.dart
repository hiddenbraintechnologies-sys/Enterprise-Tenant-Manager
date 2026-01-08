import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/repositories/furniture_repository.dart';
import 'furniture_event.dart';
import 'furniture_state.dart';

class FurnitureBloc extends Bloc<FurnitureEvent, FurnitureState> {
  final FurnitureRepository _repository;

  FurnitureBloc(this._repository) : super(const FurnitureState()) {
    on<LoadProducts>(_onLoadProducts);
    on<LoadMoreProducts>(_onLoadMoreProducts);
    on<LoadRawMaterials>(_onLoadRawMaterials);
    on<LoadMoreRawMaterials>(_onLoadMoreRawMaterials);
    on<LoadProductionOrders>(_onLoadProductionOrders);
    on<LoadMoreProductionOrders>(_onLoadMoreProductionOrders);
    on<LoadSalesOrders>(_onLoadSalesOrders);
    on<LoadMoreSalesOrders>(_onLoadMoreSalesOrders);
    on<LoadDashboardStats>(_onLoadDashboardStats);
    on<ClearFilters>(_onClearFilters);
    on<RefreshData>(_onRefreshData);
  }

  Future<void> _onLoadProducts(
    LoadProducts event,
    Emitter<FurnitureState> emit,
  ) async {
    emit(state.copyWith(productsStatus: FurnitureStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getProducts(
        params,
        productType: event.productType,
        materialType: event.materialType,
        isActive: event.isActive,
      );

      emit(state.copyWith(
        productsStatus: FurnitureStatus.success,
        products: response.data,
        productsPagination: response.pagination,
        currentProductsParams: params,
        productsProductType: event.productType,
        productsMaterialType: event.materialType,
        productsIsActive: event.isActive,
        productsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        productsStatus: FurnitureStatus.failure,
        productsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreProducts(
    LoadMoreProducts event,
    Emitter<FurnitureState> emit,
  ) async {
    if (!state.hasMoreProducts || state.productsStatus == FurnitureStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(productsStatus: FurnitureStatus.loadingMore));

    try {
      final nextPage = (state.productsPagination?.page ?? 0) + 1;
      final params = state.currentProductsParams.copyWith(page: nextPage);

      final response = await _repository.getProducts(
        params,
        productType: state.productsProductType,
        materialType: state.productsMaterialType,
        isActive: state.productsIsActive,
      );

      emit(state.copyWith(
        productsStatus: FurnitureStatus.success,
        products: [...state.products, ...response.data],
        productsPagination: response.pagination,
        currentProductsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        productsStatus: FurnitureStatus.failure,
        productsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadRawMaterials(
    LoadRawMaterials event,
    Emitter<FurnitureState> emit,
  ) async {
    emit(state.copyWith(rawMaterialsStatus: FurnitureStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getRawMaterials(
        params,
        categoryId: event.categoryId,
        lowStock: event.lowStock,
      );

      emit(state.copyWith(
        rawMaterialsStatus: FurnitureStatus.success,
        rawMaterials: response.data,
        rawMaterialsPagination: response.pagination,
        currentRawMaterialsParams: params,
        rawMaterialsCategoryId: event.categoryId,
        rawMaterialsLowStock: event.lowStock,
        rawMaterialsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        rawMaterialsStatus: FurnitureStatus.failure,
        rawMaterialsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreRawMaterials(
    LoadMoreRawMaterials event,
    Emitter<FurnitureState> emit,
  ) async {
    if (!state.hasMoreRawMaterials || state.rawMaterialsStatus == FurnitureStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(rawMaterialsStatus: FurnitureStatus.loadingMore));

    try {
      final nextPage = (state.rawMaterialsPagination?.page ?? 0) + 1;
      final params = state.currentRawMaterialsParams.copyWith(page: nextPage);

      final response = await _repository.getRawMaterials(
        params,
        categoryId: state.rawMaterialsCategoryId,
        lowStock: state.rawMaterialsLowStock,
      );

      emit(state.copyWith(
        rawMaterialsStatus: FurnitureStatus.success,
        rawMaterials: [...state.rawMaterials, ...response.data],
        rawMaterialsPagination: response.pagination,
        currentRawMaterialsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        rawMaterialsStatus: FurnitureStatus.failure,
        rawMaterialsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadProductionOrders(
    LoadProductionOrders event,
    Emitter<FurnitureState> emit,
  ) async {
    emit(state.copyWith(productionOrdersStatus: FurnitureStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        status: event.status,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getProductionOrders(
        params,
        priority: event.priority,
      );

      emit(state.copyWith(
        productionOrdersStatus: FurnitureStatus.success,
        productionOrders: response.data,
        productionOrdersPagination: response.pagination,
        currentProductionOrdersParams: params,
        productionOrdersPriority: event.priority,
        productionOrdersError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        productionOrdersStatus: FurnitureStatus.failure,
        productionOrdersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreProductionOrders(
    LoadMoreProductionOrders event,
    Emitter<FurnitureState> emit,
  ) async {
    if (!state.hasMoreProductionOrders || state.productionOrdersStatus == FurnitureStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(productionOrdersStatus: FurnitureStatus.loadingMore));

    try {
      final nextPage = (state.productionOrdersPagination?.page ?? 0) + 1;
      final params = state.currentProductionOrdersParams.copyWith(page: nextPage);

      final response = await _repository.getProductionOrders(
        params,
        priority: state.productionOrdersPriority,
      );

      emit(state.copyWith(
        productionOrdersStatus: FurnitureStatus.success,
        productionOrders: [...state.productionOrders, ...response.data],
        productionOrdersPagination: response.pagination,
        currentProductionOrdersParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        productionOrdersStatus: FurnitureStatus.failure,
        productionOrdersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadSalesOrders(
    LoadSalesOrders event,
    Emitter<FurnitureState> emit,
  ) async {
    emit(state.copyWith(salesOrdersStatus: FurnitureStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        status: event.status,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getSalesOrders(
        params,
        orderType: event.orderType,
      );

      emit(state.copyWith(
        salesOrdersStatus: FurnitureStatus.success,
        salesOrders: response.data,
        salesOrdersPagination: response.pagination,
        currentSalesOrdersParams: params,
        salesOrdersOrderType: event.orderType,
        salesOrdersError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        salesOrdersStatus: FurnitureStatus.failure,
        salesOrdersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreSalesOrders(
    LoadMoreSalesOrders event,
    Emitter<FurnitureState> emit,
  ) async {
    if (!state.hasMoreSalesOrders || state.salesOrdersStatus == FurnitureStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(salesOrdersStatus: FurnitureStatus.loadingMore));

    try {
      final nextPage = (state.salesOrdersPagination?.page ?? 0) + 1;
      final params = state.currentSalesOrdersParams.copyWith(page: nextPage);

      final response = await _repository.getSalesOrders(
        params,
        orderType: state.salesOrdersOrderType,
      );

      emit(state.copyWith(
        salesOrdersStatus: FurnitureStatus.success,
        salesOrders: [...state.salesOrders, ...response.data],
        salesOrdersPagination: response.pagination,
        currentSalesOrdersParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        salesOrdersStatus: FurnitureStatus.failure,
        salesOrdersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadDashboardStats(
    LoadDashboardStats event,
    Emitter<FurnitureState> emit,
  ) async {
    emit(state.copyWith(dashboardStatus: FurnitureStatus.loading));

    try {
      final stats = await _repository.getDashboardStats();

      emit(state.copyWith(
        dashboardStatus: FurnitureStatus.success,
        dashboardStats: stats,
        dashboardError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        dashboardStatus: FurnitureStatus.failure,
        dashboardError: e.toString(),
      ));
    }
  }

  void _onClearFilters(
    ClearFilters event,
    Emitter<FurnitureState> emit,
  ) {
    emit(FurnitureState(
      productsStatus: state.productsStatus,
      products: state.products,
      productsPagination: state.productsPagination,
      rawMaterialsStatus: state.rawMaterialsStatus,
      rawMaterials: state.rawMaterials,
      rawMaterialsPagination: state.rawMaterialsPagination,
      productionOrdersStatus: state.productionOrdersStatus,
      productionOrders: state.productionOrders,
      productionOrdersPagination: state.productionOrdersPagination,
      salesOrdersStatus: state.salesOrdersStatus,
      salesOrders: state.salesOrders,
      salesOrdersPagination: state.salesOrdersPagination,
      dashboardStatus: state.dashboardStatus,
      dashboardStats: state.dashboardStats,
      currentProductsParams: PaginationParams(),
      currentRawMaterialsParams: PaginationParams(),
      currentProductionOrdersParams: PaginationParams(),
      currentSalesOrdersParams: PaginationParams(),
      productsProductType: null,
      productsMaterialType: null,
      productsIsActive: null,
      rawMaterialsCategoryId: null,
      rawMaterialsLowStock: null,
      productionOrdersPriority: null,
      salesOrdersOrderType: null,
    ));
  }

  Future<void> _onRefreshData(
    RefreshData event,
    Emitter<FurnitureState> emit,
  ) async {
    add(const LoadProducts());
    add(const LoadRawMaterials());
    add(const LoadProductionOrders());
    add(const LoadSalesOrders());
    add(const LoadDashboardStats());
  }
}
