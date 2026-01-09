import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/repositories/tourism_repository.dart';
import 'tourism_event.dart';
import 'tourism_state.dart';

class TourismBloc extends Bloc<TourismEvent, TourismState> {
  final TourismRepository _repository;

  TourismBloc(this._repository) : super(const TourismState()) {
    on<LoadPackages>(_onLoadPackages);
    on<LoadMorePackages>(_onLoadMorePackages);
    on<LoadPackageDetail>(_onLoadPackageDetail);
    on<CreatePackage>(_onCreatePackage);
    on<UpdatePackage>(_onUpdatePackage);
    on<DeletePackage>(_onDeletePackage);
    on<LoadBookings>(_onLoadBookings);
    on<LoadMoreBookings>(_onLoadMoreBookings);
    on<CreateBooking>(_onCreateBooking);
    on<UpdateBooking>(_onUpdateBooking);
    on<CancelBooking>(_onCancelBooking);
    on<LoadItineraries>(_onLoadItineraries);
    on<CreateItinerary>(_onCreateItinerary);
    on<UpdateItinerary>(_onUpdateItinerary);
    on<DeleteItinerary>(_onDeleteItinerary);
    on<LoadCustomers>(_onLoadCustomers);
    on<LoadMoreCustomers>(_onLoadMoreCustomers);
    on<CreateCustomer>(_onCreateCustomer);
    on<UpdateCustomer>(_onUpdateCustomer);
    on<LoadDashboardStats>(_onLoadDashboardStats);
    on<ClearFilters>(_onClearFilters);
    on<RefreshData>(_onRefreshData);
  }

  Future<void> _onLoadPackages(
    LoadPackages event,
    Emitter<TourismState> emit,
  ) async {
    emit(state.copyWith(packagesStatus: TourismStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getPackages(
        params,
        category: event.category,
        destination: event.destination,
        isActive: event.isActive,
      );

      emit(state.copyWith(
        packagesStatus: TourismStatus.success,
        packages: response.data,
        packagesPagination: response.pagination,
        currentPackagesParams: params,
        packagesCategory: event.category,
        packagesDestination: event.destination,
        packagesIsActive: event.isActive,
        packagesError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        packagesStatus: TourismStatus.failure,
        packagesError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMorePackages(
    LoadMorePackages event,
    Emitter<TourismState> emit,
  ) async {
    if (!state.hasMorePackages ||
        state.packagesStatus == TourismStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(packagesStatus: TourismStatus.loadingMore));

    try {
      final nextPage = (state.packagesPagination?.page ?? 0) + 1;
      final params = state.currentPackagesParams.copyWith(page: nextPage);

      final response = await _repository.getPackages(
        params,
        category: state.packagesCategory,
        destination: state.packagesDestination,
        isActive: state.packagesIsActive,
      );

      emit(state.copyWith(
        packagesStatus: TourismStatus.success,
        packages: [...state.packages, ...response.data],
        packagesPagination: response.pagination,
        currentPackagesParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        packagesStatus: TourismStatus.failure,
        packagesError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadPackageDetail(
    LoadPackageDetail event,
    Emitter<TourismState> emit,
  ) async {
    emit(state.copyWith(selectedPackageStatus: TourismStatus.loading));

    try {
      final package = await _repository.getPackage(event.packageId);
      final itineraries = await _repository.getItineraries(event.packageId);

      emit(state.copyWith(
        selectedPackageStatus: TourismStatus.success,
        selectedPackage: package,
        itineraries: itineraries,
        itinerariesStatus: TourismStatus.success,
        selectedPackageError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        selectedPackageStatus: TourismStatus.failure,
        selectedPackageError: e.toString(),
      ));
    }
  }

  Future<void> _onCreatePackage(
    CreatePackage event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.createPackage(event.data);
      add(const LoadPackages());
    } catch (e) {
      emit(state.copyWith(
        packagesStatus: TourismStatus.failure,
        packagesError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdatePackage(
    UpdatePackage event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.updatePackage(event.id, event.data);
      add(const LoadPackages());
    } catch (e) {
      emit(state.copyWith(
        packagesStatus: TourismStatus.failure,
        packagesError: e.toString(),
      ));
    }
  }

  Future<void> _onDeletePackage(
    DeletePackage event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.deletePackage(event.id);
      add(const LoadPackages());
    } catch (e) {
      emit(state.copyWith(
        packagesStatus: TourismStatus.failure,
        packagesError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadBookings(
    LoadBookings event,
    Emitter<TourismState> emit,
  ) async {
    emit(state.copyWith(bookingsStatus: TourismStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        status: event.status,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getBookings(
        params,
        status: event.status,
        paymentStatus: event.paymentStatus,
        packageId: event.packageId,
        customerId: event.customerId,
      );

      emit(state.copyWith(
        bookingsStatus: TourismStatus.success,
        bookings: response.data,
        bookingsPagination: response.pagination,
        currentBookingsParams: params,
        bookingsStatusFilter: event.status,
        bookingsPaymentStatus: event.paymentStatus,
        bookingsPackageId: event.packageId,
        bookingsCustomerId: event.customerId,
        bookingsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        bookingsStatus: TourismStatus.failure,
        bookingsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreBookings(
    LoadMoreBookings event,
    Emitter<TourismState> emit,
  ) async {
    if (!state.hasMoreBookings ||
        state.bookingsStatus == TourismStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(bookingsStatus: TourismStatus.loadingMore));

    try {
      final nextPage = (state.bookingsPagination?.page ?? 0) + 1;
      final params = state.currentBookingsParams.copyWith(page: nextPage);

      final response = await _repository.getBookings(
        params,
        status: state.bookingsStatusFilter,
        paymentStatus: state.bookingsPaymentStatus,
        packageId: state.bookingsPackageId,
        customerId: state.bookingsCustomerId,
      );

      emit(state.copyWith(
        bookingsStatus: TourismStatus.success,
        bookings: [...state.bookings, ...response.data],
        bookingsPagination: response.pagination,
        currentBookingsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        bookingsStatus: TourismStatus.failure,
        bookingsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateBooking(
    CreateBooking event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.createBooking(event.data);
      add(const LoadBookings());
      add(const LoadDashboardStats());
    } catch (e) {
      emit(state.copyWith(
        bookingsStatus: TourismStatus.failure,
        bookingsError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateBooking(
    UpdateBooking event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.updateBooking(event.id, event.data);
      add(const LoadBookings());
    } catch (e) {
      emit(state.copyWith(
        bookingsStatus: TourismStatus.failure,
        bookingsError: e.toString(),
      ));
    }
  }

  Future<void> _onCancelBooking(
    CancelBooking event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.cancelBooking(event.id);
      add(const LoadBookings());
      add(const LoadDashboardStats());
    } catch (e) {
      emit(state.copyWith(
        bookingsStatus: TourismStatus.failure,
        bookingsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadItineraries(
    LoadItineraries event,
    Emitter<TourismState> emit,
  ) async {
    emit(state.copyWith(itinerariesStatus: TourismStatus.loading));

    try {
      final itineraries = await _repository.getItineraries(event.packageId);

      emit(state.copyWith(
        itinerariesStatus: TourismStatus.success,
        itineraries: itineraries,
        itinerariesError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        itinerariesStatus: TourismStatus.failure,
        itinerariesError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateItinerary(
    CreateItinerary event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.createItinerary(event.data);
      final packageId = event.data['packageId'] as String?;
      if (packageId != null) {
        add(LoadItineraries(packageId));
      }
    } catch (e) {
      emit(state.copyWith(
        itinerariesStatus: TourismStatus.failure,
        itinerariesError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateItinerary(
    UpdateItinerary event,
    Emitter<TourismState> emit,
  ) async {
    try {
      final updated = await _repository.updateItinerary(event.id, event.data);
      add(LoadItineraries(updated.packageId));
    } catch (e) {
      emit(state.copyWith(
        itinerariesStatus: TourismStatus.failure,
        itinerariesError: e.toString(),
      ));
    }
  }

  Future<void> _onDeleteItinerary(
    DeleteItinerary event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.deleteItinerary(event.id);
      if (state.selectedPackage != null) {
        add(LoadItineraries(state.selectedPackage!.id));
      }
    } catch (e) {
      emit(state.copyWith(
        itinerariesStatus: TourismStatus.failure,
        itinerariesError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadCustomers(
    LoadCustomers event,
    Emitter<TourismState> emit,
  ) async {
    emit(state.copyWith(customersStatus: TourismStatus.loading));

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
      );

      emit(state.copyWith(
        customersStatus: TourismStatus.success,
        customers: response.data,
        customersPagination: response.pagination,
        currentCustomersParams: params,
        customersError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        customersStatus: TourismStatus.failure,
        customersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreCustomers(
    LoadMoreCustomers event,
    Emitter<TourismState> emit,
  ) async {
    if (!state.hasMoreCustomers ||
        state.customersStatus == TourismStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(customersStatus: TourismStatus.loadingMore));

    try {
      final nextPage = (state.customersPagination?.page ?? 0) + 1;
      final params = state.currentCustomersParams.copyWith(page: nextPage);

      final response = await _repository.getCustomers(params);

      emit(state.copyWith(
        customersStatus: TourismStatus.success,
        customers: [...state.customers, ...response.data],
        customersPagination: response.pagination,
        currentCustomersParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        customersStatus: TourismStatus.failure,
        customersError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateCustomer(
    CreateCustomer event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.createCustomer(event.data);
      add(const LoadCustomers());
    } catch (e) {
      emit(state.copyWith(
        customersStatus: TourismStatus.failure,
        customersError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateCustomer(
    UpdateCustomer event,
    Emitter<TourismState> emit,
  ) async {
    try {
      await _repository.updateCustomer(event.id, event.data);
      add(const LoadCustomers());
    } catch (e) {
      emit(state.copyWith(
        customersStatus: TourismStatus.failure,
        customersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadDashboardStats(
    LoadDashboardStats event,
    Emitter<TourismState> emit,
  ) async {
    emit(state.copyWith(dashboardStatus: TourismStatus.loading));

    try {
      final stats = await _repository.getDashboardStats();

      emit(state.copyWith(
        dashboardStatus: TourismStatus.success,
        dashboardStats: stats,
        dashboardError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        dashboardStatus: TourismStatus.failure,
        dashboardError: e.toString(),
      ));
    }
  }

  void _onClearFilters(
    ClearFilters event,
    Emitter<TourismState> emit,
  ) {
    emit(TourismState(
      packagesStatus: state.packagesStatus,
      packages: state.packages,
      packagesPagination: state.packagesPagination,
      bookingsStatus: state.bookingsStatus,
      bookings: state.bookings,
      bookingsPagination: state.bookingsPagination,
      customersStatus: state.customersStatus,
      customers: state.customers,
      customersPagination: state.customersPagination,
      itinerariesStatus: state.itinerariesStatus,
      itineraries: state.itineraries,
      dashboardStatus: state.dashboardStatus,
      dashboardStats: state.dashboardStats,
      selectedPackage: state.selectedPackage,
      selectedPackageStatus: state.selectedPackageStatus,
    ));
  }

  Future<void> _onRefreshData(
    RefreshData event,
    Emitter<TourismState> emit,
  ) async {
    add(const LoadPackages());
    add(const LoadBookings());
    add(const LoadCustomers());
    add(const LoadDashboardStats());
  }
}
