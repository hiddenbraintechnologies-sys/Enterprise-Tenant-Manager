import 'package:equatable/equatable.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/salon_service.dart';
import '../../domain/entities/salon_appointment.dart';
import '../../domain/entities/salon_staff.dart';
import '../../domain/entities/salon_customer.dart';

enum SalonStatus { initial, loading, loadingMore, success, failure }

class SalonState extends Equatable {
  final SalonStatus servicesStatus;
  final List<SalonService> services;
  final PaginationMeta? servicesPagination;
  final String? servicesError;

  final SalonStatus appointmentsStatus;
  final List<SalonAppointment> appointments;
  final PaginationMeta? appointmentsPagination;
  final String? appointmentsError;

  final SalonStatus staffStatus;
  final List<SalonStaff> staff;
  final PaginationMeta? staffPagination;
  final String? staffError;

  final SalonStatus customersStatus;
  final List<SalonCustomer> customers;
  final PaginationMeta? customersPagination;
  final String? customersError;

  final SalonStatus dashboardStatus;
  final Map<String, dynamic>? dashboardStats;
  final String? dashboardError;

  final SalonStatus todayAppointmentsStatus;
  final List<SalonAppointment> todayAppointments;
  final String? todayAppointmentsError;

  final SalonStatus operationStatus;
  final String? operationError;
  final String? operationSuccess;

  final PaginationParams currentServicesParams;
  final PaginationParams currentAppointmentsParams;
  final PaginationParams currentStaffParams;
  final PaginationParams currentCustomersParams;

  final String? servicesCategory;
  final bool? servicesIsActive;

  final String? appointmentsStatusFilter;
  final String? appointmentsStaffId;
  final String? appointmentsCustomerId;
  final DateTime? appointmentsStartDate;
  final DateTime? appointmentsEndDate;

  final bool? staffIsActive;
  final String? staffSpecialization;

  final int? customersMinLoyaltyPoints;

  const SalonState({
    this.servicesStatus = SalonStatus.initial,
    this.services = const [],
    this.servicesPagination,
    this.servicesError,
    this.appointmentsStatus = SalonStatus.initial,
    this.appointments = const [],
    this.appointmentsPagination,
    this.appointmentsError,
    this.staffStatus = SalonStatus.initial,
    this.staff = const [],
    this.staffPagination,
    this.staffError,
    this.customersStatus = SalonStatus.initial,
    this.customers = const [],
    this.customersPagination,
    this.customersError,
    this.dashboardStatus = SalonStatus.initial,
    this.dashboardStats,
    this.dashboardError,
    this.todayAppointmentsStatus = SalonStatus.initial,
    this.todayAppointments = const [],
    this.todayAppointmentsError,
    this.operationStatus = SalonStatus.initial,
    this.operationError,
    this.operationSuccess,
    PaginationParams? currentServicesParams,
    PaginationParams? currentAppointmentsParams,
    PaginationParams? currentStaffParams,
    PaginationParams? currentCustomersParams,
    this.servicesCategory,
    this.servicesIsActive,
    this.appointmentsStatusFilter,
    this.appointmentsStaffId,
    this.appointmentsCustomerId,
    this.appointmentsStartDate,
    this.appointmentsEndDate,
    this.staffIsActive,
    this.staffSpecialization,
    this.customersMinLoyaltyPoints,
  })  : currentServicesParams = currentServicesParams ?? const _DefaultPaginationParams(),
        currentAppointmentsParams = currentAppointmentsParams ?? const _DefaultPaginationParams(),
        currentStaffParams = currentStaffParams ?? const _DefaultPaginationParams(),
        currentCustomersParams = currentCustomersParams ?? const _DefaultPaginationParams();

  bool get hasMoreServices => servicesPagination?.hasNext ?? false;
  bool get hasMoreAppointments => appointmentsPagination?.hasNext ?? false;
  bool get hasMoreStaff => staffPagination?.hasNext ?? false;
  bool get hasMoreCustomers => customersPagination?.hasNext ?? false;

  bool get isLoading =>
      servicesStatus == SalonStatus.loading ||
      appointmentsStatus == SalonStatus.loading ||
      staffStatus == SalonStatus.loading ||
      customersStatus == SalonStatus.loading ||
      dashboardStatus == SalonStatus.loading;

  String? get error =>
      servicesError ?? appointmentsError ?? staffError ?? customersError ?? dashboardError;

  SalonState copyWith({
    SalonStatus? servicesStatus,
    List<SalonService>? services,
    PaginationMeta? servicesPagination,
    String? servicesError,
    SalonStatus? appointmentsStatus,
    List<SalonAppointment>? appointments,
    PaginationMeta? appointmentsPagination,
    String? appointmentsError,
    SalonStatus? staffStatus,
    List<SalonStaff>? staff,
    PaginationMeta? staffPagination,
    String? staffError,
    SalonStatus? customersStatus,
    List<SalonCustomer>? customers,
    PaginationMeta? customersPagination,
    String? customersError,
    SalonStatus? dashboardStatus,
    Map<String, dynamic>? dashboardStats,
    String? dashboardError,
    SalonStatus? todayAppointmentsStatus,
    List<SalonAppointment>? todayAppointments,
    String? todayAppointmentsError,
    SalonStatus? operationStatus,
    String? operationError,
    String? operationSuccess,
    PaginationParams? currentServicesParams,
    PaginationParams? currentAppointmentsParams,
    PaginationParams? currentStaffParams,
    PaginationParams? currentCustomersParams,
    String? servicesCategory,
    bool? servicesIsActive,
    String? appointmentsStatusFilter,
    String? appointmentsStaffId,
    String? appointmentsCustomerId,
    DateTime? appointmentsStartDate,
    DateTime? appointmentsEndDate,
    bool? staffIsActive,
    String? staffSpecialization,
    int? customersMinLoyaltyPoints,
  }) {
    return SalonState(
      servicesStatus: servicesStatus ?? this.servicesStatus,
      services: services ?? this.services,
      servicesPagination: servicesPagination ?? this.servicesPagination,
      servicesError: servicesError,
      appointmentsStatus: appointmentsStatus ?? this.appointmentsStatus,
      appointments: appointments ?? this.appointments,
      appointmentsPagination: appointmentsPagination ?? this.appointmentsPagination,
      appointmentsError: appointmentsError,
      staffStatus: staffStatus ?? this.staffStatus,
      staff: staff ?? this.staff,
      staffPagination: staffPagination ?? this.staffPagination,
      staffError: staffError,
      customersStatus: customersStatus ?? this.customersStatus,
      customers: customers ?? this.customers,
      customersPagination: customersPagination ?? this.customersPagination,
      customersError: customersError,
      dashboardStatus: dashboardStatus ?? this.dashboardStatus,
      dashboardStats: dashboardStats ?? this.dashboardStats,
      dashboardError: dashboardError,
      todayAppointmentsStatus: todayAppointmentsStatus ?? this.todayAppointmentsStatus,
      todayAppointments: todayAppointments ?? this.todayAppointments,
      todayAppointmentsError: todayAppointmentsError,
      operationStatus: operationStatus ?? this.operationStatus,
      operationError: operationError,
      operationSuccess: operationSuccess,
      currentServicesParams: currentServicesParams ?? this.currentServicesParams,
      currentAppointmentsParams: currentAppointmentsParams ?? this.currentAppointmentsParams,
      currentStaffParams: currentStaffParams ?? this.currentStaffParams,
      currentCustomersParams: currentCustomersParams ?? this.currentCustomersParams,
      servicesCategory: servicesCategory ?? this.servicesCategory,
      servicesIsActive: servicesIsActive ?? this.servicesIsActive,
      appointmentsStatusFilter: appointmentsStatusFilter ?? this.appointmentsStatusFilter,
      appointmentsStaffId: appointmentsStaffId ?? this.appointmentsStaffId,
      appointmentsCustomerId: appointmentsCustomerId ?? this.appointmentsCustomerId,
      appointmentsStartDate: appointmentsStartDate ?? this.appointmentsStartDate,
      appointmentsEndDate: appointmentsEndDate ?? this.appointmentsEndDate,
      staffIsActive: staffIsActive ?? this.staffIsActive,
      staffSpecialization: staffSpecialization ?? this.staffSpecialization,
      customersMinLoyaltyPoints: customersMinLoyaltyPoints ?? this.customersMinLoyaltyPoints,
    );
  }

  @override
  List<Object?> get props => [
        servicesStatus,
        services,
        servicesPagination,
        servicesError,
        appointmentsStatus,
        appointments,
        appointmentsPagination,
        appointmentsError,
        staffStatus,
        staff,
        staffPagination,
        staffError,
        customersStatus,
        customers,
        customersPagination,
        customersError,
        dashboardStatus,
        dashboardStats,
        dashboardError,
        todayAppointmentsStatus,
        todayAppointments,
        todayAppointmentsError,
        operationStatus,
        operationError,
        operationSuccess,
        currentServicesParams,
        currentAppointmentsParams,
        currentStaffParams,
        currentCustomersParams,
        servicesCategory,
        servicesIsActive,
        appointmentsStatusFilter,
        appointmentsStaffId,
        appointmentsCustomerId,
        appointmentsStartDate,
        appointmentsEndDate,
        staffIsActive,
        staffSpecialization,
        customersMinLoyaltyPoints,
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
