import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/repositories/salon_repository.dart';
import 'salon_event.dart';
import 'salon_state.dart';

class SalonBloc extends Bloc<SalonEvent, SalonState> {
  final SalonRepository _repository;

  SalonBloc(this._repository) : super(const SalonState()) {
    on<LoadServices>(_onLoadServices);
    on<LoadMoreServices>(_onLoadMoreServices);
    on<CreateService>(_onCreateService);
    on<UpdateService>(_onUpdateService);
    on<DeleteService>(_onDeleteService);
    on<LoadAppointments>(_onLoadAppointments);
    on<LoadMoreAppointments>(_onLoadMoreAppointments);
    on<CreateAppointment>(_onCreateAppointment);
    on<UpdateAppointment>(_onUpdateAppointment);
    on<CancelAppointment>(_onCancelAppointment);
    on<LoadStaff>(_onLoadStaff);
    on<LoadMoreStaff>(_onLoadMoreStaff);
    on<CreateStaff>(_onCreateStaff);
    on<UpdateStaff>(_onUpdateStaff);
    on<LoadCustomers>(_onLoadCustomers);
    on<LoadMoreCustomers>(_onLoadMoreCustomers);
    on<CreateCustomer>(_onCreateCustomer);
    on<UpdateCustomer>(_onUpdateCustomer);
    on<LoadDashboardStats>(_onLoadDashboardStats);
    on<LoadTodayAppointments>(_onLoadTodayAppointments);
    on<ClearFilters>(_onClearFilters);
    on<RefreshData>(_onRefreshData);
  }

  Future<void> _onLoadServices(
    LoadServices event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(servicesStatus: SalonStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getServices(
        params,
        category: event.category,
        isActive: event.isActive,
      );

      emit(state.copyWith(
        servicesStatus: SalonStatus.success,
        services: response.data,
        servicesPagination: response.pagination,
        currentServicesParams: params,
        servicesCategory: event.category,
        servicesIsActive: event.isActive,
        servicesError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        servicesStatus: SalonStatus.failure,
        servicesError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreServices(
    LoadMoreServices event,
    Emitter<SalonState> emit,
  ) async {
    if (!state.hasMoreServices || state.servicesStatus == SalonStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(servicesStatus: SalonStatus.loadingMore));

    try {
      final nextPage = (state.servicesPagination?.page ?? 0) + 1;
      final params = state.currentServicesParams.copyWith(page: nextPage);

      final response = await _repository.getServices(
        params,
        category: state.servicesCategory,
        isActive: state.servicesIsActive,
      );

      emit(state.copyWith(
        servicesStatus: SalonStatus.success,
        services: [...state.services, ...response.data],
        servicesPagination: response.pagination,
        currentServicesParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        servicesStatus: SalonStatus.failure,
        servicesError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateService(
    CreateService event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.createService(event.data);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Service created successfully',
      ));
      add(const LoadServices());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateService(
    UpdateService event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.updateService(event.id, event.data);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Service updated successfully',
      ));
      add(const LoadServices());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onDeleteService(
    DeleteService event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.deleteService(event.id);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Service deleted successfully',
      ));
      add(const LoadServices());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadAppointments(
    LoadAppointments event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(appointmentsStatus: SalonStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        status: event.status,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getAppointments(
        params,
        status: event.status,
        staffId: event.staffId,
        customerId: event.customerId,
        startDate: event.startDate,
        endDate: event.endDate,
      );

      emit(state.copyWith(
        appointmentsStatus: SalonStatus.success,
        appointments: response.data,
        appointmentsPagination: response.pagination,
        currentAppointmentsParams: params,
        appointmentsStatusFilter: event.status,
        appointmentsStaffId: event.staffId,
        appointmentsCustomerId: event.customerId,
        appointmentsStartDate: event.startDate,
        appointmentsEndDate: event.endDate,
        appointmentsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        appointmentsStatus: SalonStatus.failure,
        appointmentsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreAppointments(
    LoadMoreAppointments event,
    Emitter<SalonState> emit,
  ) async {
    if (!state.hasMoreAppointments || state.appointmentsStatus == SalonStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(appointmentsStatus: SalonStatus.loadingMore));

    try {
      final nextPage = (state.appointmentsPagination?.page ?? 0) + 1;
      final params = state.currentAppointmentsParams.copyWith(page: nextPage);

      final response = await _repository.getAppointments(
        params,
        status: state.appointmentsStatusFilter,
        staffId: state.appointmentsStaffId,
        customerId: state.appointmentsCustomerId,
        startDate: state.appointmentsStartDate,
        endDate: state.appointmentsEndDate,
      );

      emit(state.copyWith(
        appointmentsStatus: SalonStatus.success,
        appointments: [...state.appointments, ...response.data],
        appointmentsPagination: response.pagination,
        currentAppointmentsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        appointmentsStatus: SalonStatus.failure,
        appointmentsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateAppointment(
    CreateAppointment event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.createAppointment(event.data);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Appointment created successfully',
      ));
      add(const LoadAppointments());
      add(const LoadTodayAppointments());
      add(const LoadDashboardStats());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateAppointment(
    UpdateAppointment event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.updateAppointment(event.id, event.data);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Appointment updated successfully',
      ));
      add(const LoadAppointments());
      add(const LoadTodayAppointments());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onCancelAppointment(
    CancelAppointment event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.cancelAppointment(event.id);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Appointment cancelled successfully',
      ));
      add(const LoadAppointments());
      add(const LoadTodayAppointments());
      add(const LoadDashboardStats());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadStaff(
    LoadStaff event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(staffStatus: SalonStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getStaff(
        params,
        isActive: event.isActive,
        specialization: event.specialization,
      );

      emit(state.copyWith(
        staffStatus: SalonStatus.success,
        staff: response.data,
        staffPagination: response.pagination,
        currentStaffParams: params,
        staffIsActive: event.isActive,
        staffSpecialization: event.specialization,
        staffError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        staffStatus: SalonStatus.failure,
        staffError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreStaff(
    LoadMoreStaff event,
    Emitter<SalonState> emit,
  ) async {
    if (!state.hasMoreStaff || state.staffStatus == SalonStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(staffStatus: SalonStatus.loadingMore));

    try {
      final nextPage = (state.staffPagination?.page ?? 0) + 1;
      final params = state.currentStaffParams.copyWith(page: nextPage);

      final response = await _repository.getStaff(
        params,
        isActive: state.staffIsActive,
        specialization: state.staffSpecialization,
      );

      emit(state.copyWith(
        staffStatus: SalonStatus.success,
        staff: [...state.staff, ...response.data],
        staffPagination: response.pagination,
        currentStaffParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        staffStatus: SalonStatus.failure,
        staffError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateStaff(
    CreateStaff event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.createStaff(event.data);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Staff member created successfully',
      ));
      add(const LoadStaff());
      add(const LoadDashboardStats());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateStaff(
    UpdateStaff event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.updateStaff(event.id, event.data);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Staff member updated successfully',
      ));
      add(const LoadStaff());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadCustomers(
    LoadCustomers event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(customersStatus: SalonStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getCustomers(
        params,
        search: event.search,
        minLoyaltyPoints: event.minLoyaltyPoints,
      );

      emit(state.copyWith(
        customersStatus: SalonStatus.success,
        customers: response.data,
        customersPagination: response.pagination,
        currentCustomersParams: params,
        customersMinLoyaltyPoints: event.minLoyaltyPoints,
        customersError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        customersStatus: SalonStatus.failure,
        customersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreCustomers(
    LoadMoreCustomers event,
    Emitter<SalonState> emit,
  ) async {
    if (!state.hasMoreCustomers || state.customersStatus == SalonStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(customersStatus: SalonStatus.loadingMore));

    try {
      final nextPage = (state.customersPagination?.page ?? 0) + 1;
      final params = state.currentCustomersParams.copyWith(page: nextPage);

      final response = await _repository.getCustomers(
        params,
        minLoyaltyPoints: state.customersMinLoyaltyPoints,
      );

      emit(state.copyWith(
        customersStatus: SalonStatus.success,
        customers: [...state.customers, ...response.data],
        customersPagination: response.pagination,
        currentCustomersParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        customersStatus: SalonStatus.failure,
        customersError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateCustomer(
    CreateCustomer event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.createCustomer(event.data);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Customer created successfully',
      ));
      add(const LoadCustomers());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateCustomer(
    UpdateCustomer event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(operationStatus: SalonStatus.loading));

    try {
      await _repository.updateCustomer(event.id, event.data);
      emit(state.copyWith(
        operationStatus: SalonStatus.success,
        operationSuccess: 'Customer updated successfully',
      ));
      add(const LoadCustomers());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: SalonStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadDashboardStats(
    LoadDashboardStats event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(dashboardStatus: SalonStatus.loading));

    try {
      final stats = await _repository.getDashboardStats();
      emit(state.copyWith(
        dashboardStatus: SalonStatus.success,
        dashboardStats: stats,
        dashboardError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        dashboardStatus: SalonStatus.failure,
        dashboardError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadTodayAppointments(
    LoadTodayAppointments event,
    Emitter<SalonState> emit,
  ) async {
    emit(state.copyWith(todayAppointmentsStatus: SalonStatus.loading));

    try {
      final appointments = await _repository.getTodayAppointments();
      emit(state.copyWith(
        todayAppointmentsStatus: SalonStatus.success,
        todayAppointments: appointments,
        todayAppointmentsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        todayAppointmentsStatus: SalonStatus.failure,
        todayAppointmentsError: e.toString(),
      ));
    }
  }

  void _onClearFilters(
    ClearFilters event,
    Emitter<SalonState> emit,
  ) {
    emit(SalonState(
      servicesStatus: state.servicesStatus,
      services: state.services,
      servicesPagination: state.servicesPagination,
      appointmentsStatus: state.appointmentsStatus,
      appointments: state.appointments,
      appointmentsPagination: state.appointmentsPagination,
      staffStatus: state.staffStatus,
      staff: state.staff,
      staffPagination: state.staffPagination,
      customersStatus: state.customersStatus,
      customers: state.customers,
      customersPagination: state.customersPagination,
      dashboardStatus: state.dashboardStatus,
      dashboardStats: state.dashboardStats,
      todayAppointmentsStatus: state.todayAppointmentsStatus,
      todayAppointments: state.todayAppointments,
      currentServicesParams: PaginationParams(),
      currentAppointmentsParams: PaginationParams(),
      currentStaffParams: PaginationParams(),
      currentCustomersParams: PaginationParams(),
    ));
  }

  Future<void> _onRefreshData(
    RefreshData event,
    Emitter<SalonState> emit,
  ) async {
    add(const LoadServices());
    add(const LoadAppointments());
    add(const LoadStaff());
    add(const LoadCustomers());
    add(const LoadDashboardStats());
    add(const LoadTodayAppointments());
  }
}
