import 'package:equatable/equatable.dart';

abstract class FurnitureEvent extends Equatable {
  const FurnitureEvent();

  @override
  List<Object?> get props => [];
}

class LoadProducts extends FurnitureEvent {
  final int page;
  final int limit;
  final String? search;
  final String? productType;
  final String? materialType;
  final bool? isActive;
  final String? sortBy;
  final String sortOrder;

  const LoadProducts({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.productType,
    this.materialType,
    this.isActive,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, productType, materialType, isActive, sortBy, sortOrder];
}

class LoadMoreProducts extends FurnitureEvent {
  const LoadMoreProducts();
}

class LoadRawMaterials extends FurnitureEvent {
  final int page;
  final int limit;
  final String? search;
  final String? categoryId;
  final bool? lowStock;
  final String? sortBy;
  final String sortOrder;

  const LoadRawMaterials({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.categoryId,
    this.lowStock,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, categoryId, lowStock, sortBy, sortOrder];
}

class LoadMoreRawMaterials extends FurnitureEvent {
  const LoadMoreRawMaterials();
}

class LoadProductionOrders extends FurnitureEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? priority;
  final String? sortBy;
  final String sortOrder;

  const LoadProductionOrders({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.priority,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, priority, sortBy, sortOrder];
}

class LoadMoreProductionOrders extends FurnitureEvent {
  const LoadMoreProductionOrders();
}

class LoadSalesOrders extends FurnitureEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? orderType;
  final String? sortBy;
  final String sortOrder;

  const LoadSalesOrders({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.orderType,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, orderType, sortBy, sortOrder];
}

class LoadMoreSalesOrders extends FurnitureEvent {
  const LoadMoreSalesOrders();
}

class LoadDashboardStats extends FurnitureEvent {
  const LoadDashboardStats();
}

class ClearFilters extends FurnitureEvent {
  const ClearFilters();
}

class RefreshData extends FurnitureEvent {
  const RefreshData();
}
