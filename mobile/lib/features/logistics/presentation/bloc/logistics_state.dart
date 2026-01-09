import 'package:equatable/equatable.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/logistics_order.dart';
import '../../domain/entities/logistics_vehicle.dart';
import '../../domain/entities/logistics_driver.dart';
import '../../domain/entities/logistics_tracking.dart';

enum LogisticsStatus { initial, loading, loadingMore, success, failure }

class LogisticsState extends Equatable {
  final LogisticsStatus ordersStatus;
  final List<LogisticsOrder> orders;
  final PaginationMeta? ordersPagination;
  final String? ordersError;

  final LogisticsStatus vehiclesStatus;
  final List<LogisticsVehicle> vehicles;
  final PaginationMeta? vehiclesPagination;
  final String? vehiclesError;

  final LogisticsStatus driversStatus;
  final List<LogisticsDriver> drivers;
  final PaginationMeta? driversPagination;
  final String? driversError;

  final LogisticsStatus dashboardStatus;
  final Map<String, dynamic>? dashboardStats;
  final String? dashboardError;

  final LogisticsOrder? selectedOrder;
  final LogisticsStatus selectedOrderStatus;
  final String? selectedOrderError;

  final List<LogisticsTracking> trackingHistory;
  final LogisticsStatus trackingStatus;
  final String? trackingError;

  final List<LogisticsVehicle> availableVehicles;
  final List<LogisticsDriver> availableDrivers;

  final bool isCreating;
  final bool isUpdating;
  final String? operationError;
  final String? operationSuccess;

  final PaginationParams currentOrdersParams;
  final PaginationParams currentVehiclesParams;
  final PaginationParams currentDriversParams;

  final String? ordersStatusFilter;
  final String? ordersDriverId;
  final String? ordersCustomerId;

  final String? vehiclesTypeFilter;
  final String? vehiclesStatusFilter;

  final String? driversStatusFilter;

  const LogisticsState({
    this.ordersStatus = LogisticsStatus.initial,
    this.orders = const [],
    this.ordersPagination,
    this.ordersError,
    this.vehiclesStatus = LogisticsStatus.initial,
    this.vehicles = const [],
    this.vehiclesPagination,
    this.vehiclesError,
    this.driversStatus = LogisticsStatus.initial,
    this.drivers = const [],
    this.driversPagination,
    this.driversError,
    this.dashboardStatus = LogisticsStatus.initial,
    this.dashboardStats,
    this.dashboardError,
    this.selectedOrder,
    this.selectedOrderStatus = LogisticsStatus.initial,
    this.selectedOrderError,
    this.trackingHistory = const [],
    this.trackingStatus = LogisticsStatus.initial,
    this.trackingError,
    this.availableVehicles = const [],
    this.availableDrivers = const [],
    this.isCreating = false,
    this.isUpdating = false,
    this.operationError,
    this.operationSuccess,
    PaginationParams? currentOrdersParams,
    PaginationParams? currentVehiclesParams,
    PaginationParams? currentDriversParams,
    this.ordersStatusFilter,
    this.ordersDriverId,
    this.ordersCustomerId,
    this.vehiclesTypeFilter,
    this.vehiclesStatusFilter,
    this.driversStatusFilter,
  })  : currentOrdersParams = currentOrdersParams ?? const _DefaultPaginationParams(),
        currentVehiclesParams = currentVehiclesParams ?? const _DefaultPaginationParams(),
        currentDriversParams = currentDriversParams ?? const _DefaultPaginationParams();

  bool get hasMoreOrders => ordersPagination?.hasNext ?? false;
  bool get hasMoreVehicles => vehiclesPagination?.hasNext ?? false;
  bool get hasMoreDrivers => driversPagination?.hasNext ?? false;

  bool get isLoading =>
      ordersStatus == LogisticsStatus.loading ||
      vehiclesStatus == LogisticsStatus.loading ||
      driversStatus == LogisticsStatus.loading ||
      dashboardStatus == LogisticsStatus.loading;

  String? get error => ordersError ?? vehiclesError ?? driversError ?? dashboardError ?? operationError;

  LogisticsState copyWith({
    LogisticsStatus? ordersStatus,
    List<LogisticsOrder>? orders,
    PaginationMeta? ordersPagination,
    String? ordersError,
    LogisticsStatus? vehiclesStatus,
    List<LogisticsVehicle>? vehicles,
    PaginationMeta? vehiclesPagination,
    String? vehiclesError,
    LogisticsStatus? driversStatus,
    List<LogisticsDriver>? drivers,
    PaginationMeta? driversPagination,
    String? driversError,
    LogisticsStatus? dashboardStatus,
    Map<String, dynamic>? dashboardStats,
    String? dashboardError,
    LogisticsOrder? selectedOrder,
    LogisticsStatus? selectedOrderStatus,
    String? selectedOrderError,
    List<LogisticsTracking>? trackingHistory,
    LogisticsStatus? trackingStatus,
    String? trackingError,
    List<LogisticsVehicle>? availableVehicles,
    List<LogisticsDriver>? availableDrivers,
    bool? isCreating,
    bool? isUpdating,
    String? operationError,
    String? operationSuccess,
    PaginationParams? currentOrdersParams,
    PaginationParams? currentVehiclesParams,
    PaginationParams? currentDriversParams,
    String? ordersStatusFilter,
    String? ordersDriverId,
    String? ordersCustomerId,
    String? vehiclesTypeFilter,
    String? vehiclesStatusFilter,
    String? driversStatusFilter,
  }) {
    return LogisticsState(
      ordersStatus: ordersStatus ?? this.ordersStatus,
      orders: orders ?? this.orders,
      ordersPagination: ordersPagination ?? this.ordersPagination,
      ordersError: ordersError,
      vehiclesStatus: vehiclesStatus ?? this.vehiclesStatus,
      vehicles: vehicles ?? this.vehicles,
      vehiclesPagination: vehiclesPagination ?? this.vehiclesPagination,
      vehiclesError: vehiclesError,
      driversStatus: driversStatus ?? this.driversStatus,
      drivers: drivers ?? this.drivers,
      driversPagination: driversPagination ?? this.driversPagination,
      driversError: driversError,
      dashboardStatus: dashboardStatus ?? this.dashboardStatus,
      dashboardStats: dashboardStats ?? this.dashboardStats,
      dashboardError: dashboardError,
      selectedOrder: selectedOrder ?? this.selectedOrder,
      selectedOrderStatus: selectedOrderStatus ?? this.selectedOrderStatus,
      selectedOrderError: selectedOrderError,
      trackingHistory: trackingHistory ?? this.trackingHistory,
      trackingStatus: trackingStatus ?? this.trackingStatus,
      trackingError: trackingError,
      availableVehicles: availableVehicles ?? this.availableVehicles,
      availableDrivers: availableDrivers ?? this.availableDrivers,
      isCreating: isCreating ?? this.isCreating,
      isUpdating: isUpdating ?? this.isUpdating,
      operationError: operationError,
      operationSuccess: operationSuccess,
      currentOrdersParams: currentOrdersParams ?? this.currentOrdersParams,
      currentVehiclesParams: currentVehiclesParams ?? this.currentVehiclesParams,
      currentDriversParams: currentDriversParams ?? this.currentDriversParams,
      ordersStatusFilter: ordersStatusFilter ?? this.ordersStatusFilter,
      ordersDriverId: ordersDriverId ?? this.ordersDriverId,
      ordersCustomerId: ordersCustomerId ?? this.ordersCustomerId,
      vehiclesTypeFilter: vehiclesTypeFilter ?? this.vehiclesTypeFilter,
      vehiclesStatusFilter: vehiclesStatusFilter ?? this.vehiclesStatusFilter,
      driversStatusFilter: driversStatusFilter ?? this.driversStatusFilter,
    );
  }

  LogisticsState clearSelectedOrder() {
    return LogisticsState(
      ordersStatus: ordersStatus,
      orders: orders,
      ordersPagination: ordersPagination,
      ordersError: ordersError,
      vehiclesStatus: vehiclesStatus,
      vehicles: vehicles,
      vehiclesPagination: vehiclesPagination,
      vehiclesError: vehiclesError,
      driversStatus: driversStatus,
      drivers: drivers,
      driversPagination: driversPagination,
      driversError: driversError,
      dashboardStatus: dashboardStatus,
      dashboardStats: dashboardStats,
      dashboardError: dashboardError,
      selectedOrder: null,
      selectedOrderStatus: LogisticsStatus.initial,
      selectedOrderError: null,
      trackingHistory: const [],
      trackingStatus: LogisticsStatus.initial,
      trackingError: null,
      availableVehicles: availableVehicles,
      availableDrivers: availableDrivers,
      isCreating: isCreating,
      isUpdating: isUpdating,
      operationError: null,
      operationSuccess: null,
      currentOrdersParams: currentOrdersParams,
      currentVehiclesParams: currentVehiclesParams,
      currentDriversParams: currentDriversParams,
      ordersStatusFilter: ordersStatusFilter,
      ordersDriverId: ordersDriverId,
      ordersCustomerId: ordersCustomerId,
      vehiclesTypeFilter: vehiclesTypeFilter,
      vehiclesStatusFilter: vehiclesStatusFilter,
      driversStatusFilter: driversStatusFilter,
    );
  }

  @override
  List<Object?> get props => [
        ordersStatus,
        orders,
        ordersPagination,
        ordersError,
        vehiclesStatus,
        vehicles,
        vehiclesPagination,
        vehiclesError,
        driversStatus,
        drivers,
        driversPagination,
        driversError,
        dashboardStatus,
        dashboardStats,
        dashboardError,
        selectedOrder,
        selectedOrderStatus,
        selectedOrderError,
        trackingHistory,
        trackingStatus,
        trackingError,
        availableVehicles,
        availableDrivers,
        isCreating,
        isUpdating,
        operationError,
        operationSuccess,
        currentOrdersParams,
        currentVehiclesParams,
        currentDriversParams,
        ordersStatusFilter,
        ordersDriverId,
        ordersCustomerId,
        vehiclesTypeFilter,
        vehiclesStatusFilter,
        driversStatusFilter,
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
