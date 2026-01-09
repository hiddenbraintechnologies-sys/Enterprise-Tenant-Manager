import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/repositories/pg_repository.dart';
import 'pg_event.dart';
import 'pg_state.dart';

class PgBloc extends Bloc<PgEvent, PgState> {
  final PgRepository _repository;

  PgBloc(this._repository) : super(const PgState()) {
    on<LoadRooms>(_onLoadRooms);
    on<LoadMoreRooms>(_onLoadMoreRooms);
    on<CreateRoom>(_onCreateRoom);
    on<UpdateRoom>(_onUpdateRoom);
    on<LoadAvailableRooms>(_onLoadAvailableRooms);
    on<LoadResidents>(_onLoadResidents);
    on<LoadMoreResidents>(_onLoadMoreResidents);
    on<CreateResident>(_onCreateResident);
    on<UpdateResident>(_onUpdateResident);
    on<CheckOutResident>(_onCheckOutResident);
    on<LoadPayments>(_onLoadPayments);
    on<LoadMorePayments>(_onLoadMorePayments);
    on<CreatePayment>(_onCreatePayment);
    on<CollectPayment>(_onCollectPayment);
    on<LoadOverduePayments>(_onLoadOverduePayments);
    on<LoadMaintenanceRequests>(_onLoadMaintenanceRequests);
    on<LoadMoreMaintenanceRequests>(_onLoadMoreMaintenanceRequests);
    on<CreateMaintenanceRequest>(_onCreateMaintenanceRequest);
    on<UpdateMaintenanceRequest>(_onUpdateMaintenanceRequest);
    on<CompleteMaintenanceRequest>(_onCompleteMaintenanceRequest);
    on<LoadDashboardStats>(_onLoadDashboardStats);
    on<ClearFilters>(_onClearFilters);
    on<RefreshData>(_onRefreshData);
  }

  Future<void> _onLoadRooms(LoadRooms event, Emitter<PgState> emit) async {
    emit(state.copyWith(roomsStatus: PgStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getRooms(
        params,
        type: event.type,
        isOccupied: event.isOccupied,
        floor: event.floor,
      );

      emit(state.copyWith(
        roomsStatus: PgStatus.success,
        rooms: response.data,
        roomsPagination: response.pagination,
        currentRoomsParams: params,
        roomsType: event.type,
        roomsIsOccupied: event.isOccupied,
        roomsFloor: event.floor,
        roomsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        roomsStatus: PgStatus.failure,
        roomsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreRooms(LoadMoreRooms event, Emitter<PgState> emit) async {
    if (!state.hasMoreRooms || state.roomsStatus == PgStatus.loadingMore) return;

    emit(state.copyWith(roomsStatus: PgStatus.loadingMore));

    try {
      final nextPage = (state.roomsPagination?.page ?? 0) + 1;
      final params = state.currentRoomsParams.copyWith(page: nextPage);

      final response = await _repository.getRooms(
        params,
        type: state.roomsType,
        isOccupied: state.roomsIsOccupied,
        floor: state.roomsFloor,
      );

      emit(state.copyWith(
        roomsStatus: PgStatus.success,
        rooms: [...state.rooms, ...response.data],
        roomsPagination: response.pagination,
        currentRoomsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        roomsStatus: PgStatus.failure,
        roomsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateRoom(CreateRoom event, Emitter<PgState> emit) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      await _repository.createRoom(event.data);
      emit(state.copyWith(isCreating: false));
      add(const LoadRooms());
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateRoom(UpdateRoom event, Emitter<PgState> emit) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      await _repository.updateRoom(event.id, event.data);
      emit(state.copyWith(isUpdating: false));
      add(const LoadRooms());
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadAvailableRooms(LoadAvailableRooms event, Emitter<PgState> emit) async {
    try {
      final rooms = await _repository.getAvailableRooms();
      emit(state.copyWith(availableRooms: rooms));
    } catch (e) {
      emit(state.copyWith(operationError: e.toString()));
    }
  }

  Future<void> _onLoadResidents(LoadResidents event, Emitter<PgState> emit) async {
    emit(state.copyWith(residentsStatus: PgStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getResidents(
        params,
        status: event.status,
        roomId: event.roomId,
      );

      emit(state.copyWith(
        residentsStatus: PgStatus.success,
        residents: response.data,
        residentsPagination: response.pagination,
        currentResidentsParams: params,
        residentsStatusFilter: event.status,
        residentsRoomId: event.roomId,
        residentsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        residentsStatus: PgStatus.failure,
        residentsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreResidents(LoadMoreResidents event, Emitter<PgState> emit) async {
    if (!state.hasMoreResidents || state.residentsStatus == PgStatus.loadingMore) return;

    emit(state.copyWith(residentsStatus: PgStatus.loadingMore));

    try {
      final nextPage = (state.residentsPagination?.page ?? 0) + 1;
      final params = state.currentResidentsParams.copyWith(page: nextPage);

      final response = await _repository.getResidents(
        params,
        status: state.residentsStatusFilter,
        roomId: state.residentsRoomId,
      );

      emit(state.copyWith(
        residentsStatus: PgStatus.success,
        residents: [...state.residents, ...response.data],
        residentsPagination: response.pagination,
        currentResidentsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        residentsStatus: PgStatus.failure,
        residentsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateResident(CreateResident event, Emitter<PgState> emit) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      await _repository.createResident(event.data);
      emit(state.copyWith(isCreating: false));
      add(const LoadResidents());
      add(const LoadRooms());
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateResident(UpdateResident event, Emitter<PgState> emit) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      await _repository.updateResident(event.id, event.data);
      emit(state.copyWith(isUpdating: false));
      add(const LoadResidents());
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onCheckOutResident(CheckOutResident event, Emitter<PgState> emit) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      await _repository.checkOutResident(event.id, checkOutDate: event.checkOutDate);
      emit(state.copyWith(isUpdating: false));
      add(const LoadResidents());
      add(const LoadRooms());
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadPayments(LoadPayments event, Emitter<PgState> emit) async {
    emit(state.copyWith(paymentsStatus: PgStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getPayments(
        params,
        status: event.status,
        type: event.type,
        residentId: event.residentId,
        month: event.month,
        year: event.year,
      );

      emit(state.copyWith(
        paymentsStatus: PgStatus.success,
        payments: response.data,
        paymentsPagination: response.pagination,
        currentPaymentsParams: params,
        paymentsStatusFilter: event.status,
        paymentsType: event.type,
        paymentsResidentId: event.residentId,
        paymentsMonth: event.month,
        paymentsYear: event.year,
        paymentsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        paymentsStatus: PgStatus.failure,
        paymentsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMorePayments(LoadMorePayments event, Emitter<PgState> emit) async {
    if (!state.hasMorePayments || state.paymentsStatus == PgStatus.loadingMore) return;

    emit(state.copyWith(paymentsStatus: PgStatus.loadingMore));

    try {
      final nextPage = (state.paymentsPagination?.page ?? 0) + 1;
      final params = state.currentPaymentsParams.copyWith(page: nextPage);

      final response = await _repository.getPayments(
        params,
        status: state.paymentsStatusFilter,
        type: state.paymentsType,
        residentId: state.paymentsResidentId,
        month: state.paymentsMonth,
        year: state.paymentsYear,
      );

      emit(state.copyWith(
        paymentsStatus: PgStatus.success,
        payments: [...state.payments, ...response.data],
        paymentsPagination: response.pagination,
        currentPaymentsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        paymentsStatus: PgStatus.failure,
        paymentsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreatePayment(CreatePayment event, Emitter<PgState> emit) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      await _repository.createPayment(event.data);
      emit(state.copyWith(isCreating: false));
      add(const LoadPayments());
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onCollectPayment(CollectPayment event, Emitter<PgState> emit) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      await _repository.collectPayment(
        event.id,
        paymentMethod: event.paymentMethod,
        transactionId: event.transactionId,
        notes: event.notes,
      );
      emit(state.copyWith(isUpdating: false));
      add(const LoadPayments());
      add(const LoadOverduePayments());
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadOverduePayments(LoadOverduePayments event, Emitter<PgState> emit) async {
    try {
      final payments = await _repository.getOverduePayments();
      emit(state.copyWith(overduePayments: payments));
    } catch (e) {
      emit(state.copyWith(operationError: e.toString()));
    }
  }

  Future<void> _onLoadMaintenanceRequests(LoadMaintenanceRequests event, Emitter<PgState> emit) async {
    emit(state.copyWith(maintenanceStatus: PgStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getMaintenanceRequests(
        params,
        status: event.status,
        priority: event.priority,
        roomId: event.roomId,
      );

      emit(state.copyWith(
        maintenanceStatus: PgStatus.success,
        maintenanceRequests: response.data,
        maintenancePagination: response.pagination,
        currentMaintenanceParams: params,
        maintenanceStatusFilter: event.status,
        maintenancePriority: event.priority,
        maintenanceRoomId: event.roomId,
        maintenanceError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        maintenanceStatus: PgStatus.failure,
        maintenanceError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreMaintenanceRequests(LoadMoreMaintenanceRequests event, Emitter<PgState> emit) async {
    if (!state.hasMoreMaintenance || state.maintenanceStatus == PgStatus.loadingMore) return;

    emit(state.copyWith(maintenanceStatus: PgStatus.loadingMore));

    try {
      final nextPage = (state.maintenancePagination?.page ?? 0) + 1;
      final params = state.currentMaintenanceParams.copyWith(page: nextPage);

      final response = await _repository.getMaintenanceRequests(
        params,
        status: state.maintenanceStatusFilter,
        priority: state.maintenancePriority,
        roomId: state.maintenanceRoomId,
      );

      emit(state.copyWith(
        maintenanceStatus: PgStatus.success,
        maintenanceRequests: [...state.maintenanceRequests, ...response.data],
        maintenancePagination: response.pagination,
        currentMaintenanceParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        maintenanceStatus: PgStatus.failure,
        maintenanceError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateMaintenanceRequest(CreateMaintenanceRequest event, Emitter<PgState> emit) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      await _repository.createMaintenanceRequest(event.data);
      emit(state.copyWith(isCreating: false));
      add(const LoadMaintenanceRequests());
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateMaintenanceRequest(UpdateMaintenanceRequest event, Emitter<PgState> emit) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      await _repository.updateMaintenanceRequest(event.id, event.data);
      emit(state.copyWith(isUpdating: false));
      add(const LoadMaintenanceRequests());
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onCompleteMaintenanceRequest(CompleteMaintenanceRequest event, Emitter<PgState> emit) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      await _repository.completeMaintenanceRequest(event.id, actualCost: event.actualCost);
      emit(state.copyWith(isUpdating: false));
      add(const LoadMaintenanceRequests());
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadDashboardStats(LoadDashboardStats event, Emitter<PgState> emit) async {
    emit(state.copyWith(dashboardStatus: PgStatus.loading));

    try {
      final stats = await _repository.getDashboardStats();
      emit(state.copyWith(
        dashboardStatus: PgStatus.success,
        dashboardStats: stats,
        dashboardError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        dashboardStatus: PgStatus.failure,
        dashboardError: e.toString(),
      ));
    }
  }

  void _onClearFilters(ClearFilters event, Emitter<PgState> emit) {
    emit(PgState(
      roomsStatus: state.roomsStatus,
      rooms: state.rooms,
      roomsPagination: state.roomsPagination,
      residentsStatus: state.residentsStatus,
      residents: state.residents,
      residentsPagination: state.residentsPagination,
      paymentsStatus: state.paymentsStatus,
      payments: state.payments,
      paymentsPagination: state.paymentsPagination,
      maintenanceStatus: state.maintenanceStatus,
      maintenanceRequests: state.maintenanceRequests,
      maintenancePagination: state.maintenancePagination,
      dashboardStatus: state.dashboardStatus,
      dashboardStats: state.dashboardStats,
      availableRooms: state.availableRooms,
      overduePayments: state.overduePayments,
    ));
  }

  Future<void> _onRefreshData(RefreshData event, Emitter<PgState> emit) async {
    add(const LoadDashboardStats());
    add(const LoadRooms());
    add(const LoadResidents());
    add(const LoadPayments());
    add(const LoadMaintenanceRequests());
    add(const LoadOverduePayments());
  }
}
