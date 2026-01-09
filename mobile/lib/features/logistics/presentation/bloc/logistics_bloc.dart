import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/repositories/logistics_repository.dart';
import 'logistics_event.dart';
import 'logistics_state.dart';

class LogisticsBloc extends Bloc<LogisticsEvent, LogisticsState> {
  final LogisticsRepository _repository;

  LogisticsBloc(this._repository) : super(const LogisticsState()) {
    on<LoadOrders>(_onLoadOrders);
    on<LoadMoreOrders>(_onLoadMoreOrders);
    on<LoadOrder>(_onLoadOrder);
    on<CreateOrder>(_onCreateOrder);
    on<UpdateOrder>(_onUpdateOrder);
    on<AssignDriver>(_onAssignDriver);
    on<UpdateOrderStatus>(_onUpdateOrderStatus);
    on<LoadVehicles>(_onLoadVehicles);
    on<LoadMoreVehicles>(_onLoadMoreVehicles);
    on<LoadAvailableVehicles>(_onLoadAvailableVehicles);
    on<CreateVehicle>(_onCreateVehicle);
    on<UpdateVehicle>(_onUpdateVehicle);
    on<LoadDrivers>(_onLoadDrivers);
    on<LoadMoreDrivers>(_onLoadMoreDrivers);
    on<LoadAvailableDrivers>(_onLoadAvailableDrivers);
    on<CreateDriver>(_onCreateDriver);
    on<UpdateDriver>(_onUpdateDriver);
    on<LoadOrderTracking>(_onLoadOrderTracking);
    on<AddTrackingUpdate>(_onAddTrackingUpdate);
    on<LoadDashboardStats>(_onLoadDashboardStats);
    on<ClearFilters>(_onClearFilters);
    on<RefreshData>(_onRefreshData);
    on<ClearSelectedOrder>(_onClearSelectedOrder);
    on<ClearError>(_onClearError);
  }

  Future<void> _onLoadOrders(
    LoadOrders event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(ordersStatus: LogisticsStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        status: event.status,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getOrders(
        params,
        status: event.status,
        driverId: event.driverId,
        customerId: event.customerId,
      );

      emit(state.copyWith(
        ordersStatus: LogisticsStatus.success,
        orders: response.data,
        ordersPagination: response.pagination,
        currentOrdersParams: params,
        ordersStatusFilter: event.status,
        ordersDriverId: event.driverId,
        ordersCustomerId: event.customerId,
        ordersError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        ordersStatus: LogisticsStatus.failure,
        ordersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreOrders(
    LoadMoreOrders event,
    Emitter<LogisticsState> emit,
  ) async {
    if (!state.hasMoreOrders || state.ordersStatus == LogisticsStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(ordersStatus: LogisticsStatus.loadingMore));

    try {
      final nextPage = (state.ordersPagination?.page ?? 0) + 1;
      final params = state.currentOrdersParams.copyWith(page: nextPage);

      final response = await _repository.getOrders(
        params,
        status: state.ordersStatusFilter,
        driverId: state.ordersDriverId,
        customerId: state.ordersCustomerId,
      );

      emit(state.copyWith(
        ordersStatus: LogisticsStatus.success,
        orders: [...state.orders, ...response.data],
        ordersPagination: response.pagination,
        currentOrdersParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        ordersStatus: LogisticsStatus.failure,
        ordersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadOrder(
    LoadOrder event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(selectedOrderStatus: LogisticsStatus.loading));

    try {
      final order = await _repository.getOrder(event.id);
      emit(state.copyWith(
        selectedOrder: order,
        selectedOrderStatus: LogisticsStatus.success,
        selectedOrderError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        selectedOrderStatus: LogisticsStatus.failure,
        selectedOrderError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateOrder(
    CreateOrder event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null, operationSuccess: null));

    try {
      final order = await _repository.createOrder(event.data);
      emit(state.copyWith(
        isCreating: false,
        orders: [order, ...state.orders],
        operationSuccess: 'Order created successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateOrder(
    UpdateOrder event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null, operationSuccess: null));

    try {
      final order = await _repository.updateOrder(event.id, event.data);
      final updatedOrders = state.orders.map((o) => o.id == order.id ? order : o).toList();
      emit(state.copyWith(
        isUpdating: false,
        orders: updatedOrders,
        selectedOrder: state.selectedOrder?.id == order.id ? order : state.selectedOrder,
        operationSuccess: 'Order updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onAssignDriver(
    AssignDriver event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null, operationSuccess: null));

    try {
      final order = await _repository.assignDriver(
        event.orderId,
        event.driverId,
        vehicleId: event.vehicleId,
      );
      final updatedOrders = state.orders.map((o) => o.id == order.id ? order : o).toList();
      emit(state.copyWith(
        isUpdating: false,
        orders: updatedOrders,
        selectedOrder: state.selectedOrder?.id == order.id ? order : state.selectedOrder,
        operationSuccess: 'Driver assigned successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateOrderStatus(
    UpdateOrderStatus event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null, operationSuccess: null));

    try {
      final order = await _repository.updateOrderStatus(
        event.orderId,
        event.status,
        notes: event.notes,
      );
      final updatedOrders = state.orders.map((o) => o.id == order.id ? order : o).toList();
      emit(state.copyWith(
        isUpdating: false,
        orders: updatedOrders,
        selectedOrder: state.selectedOrder?.id == order.id ? order : state.selectedOrder,
        operationSuccess: 'Order status updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadVehicles(
    LoadVehicles event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(vehiclesStatus: LogisticsStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getVehicles(
        params,
        type: event.type,
        status: event.status,
      );

      emit(state.copyWith(
        vehiclesStatus: LogisticsStatus.success,
        vehicles: response.data,
        vehiclesPagination: response.pagination,
        currentVehiclesParams: params,
        vehiclesTypeFilter: event.type,
        vehiclesStatusFilter: event.status,
        vehiclesError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        vehiclesStatus: LogisticsStatus.failure,
        vehiclesError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreVehicles(
    LoadMoreVehicles event,
    Emitter<LogisticsState> emit,
  ) async {
    if (!state.hasMoreVehicles || state.vehiclesStatus == LogisticsStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(vehiclesStatus: LogisticsStatus.loadingMore));

    try {
      final nextPage = (state.vehiclesPagination?.page ?? 0) + 1;
      final params = state.currentVehiclesParams.copyWith(page: nextPage);

      final response = await _repository.getVehicles(
        params,
        type: state.vehiclesTypeFilter,
        status: state.vehiclesStatusFilter,
      );

      emit(state.copyWith(
        vehiclesStatus: LogisticsStatus.success,
        vehicles: [...state.vehicles, ...response.data],
        vehiclesPagination: response.pagination,
        currentVehiclesParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        vehiclesStatus: LogisticsStatus.failure,
        vehiclesError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadAvailableVehicles(
    LoadAvailableVehicles event,
    Emitter<LogisticsState> emit,
  ) async {
    try {
      final vehicles = await _repository.getAvailableVehicles();
      emit(state.copyWith(availableVehicles: vehicles));
    } catch (e) {
      emit(state.copyWith(operationError: e.toString()));
    }
  }

  Future<void> _onCreateVehicle(
    CreateVehicle event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null, operationSuccess: null));

    try {
      final vehicle = await _repository.createVehicle(event.data);
      emit(state.copyWith(
        isCreating: false,
        vehicles: [vehicle, ...state.vehicles],
        operationSuccess: 'Vehicle created successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateVehicle(
    UpdateVehicle event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null, operationSuccess: null));

    try {
      final vehicle = await _repository.updateVehicle(event.id, event.data);
      final updatedVehicles = state.vehicles.map((v) => v.id == vehicle.id ? vehicle : v).toList();
      emit(state.copyWith(
        isUpdating: false,
        vehicles: updatedVehicles,
        operationSuccess: 'Vehicle updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadDrivers(
    LoadDrivers event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(driversStatus: LogisticsStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getDrivers(
        params,
        status: event.status,
      );

      emit(state.copyWith(
        driversStatus: LogisticsStatus.success,
        drivers: response.data,
        driversPagination: response.pagination,
        currentDriversParams: params,
        driversStatusFilter: event.status,
        driversError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        driversStatus: LogisticsStatus.failure,
        driversError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreDrivers(
    LoadMoreDrivers event,
    Emitter<LogisticsState> emit,
  ) async {
    if (!state.hasMoreDrivers || state.driversStatus == LogisticsStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(driversStatus: LogisticsStatus.loadingMore));

    try {
      final nextPage = (state.driversPagination?.page ?? 0) + 1;
      final params = state.currentDriversParams.copyWith(page: nextPage);

      final response = await _repository.getDrivers(
        params,
        status: state.driversStatusFilter,
      );

      emit(state.copyWith(
        driversStatus: LogisticsStatus.success,
        drivers: [...state.drivers, ...response.data],
        driversPagination: response.pagination,
        currentDriversParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        driversStatus: LogisticsStatus.failure,
        driversError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadAvailableDrivers(
    LoadAvailableDrivers event,
    Emitter<LogisticsState> emit,
  ) async {
    try {
      final drivers = await _repository.getAvailableDrivers();
      emit(state.copyWith(availableDrivers: drivers));
    } catch (e) {
      emit(state.copyWith(operationError: e.toString()));
    }
  }

  Future<void> _onCreateDriver(
    CreateDriver event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null, operationSuccess: null));

    try {
      final driver = await _repository.createDriver(event.data);
      emit(state.copyWith(
        isCreating: false,
        drivers: [driver, ...state.drivers],
        operationSuccess: 'Driver created successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateDriver(
    UpdateDriver event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null, operationSuccess: null));

    try {
      final driver = await _repository.updateDriver(event.id, event.data);
      final updatedDrivers = state.drivers.map((d) => d.id == driver.id ? driver : d).toList();
      emit(state.copyWith(
        isUpdating: false,
        drivers: updatedDrivers,
        operationSuccess: 'Driver updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadOrderTracking(
    LoadOrderTracking event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(trackingStatus: LogisticsStatus.loading));

    try {
      final tracking = await _repository.getOrderTracking(event.orderId);
      emit(state.copyWith(
        trackingHistory: tracking,
        trackingStatus: LogisticsStatus.success,
        trackingError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        trackingStatus: LogisticsStatus.failure,
        trackingError: e.toString(),
      ));
    }
  }

  Future<void> _onAddTrackingUpdate(
    AddTrackingUpdate event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null, operationSuccess: null));

    try {
      final tracking = await _repository.addTrackingUpdate(event.orderId, event.data);
      emit(state.copyWith(
        isUpdating: false,
        trackingHistory: [tracking, ...state.trackingHistory],
        operationSuccess: 'Tracking update added successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadDashboardStats(
    LoadDashboardStats event,
    Emitter<LogisticsState> emit,
  ) async {
    emit(state.copyWith(dashboardStatus: LogisticsStatus.loading));

    try {
      final stats = await _repository.getDashboardStats();
      emit(state.copyWith(
        dashboardStatus: LogisticsStatus.success,
        dashboardStats: stats,
        dashboardError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        dashboardStatus: LogisticsStatus.failure,
        dashboardError: e.toString(),
      ));
    }
  }

  void _onClearFilters(
    ClearFilters event,
    Emitter<LogisticsState> emit,
  ) {
    emit(LogisticsState(
      ordersStatus: state.ordersStatus,
      orders: state.orders,
      ordersPagination: state.ordersPagination,
      vehiclesStatus: state.vehiclesStatus,
      vehicles: state.vehicles,
      vehiclesPagination: state.vehiclesPagination,
      driversStatus: state.driversStatus,
      drivers: state.drivers,
      driversPagination: state.driversPagination,
      dashboardStatus: state.dashboardStatus,
      dashboardStats: state.dashboardStats,
      availableVehicles: state.availableVehicles,
      availableDrivers: state.availableDrivers,
      currentOrdersParams: PaginationParams(),
      currentVehiclesParams: PaginationParams(),
      currentDriversParams: PaginationParams(),
    ));
  }

  Future<void> _onRefreshData(
    RefreshData event,
    Emitter<LogisticsState> emit,
  ) async {
    add(const LoadOrders());
    add(const LoadVehicles());
    add(const LoadDrivers());
    add(const LoadDashboardStats());
  }

  void _onClearSelectedOrder(
    ClearSelectedOrder event,
    Emitter<LogisticsState> emit,
  ) {
    emit(state.clearSelectedOrder());
  }

  void _onClearError(
    ClearError event,
    Emitter<LogisticsState> emit,
  ) {
    emit(state.copyWith(
      ordersError: null,
      vehiclesError: null,
      driversError: null,
      dashboardError: null,
      operationError: null,
      operationSuccess: null,
    ));
  }
}
