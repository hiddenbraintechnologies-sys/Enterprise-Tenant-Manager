import 'package:equatable/equatable.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/pg_room.dart';
import '../../domain/entities/pg_resident.dart';
import '../../domain/entities/pg_payment.dart';
import '../../domain/entities/pg_maintenance.dart';

enum PgStatus { initial, loading, loadingMore, success, failure }

class PgState extends Equatable {
  final PgStatus roomsStatus;
  final List<PgRoom> rooms;
  final PaginationMeta? roomsPagination;
  final String? roomsError;

  final PgStatus residentsStatus;
  final List<PgResident> residents;
  final PaginationMeta? residentsPagination;
  final String? residentsError;

  final PgStatus paymentsStatus;
  final List<PgPayment> payments;
  final PaginationMeta? paymentsPagination;
  final String? paymentsError;

  final PgStatus maintenanceStatus;
  final List<PgMaintenance> maintenanceRequests;
  final PaginationMeta? maintenancePagination;
  final String? maintenanceError;

  final PgStatus dashboardStatus;
  final Map<String, dynamic>? dashboardStats;
  final String? dashboardError;

  final List<PgRoom> availableRooms;
  final List<PgPayment> overduePayments;

  final PaginationParams currentRoomsParams;
  final PaginationParams currentResidentsParams;
  final PaginationParams currentPaymentsParams;
  final PaginationParams currentMaintenanceParams;

  final String? roomsType;
  final bool? roomsIsOccupied;
  final int? roomsFloor;

  final String? residentsStatusFilter;
  final String? residentsRoomId;

  final String? paymentsStatusFilter;
  final String? paymentsType;
  final String? paymentsResidentId;
  final int? paymentsMonth;
  final int? paymentsYear;

  final String? maintenanceStatusFilter;
  final String? maintenancePriority;
  final String? maintenanceRoomId;

  final bool isCreating;
  final bool isUpdating;
  final String? operationError;

  const PgState({
    this.roomsStatus = PgStatus.initial,
    this.rooms = const [],
    this.roomsPagination,
    this.roomsError,
    this.residentsStatus = PgStatus.initial,
    this.residents = const [],
    this.residentsPagination,
    this.residentsError,
    this.paymentsStatus = PgStatus.initial,
    this.payments = const [],
    this.paymentsPagination,
    this.paymentsError,
    this.maintenanceStatus = PgStatus.initial,
    this.maintenanceRequests = const [],
    this.maintenancePagination,
    this.maintenanceError,
    this.dashboardStatus = PgStatus.initial,
    this.dashboardStats,
    this.dashboardError,
    this.availableRooms = const [],
    this.overduePayments = const [],
    PaginationParams? currentRoomsParams,
    PaginationParams? currentResidentsParams,
    PaginationParams? currentPaymentsParams,
    PaginationParams? currentMaintenanceParams,
    this.roomsType,
    this.roomsIsOccupied,
    this.roomsFloor,
    this.residentsStatusFilter,
    this.residentsRoomId,
    this.paymentsStatusFilter,
    this.paymentsType,
    this.paymentsResidentId,
    this.paymentsMonth,
    this.paymentsYear,
    this.maintenanceStatusFilter,
    this.maintenancePriority,
    this.maintenanceRoomId,
    this.isCreating = false,
    this.isUpdating = false,
    this.operationError,
  })  : currentRoomsParams = currentRoomsParams ?? const _DefaultPaginationParams(),
        currentResidentsParams = currentResidentsParams ?? const _DefaultPaginationParams(),
        currentPaymentsParams = currentPaymentsParams ?? const _DefaultPaginationParams(),
        currentMaintenanceParams = currentMaintenanceParams ?? const _DefaultPaginationParams();

  bool get hasMoreRooms => roomsPagination?.hasNext ?? false;
  bool get hasMoreResidents => residentsPagination?.hasNext ?? false;
  bool get hasMorePayments => paymentsPagination?.hasNext ?? false;
  bool get hasMoreMaintenance => maintenancePagination?.hasNext ?? false;

  PgState copyWith({
    PgStatus? roomsStatus,
    List<PgRoom>? rooms,
    PaginationMeta? roomsPagination,
    String? roomsError,
    PgStatus? residentsStatus,
    List<PgResident>? residents,
    PaginationMeta? residentsPagination,
    String? residentsError,
    PgStatus? paymentsStatus,
    List<PgPayment>? payments,
    PaginationMeta? paymentsPagination,
    String? paymentsError,
    PgStatus? maintenanceStatus,
    List<PgMaintenance>? maintenanceRequests,
    PaginationMeta? maintenancePagination,
    String? maintenanceError,
    PgStatus? dashboardStatus,
    Map<String, dynamic>? dashboardStats,
    String? dashboardError,
    List<PgRoom>? availableRooms,
    List<PgPayment>? overduePayments,
    PaginationParams? currentRoomsParams,
    PaginationParams? currentResidentsParams,
    PaginationParams? currentPaymentsParams,
    PaginationParams? currentMaintenanceParams,
    String? roomsType,
    bool? roomsIsOccupied,
    int? roomsFloor,
    String? residentsStatusFilter,
    String? residentsRoomId,
    String? paymentsStatusFilter,
    String? paymentsType,
    String? paymentsResidentId,
    int? paymentsMonth,
    int? paymentsYear,
    String? maintenanceStatusFilter,
    String? maintenancePriority,
    String? maintenanceRoomId,
    bool? isCreating,
    bool? isUpdating,
    String? operationError,
  }) {
    return PgState(
      roomsStatus: roomsStatus ?? this.roomsStatus,
      rooms: rooms ?? this.rooms,
      roomsPagination: roomsPagination ?? this.roomsPagination,
      roomsError: roomsError,
      residentsStatus: residentsStatus ?? this.residentsStatus,
      residents: residents ?? this.residents,
      residentsPagination: residentsPagination ?? this.residentsPagination,
      residentsError: residentsError,
      paymentsStatus: paymentsStatus ?? this.paymentsStatus,
      payments: payments ?? this.payments,
      paymentsPagination: paymentsPagination ?? this.paymentsPagination,
      paymentsError: paymentsError,
      maintenanceStatus: maintenanceStatus ?? this.maintenanceStatus,
      maintenanceRequests: maintenanceRequests ?? this.maintenanceRequests,
      maintenancePagination: maintenancePagination ?? this.maintenancePagination,
      maintenanceError: maintenanceError,
      dashboardStatus: dashboardStatus ?? this.dashboardStatus,
      dashboardStats: dashboardStats ?? this.dashboardStats,
      dashboardError: dashboardError,
      availableRooms: availableRooms ?? this.availableRooms,
      overduePayments: overduePayments ?? this.overduePayments,
      currentRoomsParams: currentRoomsParams ?? this.currentRoomsParams,
      currentResidentsParams: currentResidentsParams ?? this.currentResidentsParams,
      currentPaymentsParams: currentPaymentsParams ?? this.currentPaymentsParams,
      currentMaintenanceParams: currentMaintenanceParams ?? this.currentMaintenanceParams,
      roomsType: roomsType ?? this.roomsType,
      roomsIsOccupied: roomsIsOccupied ?? this.roomsIsOccupied,
      roomsFloor: roomsFloor ?? this.roomsFloor,
      residentsStatusFilter: residentsStatusFilter ?? this.residentsStatusFilter,
      residentsRoomId: residentsRoomId ?? this.residentsRoomId,
      paymentsStatusFilter: paymentsStatusFilter ?? this.paymentsStatusFilter,
      paymentsType: paymentsType ?? this.paymentsType,
      paymentsResidentId: paymentsResidentId ?? this.paymentsResidentId,
      paymentsMonth: paymentsMonth ?? this.paymentsMonth,
      paymentsYear: paymentsYear ?? this.paymentsYear,
      maintenanceStatusFilter: maintenanceStatusFilter ?? this.maintenanceStatusFilter,
      maintenancePriority: maintenancePriority ?? this.maintenancePriority,
      maintenanceRoomId: maintenanceRoomId ?? this.maintenanceRoomId,
      isCreating: isCreating ?? this.isCreating,
      isUpdating: isUpdating ?? this.isUpdating,
      operationError: operationError,
    );
  }

  @override
  List<Object?> get props => [
        roomsStatus,
        rooms,
        roomsPagination,
        roomsError,
        residentsStatus,
        residents,
        residentsPagination,
        residentsError,
        paymentsStatus,
        payments,
        paymentsPagination,
        paymentsError,
        maintenanceStatus,
        maintenanceRequests,
        maintenancePagination,
        maintenanceError,
        dashboardStatus,
        dashboardStats,
        dashboardError,
        availableRooms,
        overduePayments,
        currentRoomsParams,
        currentResidentsParams,
        currentPaymentsParams,
        currentMaintenanceParams,
        roomsType,
        roomsIsOccupied,
        roomsFloor,
        residentsStatusFilter,
        residentsRoomId,
        paymentsStatusFilter,
        paymentsType,
        paymentsResidentId,
        paymentsMonth,
        paymentsYear,
        maintenanceStatusFilter,
        maintenancePriority,
        maintenanceRoomId,
        isCreating,
        isUpdating,
        operationError,
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
