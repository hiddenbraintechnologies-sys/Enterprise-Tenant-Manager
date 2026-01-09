import 'package:equatable/equatable.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/gym_member.dart';
import '../../domain/entities/gym_subscription.dart';
import '../../domain/entities/gym_trainer.dart';
import '../../domain/entities/gym_attendance.dart';

enum GymStatus { initial, loading, loadingMore, success, failure }

class GymState extends Equatable {
  final GymStatus membersStatus;
  final List<GymMember> members;
  final PaginationMeta? membersPagination;
  final String? membersError;

  final GymStatus subscriptionsStatus;
  final List<GymSubscription> subscriptions;
  final PaginationMeta? subscriptionsPagination;
  final String? subscriptionsError;

  final GymStatus trainersStatus;
  final List<GymTrainer> trainers;
  final PaginationMeta? trainersPagination;
  final String? trainersError;

  final GymStatus attendanceStatus;
  final List<GymAttendance> attendance;
  final PaginationMeta? attendancePagination;
  final String? attendanceError;

  final GymStatus dashboardStatus;
  final Map<String, dynamic>? dashboardStats;
  final String? dashboardError;

  final GymStatus expiringMembershipsStatus;
  final List<GymMember> expiringMemberships;
  final String? expiringMembershipsError;

  final GymStatus todayAttendanceStatus;
  final List<GymAttendance> todayAttendance;
  final String? todayAttendanceError;

  final GymMember? selectedMember;
  final GymStatus memberDetailStatus;
  final String? memberDetailError;

  final PaginationParams currentMembersParams;
  final PaginationParams currentSubscriptionsParams;
  final PaginationParams currentTrainersParams;
  final PaginationParams currentAttendanceParams;

  final String? membersMembershipType;
  final String? membersStatusFilter;
  final bool? subscriptionsIsActive;
  final String? trainersSpecialization;
  final bool? trainersIsActive;
  final String? attendanceMemberId;
  final DateTime? attendanceDate;

  final bool isCreating;
  final bool isUpdating;
  final bool isDeleting;
  final String? operationError;

  const GymState({
    this.membersStatus = GymStatus.initial,
    this.members = const [],
    this.membersPagination,
    this.membersError,
    this.subscriptionsStatus = GymStatus.initial,
    this.subscriptions = const [],
    this.subscriptionsPagination,
    this.subscriptionsError,
    this.trainersStatus = GymStatus.initial,
    this.trainers = const [],
    this.trainersPagination,
    this.trainersError,
    this.attendanceStatus = GymStatus.initial,
    this.attendance = const [],
    this.attendancePagination,
    this.attendanceError,
    this.dashboardStatus = GymStatus.initial,
    this.dashboardStats,
    this.dashboardError,
    this.expiringMembershipsStatus = GymStatus.initial,
    this.expiringMemberships = const [],
    this.expiringMembershipsError,
    this.todayAttendanceStatus = GymStatus.initial,
    this.todayAttendance = const [],
    this.todayAttendanceError,
    this.selectedMember,
    this.memberDetailStatus = GymStatus.initial,
    this.memberDetailError,
    PaginationParams? currentMembersParams,
    PaginationParams? currentSubscriptionsParams,
    PaginationParams? currentTrainersParams,
    PaginationParams? currentAttendanceParams,
    this.membersMembershipType,
    this.membersStatusFilter,
    this.subscriptionsIsActive,
    this.trainersSpecialization,
    this.trainersIsActive,
    this.attendanceMemberId,
    this.attendanceDate,
    this.isCreating = false,
    this.isUpdating = false,
    this.isDeleting = false,
    this.operationError,
  })  : currentMembersParams = currentMembersParams ?? const _DefaultPaginationParams(),
        currentSubscriptionsParams = currentSubscriptionsParams ?? const _DefaultPaginationParams(),
        currentTrainersParams = currentTrainersParams ?? const _DefaultPaginationParams(),
        currentAttendanceParams = currentAttendanceParams ?? const _DefaultPaginationParams();

  bool get hasMoreMembers => membersPagination?.hasNext ?? false;
  bool get hasMoreSubscriptions => subscriptionsPagination?.hasNext ?? false;
  bool get hasMoreTrainers => trainersPagination?.hasNext ?? false;
  bool get hasMoreAttendance => attendancePagination?.hasNext ?? false;

  bool get isLoading =>
      membersStatus == GymStatus.loading ||
      subscriptionsStatus == GymStatus.loading ||
      trainersStatus == GymStatus.loading ||
      attendanceStatus == GymStatus.loading ||
      dashboardStatus == GymStatus.loading;

  GymState copyWith({
    GymStatus? membersStatus,
    List<GymMember>? members,
    PaginationMeta? membersPagination,
    String? membersError,
    GymStatus? subscriptionsStatus,
    List<GymSubscription>? subscriptions,
    PaginationMeta? subscriptionsPagination,
    String? subscriptionsError,
    GymStatus? trainersStatus,
    List<GymTrainer>? trainers,
    PaginationMeta? trainersPagination,
    String? trainersError,
    GymStatus? attendanceStatus,
    List<GymAttendance>? attendance,
    PaginationMeta? attendancePagination,
    String? attendanceError,
    GymStatus? dashboardStatus,
    Map<String, dynamic>? dashboardStats,
    String? dashboardError,
    GymStatus? expiringMembershipsStatus,
    List<GymMember>? expiringMemberships,
    String? expiringMembershipsError,
    GymStatus? todayAttendanceStatus,
    List<GymAttendance>? todayAttendance,
    String? todayAttendanceError,
    GymMember? selectedMember,
    GymStatus? memberDetailStatus,
    String? memberDetailError,
    PaginationParams? currentMembersParams,
    PaginationParams? currentSubscriptionsParams,
    PaginationParams? currentTrainersParams,
    PaginationParams? currentAttendanceParams,
    String? membersMembershipType,
    String? membersStatusFilter,
    bool? subscriptionsIsActive,
    String? trainersSpecialization,
    bool? trainersIsActive,
    String? attendanceMemberId,
    DateTime? attendanceDate,
    bool? isCreating,
    bool? isUpdating,
    bool? isDeleting,
    String? operationError,
  }) {
    return GymState(
      membersStatus: membersStatus ?? this.membersStatus,
      members: members ?? this.members,
      membersPagination: membersPagination ?? this.membersPagination,
      membersError: membersError,
      subscriptionsStatus: subscriptionsStatus ?? this.subscriptionsStatus,
      subscriptions: subscriptions ?? this.subscriptions,
      subscriptionsPagination: subscriptionsPagination ?? this.subscriptionsPagination,
      subscriptionsError: subscriptionsError,
      trainersStatus: trainersStatus ?? this.trainersStatus,
      trainers: trainers ?? this.trainers,
      trainersPagination: trainersPagination ?? this.trainersPagination,
      trainersError: trainersError,
      attendanceStatus: attendanceStatus ?? this.attendanceStatus,
      attendance: attendance ?? this.attendance,
      attendancePagination: attendancePagination ?? this.attendancePagination,
      attendanceError: attendanceError,
      dashboardStatus: dashboardStatus ?? this.dashboardStatus,
      dashboardStats: dashboardStats ?? this.dashboardStats,
      dashboardError: dashboardError,
      expiringMembershipsStatus: expiringMembershipsStatus ?? this.expiringMembershipsStatus,
      expiringMemberships: expiringMemberships ?? this.expiringMemberships,
      expiringMembershipsError: expiringMembershipsError,
      todayAttendanceStatus: todayAttendanceStatus ?? this.todayAttendanceStatus,
      todayAttendance: todayAttendance ?? this.todayAttendance,
      todayAttendanceError: todayAttendanceError,
      selectedMember: selectedMember ?? this.selectedMember,
      memberDetailStatus: memberDetailStatus ?? this.memberDetailStatus,
      memberDetailError: memberDetailError,
      currentMembersParams: currentMembersParams ?? this.currentMembersParams,
      currentSubscriptionsParams: currentSubscriptionsParams ?? this.currentSubscriptionsParams,
      currentTrainersParams: currentTrainersParams ?? this.currentTrainersParams,
      currentAttendanceParams: currentAttendanceParams ?? this.currentAttendanceParams,
      membersMembershipType: membersMembershipType ?? this.membersMembershipType,
      membersStatusFilter: membersStatusFilter ?? this.membersStatusFilter,
      subscriptionsIsActive: subscriptionsIsActive ?? this.subscriptionsIsActive,
      trainersSpecialization: trainersSpecialization ?? this.trainersSpecialization,
      trainersIsActive: trainersIsActive ?? this.trainersIsActive,
      attendanceMemberId: attendanceMemberId ?? this.attendanceMemberId,
      attendanceDate: attendanceDate ?? this.attendanceDate,
      isCreating: isCreating ?? this.isCreating,
      isUpdating: isUpdating ?? this.isUpdating,
      isDeleting: isDeleting ?? this.isDeleting,
      operationError: operationError,
    );
  }

  @override
  List<Object?> get props => [
        membersStatus,
        members,
        membersPagination,
        membersError,
        subscriptionsStatus,
        subscriptions,
        subscriptionsPagination,
        subscriptionsError,
        trainersStatus,
        trainers,
        trainersPagination,
        trainersError,
        attendanceStatus,
        attendance,
        attendancePagination,
        attendanceError,
        dashboardStatus,
        dashboardStats,
        dashboardError,
        expiringMembershipsStatus,
        expiringMemberships,
        expiringMembershipsError,
        todayAttendanceStatus,
        todayAttendance,
        todayAttendanceError,
        selectedMember,
        memberDetailStatus,
        memberDetailError,
        currentMembersParams,
        currentSubscriptionsParams,
        currentTrainersParams,
        currentAttendanceParams,
        membersMembershipType,
        membersStatusFilter,
        subscriptionsIsActive,
        trainersSpecialization,
        trainersIsActive,
        attendanceMemberId,
        attendanceDate,
        isCreating,
        isUpdating,
        isDeleting,
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
