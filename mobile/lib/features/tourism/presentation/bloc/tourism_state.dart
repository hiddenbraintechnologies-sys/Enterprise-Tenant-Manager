import 'package:equatable/equatable.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/tour_package.dart';
import '../../domain/entities/tour_booking.dart';
import '../../domain/entities/tour_itinerary.dart';
import '../../domain/entities/tour_customer.dart';

enum TourismStatus { initial, loading, loadingMore, success, failure }

class TourismState extends Equatable {
  final TourismStatus packagesStatus;
  final List<TourPackage> packages;
  final PaginationMeta? packagesPagination;
  final String? packagesError;

  final TourismStatus bookingsStatus;
  final List<TourBooking> bookings;
  final PaginationMeta? bookingsPagination;
  final String? bookingsError;

  final TourismStatus customersStatus;
  final List<TourCustomer> customers;
  final PaginationMeta? customersPagination;
  final String? customersError;

  final TourismStatus itinerariesStatus;
  final List<TourItinerary> itineraries;
  final String? itinerariesError;

  final TourismStatus dashboardStatus;
  final Map<String, dynamic>? dashboardStats;
  final String? dashboardError;

  final TourPackage? selectedPackage;
  final TourismStatus selectedPackageStatus;
  final String? selectedPackageError;

  final PaginationParams currentPackagesParams;
  final PaginationParams currentBookingsParams;
  final PaginationParams currentCustomersParams;

  final String? packagesCategory;
  final String? packagesDestination;
  final bool? packagesIsActive;

  final String? bookingsStatusFilter;
  final String? bookingsPaymentStatus;
  final String? bookingsPackageId;
  final String? bookingsCustomerId;

  const TourismState({
    this.packagesStatus = TourismStatus.initial,
    this.packages = const [],
    this.packagesPagination,
    this.packagesError,
    this.bookingsStatus = TourismStatus.initial,
    this.bookings = const [],
    this.bookingsPagination,
    this.bookingsError,
    this.customersStatus = TourismStatus.initial,
    this.customers = const [],
    this.customersPagination,
    this.customersError,
    this.itinerariesStatus = TourismStatus.initial,
    this.itineraries = const [],
    this.itinerariesError,
    this.dashboardStatus = TourismStatus.initial,
    this.dashboardStats,
    this.dashboardError,
    this.selectedPackage,
    this.selectedPackageStatus = TourismStatus.initial,
    this.selectedPackageError,
    PaginationParams? currentPackagesParams,
    PaginationParams? currentBookingsParams,
    PaginationParams? currentCustomersParams,
    this.packagesCategory,
    this.packagesDestination,
    this.packagesIsActive,
    this.bookingsStatusFilter,
    this.bookingsPaymentStatus,
    this.bookingsPackageId,
    this.bookingsCustomerId,
  })  : currentPackagesParams =
            currentPackagesParams ?? const _DefaultPaginationParams(),
        currentBookingsParams =
            currentBookingsParams ?? const _DefaultPaginationParams(),
        currentCustomersParams =
            currentCustomersParams ?? const _DefaultPaginationParams();

  bool get hasMorePackages => packagesPagination?.hasNext ?? false;
  bool get hasMoreBookings => bookingsPagination?.hasNext ?? false;
  bool get hasMoreCustomers => customersPagination?.hasNext ?? false;

  bool get isLoading =>
      packagesStatus == TourismStatus.loading ||
      bookingsStatus == TourismStatus.loading ||
      customersStatus == TourismStatus.loading ||
      dashboardStatus == TourismStatus.loading;

  TourismState copyWith({
    TourismStatus? packagesStatus,
    List<TourPackage>? packages,
    PaginationMeta? packagesPagination,
    String? packagesError,
    TourismStatus? bookingsStatus,
    List<TourBooking>? bookings,
    PaginationMeta? bookingsPagination,
    String? bookingsError,
    TourismStatus? customersStatus,
    List<TourCustomer>? customers,
    PaginationMeta? customersPagination,
    String? customersError,
    TourismStatus? itinerariesStatus,
    List<TourItinerary>? itineraries,
    String? itinerariesError,
    TourismStatus? dashboardStatus,
    Map<String, dynamic>? dashboardStats,
    String? dashboardError,
    TourPackage? selectedPackage,
    TourismStatus? selectedPackageStatus,
    String? selectedPackageError,
    PaginationParams? currentPackagesParams,
    PaginationParams? currentBookingsParams,
    PaginationParams? currentCustomersParams,
    String? packagesCategory,
    String? packagesDestination,
    bool? packagesIsActive,
    String? bookingsStatusFilter,
    String? bookingsPaymentStatus,
    String? bookingsPackageId,
    String? bookingsCustomerId,
  }) {
    return TourismState(
      packagesStatus: packagesStatus ?? this.packagesStatus,
      packages: packages ?? this.packages,
      packagesPagination: packagesPagination ?? this.packagesPagination,
      packagesError: packagesError,
      bookingsStatus: bookingsStatus ?? this.bookingsStatus,
      bookings: bookings ?? this.bookings,
      bookingsPagination: bookingsPagination ?? this.bookingsPagination,
      bookingsError: bookingsError,
      customersStatus: customersStatus ?? this.customersStatus,
      customers: customers ?? this.customers,
      customersPagination: customersPagination ?? this.customersPagination,
      customersError: customersError,
      itinerariesStatus: itinerariesStatus ?? this.itinerariesStatus,
      itineraries: itineraries ?? this.itineraries,
      itinerariesError: itinerariesError,
      dashboardStatus: dashboardStatus ?? this.dashboardStatus,
      dashboardStats: dashboardStats ?? this.dashboardStats,
      dashboardError: dashboardError,
      selectedPackage: selectedPackage ?? this.selectedPackage,
      selectedPackageStatus:
          selectedPackageStatus ?? this.selectedPackageStatus,
      selectedPackageError: selectedPackageError,
      currentPackagesParams:
          currentPackagesParams ?? this.currentPackagesParams,
      currentBookingsParams:
          currentBookingsParams ?? this.currentBookingsParams,
      currentCustomersParams:
          currentCustomersParams ?? this.currentCustomersParams,
      packagesCategory: packagesCategory ?? this.packagesCategory,
      packagesDestination: packagesDestination ?? this.packagesDestination,
      packagesIsActive: packagesIsActive ?? this.packagesIsActive,
      bookingsStatusFilter: bookingsStatusFilter ?? this.bookingsStatusFilter,
      bookingsPaymentStatus:
          bookingsPaymentStatus ?? this.bookingsPaymentStatus,
      bookingsPackageId: bookingsPackageId ?? this.bookingsPackageId,
      bookingsCustomerId: bookingsCustomerId ?? this.bookingsCustomerId,
    );
  }

  @override
  List<Object?> get props => [
        packagesStatus,
        packages,
        packagesPagination,
        packagesError,
        bookingsStatus,
        bookings,
        bookingsPagination,
        bookingsError,
        customersStatus,
        customers,
        customersPagination,
        customersError,
        itinerariesStatus,
        itineraries,
        itinerariesError,
        dashboardStatus,
        dashboardStats,
        dashboardError,
        selectedPackage,
        selectedPackageStatus,
        selectedPackageError,
        currentPackagesParams,
        currentBookingsParams,
        currentCustomersParams,
        packagesCategory,
        packagesDestination,
        packagesIsActive,
        bookingsStatusFilter,
        bookingsPaymentStatus,
        bookingsPackageId,
        bookingsCustomerId,
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
