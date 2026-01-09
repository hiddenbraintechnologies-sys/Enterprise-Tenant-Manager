import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/repositories/coworking_repository.dart';
import 'coworking_event.dart';
import 'coworking_state.dart';

class CoworkingBloc extends Bloc<CoworkingEvent, CoworkingState> {
  final CoworkingRepository _repository;

  CoworkingBloc(this._repository) : super(const CoworkingState()) {
    on<LoadDesks>(_onLoadDesks);
    on<LoadMoreDesks>(_onLoadMoreDesks);
    on<CreateDesk>(_onCreateDesk);
    on<UpdateDesk>(_onUpdateDesk);
    on<DeleteDesk>(_onDeleteDesk);
    on<LoadBookings>(_onLoadBookings);
    on<LoadMoreBookings>(_onLoadMoreBookings);
    on<CreateBooking>(_onCreateBooking);
    on<UpdateBooking>(_onUpdateBooking);
    on<CancelBooking>(_onCancelBooking);
    on<LoadMembers>(_onLoadMembers);
    on<LoadMoreMembers>(_onLoadMoreMembers);
    on<CreateMember>(_onCreateMember);
    on<UpdateMember>(_onUpdateMember);
    on<DeleteMember>(_onDeleteMember);
    on<LoadMeetingRooms>(_onLoadMeetingRooms);
    on<LoadMoreMeetingRooms>(_onLoadMoreMeetingRooms);
    on<BookMeetingRoom>(_onBookMeetingRoom);
    on<LoadDashboardStats>(_onLoadDashboardStats);
    on<ClearFilters>(_onClearFilters);
    on<RefreshData>(_onRefreshData);
  }

  Future<void> _onLoadDesks(
    LoadDesks event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(desksStatus: CoworkingStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getDesks(
        params,
        type: event.type,
        floor: event.floor,
        isAvailable: event.isAvailable,
      );

      emit(state.copyWith(
        desksStatus: CoworkingStatus.success,
        desks: response.data,
        desksPagination: response.pagination,
        currentDesksParams: params,
        desksType: event.type,
        desksFloor: event.floor,
        desksIsAvailable: event.isAvailable,
        desksError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        desksStatus: CoworkingStatus.failure,
        desksError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreDesks(
    LoadMoreDesks event,
    Emitter<CoworkingState> emit,
  ) async {
    if (!state.hasMoreDesks || state.desksStatus == CoworkingStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(desksStatus: CoworkingStatus.loadingMore));

    try {
      final nextPage = (state.desksPagination?.page ?? 0) + 1;
      final params = state.currentDesksParams.copyWith(page: nextPage);

      final response = await _repository.getDesks(
        params,
        type: state.desksType,
        floor: state.desksFloor,
        isAvailable: state.desksIsAvailable,
      );

      emit(state.copyWith(
        desksStatus: CoworkingStatus.success,
        desks: [...state.desks, ...response.data],
        desksPagination: response.pagination,
        currentDesksParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        desksStatus: CoworkingStatus.failure,
        desksError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateDesk(
    CreateDesk event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.createDesk(event.data);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Desk created successfully',
      ));
      add(const LoadDesks());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateDesk(
    UpdateDesk event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.updateDesk(event.id, event.data);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Desk updated successfully',
      ));
      add(const LoadDesks());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onDeleteDesk(
    DeleteDesk event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.deleteDesk(event.id);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Desk deleted successfully',
      ));
      add(const LoadDesks());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadBookings(
    LoadBookings event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(bookingsStatus: CoworkingStatus.loading));

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
        bookingType: event.bookingType,
        memberId: event.memberId,
        startDate: event.startDate,
        endDate: event.endDate,
      );

      emit(state.copyWith(
        bookingsStatus: CoworkingStatus.success,
        bookings: response.data,
        bookingsPagination: response.pagination,
        currentBookingsParams: params,
        bookingsBookingType: event.bookingType,
        bookingsMemberId: event.memberId,
        bookingsStartDate: event.startDate,
        bookingsEndDate: event.endDate,
        bookingsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        bookingsStatus: CoworkingStatus.failure,
        bookingsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreBookings(
    LoadMoreBookings event,
    Emitter<CoworkingState> emit,
  ) async {
    if (!state.hasMoreBookings || state.bookingsStatus == CoworkingStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(bookingsStatus: CoworkingStatus.loadingMore));

    try {
      final nextPage = (state.bookingsPagination?.page ?? 0) + 1;
      final params = state.currentBookingsParams.copyWith(page: nextPage);

      final response = await _repository.getBookings(
        params,
        bookingType: state.bookingsBookingType,
        memberId: state.bookingsMemberId,
        startDate: state.bookingsStartDate,
        endDate: state.bookingsEndDate,
      );

      emit(state.copyWith(
        bookingsStatus: CoworkingStatus.success,
        bookings: [...state.bookings, ...response.data],
        bookingsPagination: response.pagination,
        currentBookingsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        bookingsStatus: CoworkingStatus.failure,
        bookingsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateBooking(
    CreateBooking event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.createBooking(event.data);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Booking created successfully',
      ));
      add(const LoadBookings());
      add(const LoadDashboardStats());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateBooking(
    UpdateBooking event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.updateBooking(event.id, event.data);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Booking updated successfully',
      ));
      add(const LoadBookings());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onCancelBooking(
    CancelBooking event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.cancelBooking(event.id);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Booking cancelled successfully',
      ));
      add(const LoadBookings());
      add(const LoadDashboardStats());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMembers(
    LoadMembers event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(membersStatus: CoworkingStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getMembers(
        params,
        membershipPlan: event.membershipPlan,
        isActive: event.isActive,
      );

      emit(state.copyWith(
        membersStatus: CoworkingStatus.success,
        members: response.data,
        membersPagination: response.pagination,
        currentMembersParams: params,
        membersMembershipPlan: event.membershipPlan,
        membersIsActive: event.isActive,
        membersError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        membersStatus: CoworkingStatus.failure,
        membersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreMembers(
    LoadMoreMembers event,
    Emitter<CoworkingState> emit,
  ) async {
    if (!state.hasMoreMembers || state.membersStatus == CoworkingStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(membersStatus: CoworkingStatus.loadingMore));

    try {
      final nextPage = (state.membersPagination?.page ?? 0) + 1;
      final params = state.currentMembersParams.copyWith(page: nextPage);

      final response = await _repository.getMembers(
        params,
        membershipPlan: state.membersMembershipPlan,
        isActive: state.membersIsActive,
      );

      emit(state.copyWith(
        membersStatus: CoworkingStatus.success,
        members: [...state.members, ...response.data],
        membersPagination: response.pagination,
        currentMembersParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        membersStatus: CoworkingStatus.failure,
        membersError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateMember(
    CreateMember event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.createMember(event.data);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Member created successfully',
      ));
      add(const LoadMembers());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateMember(
    UpdateMember event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.updateMember(event.id, event.data);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Member updated successfully',
      ));
      add(const LoadMembers());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onDeleteMember(
    DeleteMember event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.deleteMember(event.id);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Member deleted successfully',
      ));
      add(const LoadMembers());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMeetingRooms(
    LoadMeetingRooms event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(meetingRoomsStatus: CoworkingStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getMeetingRooms(
        params,
        minCapacity: event.minCapacity,
        isAvailable: event.isAvailable,
      );

      emit(state.copyWith(
        meetingRoomsStatus: CoworkingStatus.success,
        meetingRooms: response.data,
        meetingRoomsPagination: response.pagination,
        currentMeetingRoomsParams: params,
        meetingRoomsMinCapacity: event.minCapacity,
        meetingRoomsIsAvailable: event.isAvailable,
        meetingRoomsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        meetingRoomsStatus: CoworkingStatus.failure,
        meetingRoomsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreMeetingRooms(
    LoadMoreMeetingRooms event,
    Emitter<CoworkingState> emit,
  ) async {
    if (!state.hasMoreMeetingRooms || state.meetingRoomsStatus == CoworkingStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(meetingRoomsStatus: CoworkingStatus.loadingMore));

    try {
      final nextPage = (state.meetingRoomsPagination?.page ?? 0) + 1;
      final params = state.currentMeetingRoomsParams.copyWith(page: nextPage);

      final response = await _repository.getMeetingRooms(
        params,
        minCapacity: state.meetingRoomsMinCapacity,
        isAvailable: state.meetingRoomsIsAvailable,
      );

      emit(state.copyWith(
        meetingRoomsStatus: CoworkingStatus.success,
        meetingRooms: [...state.meetingRooms, ...response.data],
        meetingRoomsPagination: response.pagination,
        currentMeetingRoomsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        meetingRoomsStatus: CoworkingStatus.failure,
        meetingRoomsError: e.toString(),
      ));
    }
  }

  Future<void> _onBookMeetingRoom(
    BookMeetingRoom event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(operationStatus: CoworkingStatus.loading));

    try {
      await _repository.bookMeetingRoom(event.data);
      emit(state.copyWith(
        operationStatus: CoworkingStatus.success,
        operationSuccess: 'Meeting room booked successfully',
      ));
      add(const LoadMeetingRooms());
      add(const LoadBookings());
      add(const LoadDashboardStats());
    } catch (e) {
      emit(state.copyWith(
        operationStatus: CoworkingStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadDashboardStats(
    LoadDashboardStats event,
    Emitter<CoworkingState> emit,
  ) async {
    emit(state.copyWith(dashboardStatus: CoworkingStatus.loading));

    try {
      final stats = await _repository.getDashboardStats();

      emit(state.copyWith(
        dashboardStatus: CoworkingStatus.success,
        dashboardStats: stats,
        dashboardError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        dashboardStatus: CoworkingStatus.failure,
        dashboardError: e.toString(),
      ));
    }
  }

  void _onClearFilters(
    ClearFilters event,
    Emitter<CoworkingState> emit,
  ) {
    emit(CoworkingState(
      desksStatus: state.desksStatus,
      desks: state.desks,
      desksPagination: state.desksPagination,
      bookingsStatus: state.bookingsStatus,
      bookings: state.bookings,
      bookingsPagination: state.bookingsPagination,
      membersStatus: state.membersStatus,
      members: state.members,
      membersPagination: state.membersPagination,
      meetingRoomsStatus: state.meetingRoomsStatus,
      meetingRooms: state.meetingRooms,
      meetingRoomsPagination: state.meetingRoomsPagination,
      dashboardStatus: state.dashboardStatus,
      dashboardStats: state.dashboardStats,
      currentDesksParams: PaginationParams(),
      currentBookingsParams: PaginationParams(),
      currentMembersParams: PaginationParams(),
      currentMeetingRoomsParams: PaginationParams(),
    ));
  }

  Future<void> _onRefreshData(
    RefreshData event,
    Emitter<CoworkingState> emit,
  ) async {
    add(const LoadDesks());
    add(const LoadBookings());
    add(const LoadMembers());
    add(const LoadMeetingRooms());
    add(const LoadDashboardStats());
  }
}
