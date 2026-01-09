import 'package:equatable/equatable.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/coworking_desk.dart';
import '../../domain/entities/coworking_booking.dart';
import '../../domain/entities/coworking_member.dart';
import '../../domain/entities/coworking_meeting_room.dart';

enum CoworkingStatus { initial, loading, loadingMore, success, failure }

class CoworkingState extends Equatable {
  final CoworkingStatus desksStatus;
  final List<CoworkingDesk> desks;
  final PaginationMeta? desksPagination;
  final String? desksError;

  final CoworkingStatus bookingsStatus;
  final List<CoworkingBooking> bookings;
  final PaginationMeta? bookingsPagination;
  final String? bookingsError;

  final CoworkingStatus membersStatus;
  final List<CoworkingMember> members;
  final PaginationMeta? membersPagination;
  final String? membersError;

  final CoworkingStatus meetingRoomsStatus;
  final List<CoworkingMeetingRoom> meetingRooms;
  final PaginationMeta? meetingRoomsPagination;
  final String? meetingRoomsError;

  final CoworkingStatus dashboardStatus;
  final Map<String, dynamic>? dashboardStats;
  final String? dashboardError;

  final CoworkingStatus operationStatus;
  final String? operationError;
  final String? operationSuccess;

  final PaginationParams currentDesksParams;
  final PaginationParams currentBookingsParams;
  final PaginationParams currentMembersParams;
  final PaginationParams currentMeetingRoomsParams;

  final String? desksType;
  final String? desksFloor;
  final bool? desksIsAvailable;

  final String? bookingsBookingType;
  final String? bookingsMemberId;
  final DateTime? bookingsStartDate;
  final DateTime? bookingsEndDate;

  final String? membersMembershipPlan;
  final bool? membersIsActive;

  final int? meetingRoomsMinCapacity;
  final bool? meetingRoomsIsAvailable;

  const CoworkingState({
    this.desksStatus = CoworkingStatus.initial,
    this.desks = const [],
    this.desksPagination,
    this.desksError,
    this.bookingsStatus = CoworkingStatus.initial,
    this.bookings = const [],
    this.bookingsPagination,
    this.bookingsError,
    this.membersStatus = CoworkingStatus.initial,
    this.members = const [],
    this.membersPagination,
    this.membersError,
    this.meetingRoomsStatus = CoworkingStatus.initial,
    this.meetingRooms = const [],
    this.meetingRoomsPagination,
    this.meetingRoomsError,
    this.dashboardStatus = CoworkingStatus.initial,
    this.dashboardStats,
    this.dashboardError,
    this.operationStatus = CoworkingStatus.initial,
    this.operationError,
    this.operationSuccess,
    PaginationParams? currentDesksParams,
    PaginationParams? currentBookingsParams,
    PaginationParams? currentMembersParams,
    PaginationParams? currentMeetingRoomsParams,
    this.desksType,
    this.desksFloor,
    this.desksIsAvailable,
    this.bookingsBookingType,
    this.bookingsMemberId,
    this.bookingsStartDate,
    this.bookingsEndDate,
    this.membersMembershipPlan,
    this.membersIsActive,
    this.meetingRoomsMinCapacity,
    this.meetingRoomsIsAvailable,
  })  : currentDesksParams = currentDesksParams ?? const _DefaultPaginationParams(),
        currentBookingsParams = currentBookingsParams ?? const _DefaultPaginationParams(),
        currentMembersParams = currentMembersParams ?? const _DefaultPaginationParams(),
        currentMeetingRoomsParams = currentMeetingRoomsParams ?? const _DefaultPaginationParams();

  bool get hasMoreDesks => desksPagination?.hasNext ?? false;
  bool get hasMoreBookings => bookingsPagination?.hasNext ?? false;
  bool get hasMoreMembers => membersPagination?.hasNext ?? false;
  bool get hasMoreMeetingRooms => meetingRoomsPagination?.hasNext ?? false;

  CoworkingState copyWith({
    CoworkingStatus? desksStatus,
    List<CoworkingDesk>? desks,
    PaginationMeta? desksPagination,
    String? desksError,
    CoworkingStatus? bookingsStatus,
    List<CoworkingBooking>? bookings,
    PaginationMeta? bookingsPagination,
    String? bookingsError,
    CoworkingStatus? membersStatus,
    List<CoworkingMember>? members,
    PaginationMeta? membersPagination,
    String? membersError,
    CoworkingStatus? meetingRoomsStatus,
    List<CoworkingMeetingRoom>? meetingRooms,
    PaginationMeta? meetingRoomsPagination,
    String? meetingRoomsError,
    CoworkingStatus? dashboardStatus,
    Map<String, dynamic>? dashboardStats,
    String? dashboardError,
    CoworkingStatus? operationStatus,
    String? operationError,
    String? operationSuccess,
    PaginationParams? currentDesksParams,
    PaginationParams? currentBookingsParams,
    PaginationParams? currentMembersParams,
    PaginationParams? currentMeetingRoomsParams,
    String? desksType,
    String? desksFloor,
    bool? desksIsAvailable,
    String? bookingsBookingType,
    String? bookingsMemberId,
    DateTime? bookingsStartDate,
    DateTime? bookingsEndDate,
    String? membersMembershipPlan,
    bool? membersIsActive,
    int? meetingRoomsMinCapacity,
    bool? meetingRoomsIsAvailable,
  }) {
    return CoworkingState(
      desksStatus: desksStatus ?? this.desksStatus,
      desks: desks ?? this.desks,
      desksPagination: desksPagination ?? this.desksPagination,
      desksError: desksError,
      bookingsStatus: bookingsStatus ?? this.bookingsStatus,
      bookings: bookings ?? this.bookings,
      bookingsPagination: bookingsPagination ?? this.bookingsPagination,
      bookingsError: bookingsError,
      membersStatus: membersStatus ?? this.membersStatus,
      members: members ?? this.members,
      membersPagination: membersPagination ?? this.membersPagination,
      membersError: membersError,
      meetingRoomsStatus: meetingRoomsStatus ?? this.meetingRoomsStatus,
      meetingRooms: meetingRooms ?? this.meetingRooms,
      meetingRoomsPagination: meetingRoomsPagination ?? this.meetingRoomsPagination,
      meetingRoomsError: meetingRoomsError,
      dashboardStatus: dashboardStatus ?? this.dashboardStatus,
      dashboardStats: dashboardStats ?? this.dashboardStats,
      dashboardError: dashboardError,
      operationStatus: operationStatus ?? this.operationStatus,
      operationError: operationError,
      operationSuccess: operationSuccess,
      currentDesksParams: currentDesksParams ?? this.currentDesksParams,
      currentBookingsParams: currentBookingsParams ?? this.currentBookingsParams,
      currentMembersParams: currentMembersParams ?? this.currentMembersParams,
      currentMeetingRoomsParams: currentMeetingRoomsParams ?? this.currentMeetingRoomsParams,
      desksType: desksType ?? this.desksType,
      desksFloor: desksFloor ?? this.desksFloor,
      desksIsAvailable: desksIsAvailable ?? this.desksIsAvailable,
      bookingsBookingType: bookingsBookingType ?? this.bookingsBookingType,
      bookingsMemberId: bookingsMemberId ?? this.bookingsMemberId,
      bookingsStartDate: bookingsStartDate ?? this.bookingsStartDate,
      bookingsEndDate: bookingsEndDate ?? this.bookingsEndDate,
      membersMembershipPlan: membersMembershipPlan ?? this.membersMembershipPlan,
      membersIsActive: membersIsActive ?? this.membersIsActive,
      meetingRoomsMinCapacity: meetingRoomsMinCapacity ?? this.meetingRoomsMinCapacity,
      meetingRoomsIsAvailable: meetingRoomsIsAvailable ?? this.meetingRoomsIsAvailable,
    );
  }

  @override
  List<Object?> get props => [
        desksStatus,
        desks,
        desksPagination,
        desksError,
        bookingsStatus,
        bookings,
        bookingsPagination,
        bookingsError,
        membersStatus,
        members,
        membersPagination,
        membersError,
        meetingRoomsStatus,
        meetingRooms,
        meetingRoomsPagination,
        meetingRoomsError,
        dashboardStatus,
        dashboardStats,
        dashboardError,
        operationStatus,
        operationError,
        operationSuccess,
        currentDesksParams,
        currentBookingsParams,
        currentMembersParams,
        currentMeetingRoomsParams,
        desksType,
        desksFloor,
        desksIsAvailable,
        bookingsBookingType,
        bookingsMemberId,
        bookingsStartDate,
        bookingsEndDate,
        membersMembershipPlan,
        membersIsActive,
        meetingRoomsMinCapacity,
        meetingRoomsIsAvailable,
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
