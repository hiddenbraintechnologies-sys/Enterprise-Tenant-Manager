import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/repositories/gym_repository.dart';
import 'gym_event.dart';
import 'gym_state.dart';

class GymBloc extends Bloc<GymEvent, GymState> {
  final GymRepository _repository;

  GymBloc(this._repository) : super(const GymState()) {
    on<LoadMembers>(_onLoadMembers);
    on<LoadMoreMembers>(_onLoadMoreMembers);
    on<LoadMemberDetail>(_onLoadMemberDetail);
    on<CreateMember>(_onCreateMember);
    on<UpdateMember>(_onUpdateMember);
    on<RenewMembership>(_onRenewMembership);
    on<DeleteMember>(_onDeleteMember);
    on<LoadSubscriptions>(_onLoadSubscriptions);
    on<LoadMoreSubscriptions>(_onLoadMoreSubscriptions);
    on<CreateSubscription>(_onCreateSubscription);
    on<UpdateSubscription>(_onUpdateSubscription);
    on<DeleteSubscription>(_onDeleteSubscription);
    on<LoadTrainers>(_onLoadTrainers);
    on<LoadMoreTrainers>(_onLoadMoreTrainers);
    on<CreateTrainer>(_onCreateTrainer);
    on<UpdateTrainer>(_onUpdateTrainer);
    on<DeleteTrainer>(_onDeleteTrainer);
    on<LoadAttendance>(_onLoadAttendance);
    on<LoadMoreAttendance>(_onLoadMoreAttendance);
    on<CheckInMember>(_onCheckInMember);
    on<CheckOutMember>(_onCheckOutMember);
    on<LoadDashboardStats>(_onLoadDashboardStats);
    on<LoadExpiringMemberships>(_onLoadExpiringMemberships);
    on<LoadTodayAttendance>(_onLoadTodayAttendance);
    on<ClearFilters>(_onClearFilters);
    on<RefreshData>(_onRefreshData);
  }

  Future<void> _onLoadMembers(
    LoadMembers event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(membersStatus: GymStatus.loading));

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
        membershipType: event.membershipType,
        status: event.status,
      );

      emit(state.copyWith(
        membersStatus: GymStatus.success,
        members: response.data,
        membersPagination: response.pagination,
        currentMembersParams: params,
        membersMembershipType: event.membershipType,
        membersStatusFilter: event.status,
        membersError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        membersStatus: GymStatus.failure,
        membersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreMembers(
    LoadMoreMembers event,
    Emitter<GymState> emit,
  ) async {
    if (!state.hasMoreMembers || state.membersStatus == GymStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(membersStatus: GymStatus.loadingMore));

    try {
      final nextPage = (state.membersPagination?.page ?? 0) + 1;
      final params = state.currentMembersParams.copyWith(page: nextPage);

      final response = await _repository.getMembers(
        params,
        membershipType: state.membersMembershipType,
        status: state.membersStatusFilter,
      );

      emit(state.copyWith(
        membersStatus: GymStatus.success,
        members: [...state.members, ...response.data],
        membersPagination: response.pagination,
        currentMembersParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        membersStatus: GymStatus.failure,
        membersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMemberDetail(
    LoadMemberDetail event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(memberDetailStatus: GymStatus.loading));

    try {
      final member = await _repository.getMember(event.memberId);
      emit(state.copyWith(
        memberDetailStatus: GymStatus.success,
        selectedMember: member,
        memberDetailError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        memberDetailStatus: GymStatus.failure,
        memberDetailError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateMember(
    CreateMember event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      final member = await _repository.createMember(event.data);
      emit(state.copyWith(
        isCreating: false,
        members: [member, ...state.members],
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateMember(
    UpdateMember event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      final member = await _repository.updateMember(event.id, event.data);
      final updatedMembers = state.members.map((m) {
        return m.id == event.id ? member : m;
      }).toList();
      emit(state.copyWith(
        isUpdating: false,
        members: updatedMembers,
        selectedMember: member,
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onRenewMembership(
    RenewMembership event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      final member = await _repository.renewMembership(
        event.memberId,
        subscriptionId: event.subscriptionId,
        startDate: event.startDate,
      );
      final updatedMembers = state.members.map((m) {
        return m.id == event.memberId ? member : m;
      }).toList();
      emit(state.copyWith(
        isUpdating: false,
        members: updatedMembers,
        selectedMember: member,
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onDeleteMember(
    DeleteMember event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isDeleting: true, operationError: null));

    try {
      await _repository.deleteMember(event.id);
      final updatedMembers = state.members.where((m) => m.id != event.id).toList();
      emit(state.copyWith(
        isDeleting: false,
        members: updatedMembers,
      ));
    } catch (e) {
      emit(state.copyWith(
        isDeleting: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadSubscriptions(
    LoadSubscriptions event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(subscriptionsStatus: GymStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getSubscriptions(
        params,
        isActive: event.isActive,
      );

      emit(state.copyWith(
        subscriptionsStatus: GymStatus.success,
        subscriptions: response.data,
        subscriptionsPagination: response.pagination,
        currentSubscriptionsParams: params,
        subscriptionsIsActive: event.isActive,
        subscriptionsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        subscriptionsStatus: GymStatus.failure,
        subscriptionsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreSubscriptions(
    LoadMoreSubscriptions event,
    Emitter<GymState> emit,
  ) async {
    if (!state.hasMoreSubscriptions || state.subscriptionsStatus == GymStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(subscriptionsStatus: GymStatus.loadingMore));

    try {
      final nextPage = (state.subscriptionsPagination?.page ?? 0) + 1;
      final params = state.currentSubscriptionsParams.copyWith(page: nextPage);

      final response = await _repository.getSubscriptions(
        params,
        isActive: state.subscriptionsIsActive,
      );

      emit(state.copyWith(
        subscriptionsStatus: GymStatus.success,
        subscriptions: [...state.subscriptions, ...response.data],
        subscriptionsPagination: response.pagination,
        currentSubscriptionsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        subscriptionsStatus: GymStatus.failure,
        subscriptionsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateSubscription(
    CreateSubscription event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      final subscription = await _repository.createSubscription(event.data);
      emit(state.copyWith(
        isCreating: false,
        subscriptions: [subscription, ...state.subscriptions],
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateSubscription(
    UpdateSubscription event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      final subscription = await _repository.updateSubscription(event.id, event.data);
      final updatedSubscriptions = state.subscriptions.map((s) {
        return s.id == event.id ? subscription : s;
      }).toList();
      emit(state.copyWith(
        isUpdating: false,
        subscriptions: updatedSubscriptions,
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onDeleteSubscription(
    DeleteSubscription event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isDeleting: true, operationError: null));

    try {
      await _repository.deleteSubscription(event.id);
      final updatedSubscriptions = state.subscriptions.where((s) => s.id != event.id).toList();
      emit(state.copyWith(
        isDeleting: false,
        subscriptions: updatedSubscriptions,
      ));
    } catch (e) {
      emit(state.copyWith(
        isDeleting: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadTrainers(
    LoadTrainers event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(trainersStatus: GymStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getTrainers(
        params,
        specialization: event.specialization,
        isActive: event.isActive,
      );

      emit(state.copyWith(
        trainersStatus: GymStatus.success,
        trainers: response.data,
        trainersPagination: response.pagination,
        currentTrainersParams: params,
        trainersSpecialization: event.specialization,
        trainersIsActive: event.isActive,
        trainersError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        trainersStatus: GymStatus.failure,
        trainersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreTrainers(
    LoadMoreTrainers event,
    Emitter<GymState> emit,
  ) async {
    if (!state.hasMoreTrainers || state.trainersStatus == GymStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(trainersStatus: GymStatus.loadingMore));

    try {
      final nextPage = (state.trainersPagination?.page ?? 0) + 1;
      final params = state.currentTrainersParams.copyWith(page: nextPage);

      final response = await _repository.getTrainers(
        params,
        specialization: state.trainersSpecialization,
        isActive: state.trainersIsActive,
      );

      emit(state.copyWith(
        trainersStatus: GymStatus.success,
        trainers: [...state.trainers, ...response.data],
        trainersPagination: response.pagination,
        currentTrainersParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        trainersStatus: GymStatus.failure,
        trainersError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateTrainer(
    CreateTrainer event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      final trainer = await _repository.createTrainer(event.data);
      emit(state.copyWith(
        isCreating: false,
        trainers: [trainer, ...state.trainers],
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateTrainer(
    UpdateTrainer event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      final trainer = await _repository.updateTrainer(event.id, event.data);
      final updatedTrainers = state.trainers.map((t) {
        return t.id == event.id ? trainer : t;
      }).toList();
      emit(state.copyWith(
        isUpdating: false,
        trainers: updatedTrainers,
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onDeleteTrainer(
    DeleteTrainer event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isDeleting: true, operationError: null));

    try {
      await _repository.deleteTrainer(event.id);
      final updatedTrainers = state.trainers.where((t) => t.id != event.id).toList();
      emit(state.copyWith(
        isDeleting: false,
        trainers: updatedTrainers,
      ));
    } catch (e) {
      emit(state.copyWith(
        isDeleting: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadAttendance(
    LoadAttendance event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(attendanceStatus: GymStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getAttendance(
        params,
        memberId: event.memberId,
        date: event.date,
      );

      emit(state.copyWith(
        attendanceStatus: GymStatus.success,
        attendance: response.data,
        attendancePagination: response.pagination,
        currentAttendanceParams: params,
        attendanceMemberId: event.memberId,
        attendanceDate: event.date,
        attendanceError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        attendanceStatus: GymStatus.failure,
        attendanceError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreAttendance(
    LoadMoreAttendance event,
    Emitter<GymState> emit,
  ) async {
    if (!state.hasMoreAttendance || state.attendanceStatus == GymStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(attendanceStatus: GymStatus.loadingMore));

    try {
      final nextPage = (state.attendancePagination?.page ?? 0) + 1;
      final params = state.currentAttendanceParams.copyWith(page: nextPage);

      final response = await _repository.getAttendance(
        params,
        memberId: state.attendanceMemberId,
        date: state.attendanceDate,
      );

      emit(state.copyWith(
        attendanceStatus: GymStatus.success,
        attendance: [...state.attendance, ...response.data],
        attendancePagination: response.pagination,
        currentAttendanceParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        attendanceStatus: GymStatus.failure,
        attendanceError: e.toString(),
      ));
    }
  }

  Future<void> _onCheckInMember(
    CheckInMember event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      final attendance = await _repository.checkIn(event.memberId, notes: event.notes);
      emit(state.copyWith(
        isCreating: false,
        attendance: [attendance, ...state.attendance],
        todayAttendance: [attendance, ...state.todayAttendance],
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onCheckOutMember(
    CheckOutMember event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      final attendance = await _repository.checkOut(event.attendanceId, notes: event.notes);
      final updatedAttendance = state.attendance.map((a) {
        return a.id == event.attendanceId ? attendance : a;
      }).toList();
      final updatedTodayAttendance = state.todayAttendance.map((a) {
        return a.id == event.attendanceId ? attendance : a;
      }).toList();
      emit(state.copyWith(
        isUpdating: false,
        attendance: updatedAttendance,
        todayAttendance: updatedTodayAttendance,
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
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(dashboardStatus: GymStatus.loading));

    try {
      final stats = await _repository.getDashboardStats();
      emit(state.copyWith(
        dashboardStatus: GymStatus.success,
        dashboardStats: stats,
        dashboardError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        dashboardStatus: GymStatus.failure,
        dashboardError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadExpiringMemberships(
    LoadExpiringMemberships event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(expiringMembershipsStatus: GymStatus.loading));

    try {
      final members = await _repository.getExpiringMemberships(days: event.days);
      emit(state.copyWith(
        expiringMembershipsStatus: GymStatus.success,
        expiringMemberships: members,
        expiringMembershipsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        expiringMembershipsStatus: GymStatus.failure,
        expiringMembershipsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadTodayAttendance(
    LoadTodayAttendance event,
    Emitter<GymState> emit,
  ) async {
    emit(state.copyWith(todayAttendanceStatus: GymStatus.loading));

    try {
      final attendance = await _repository.getTodayAttendance();
      emit(state.copyWith(
        todayAttendanceStatus: GymStatus.success,
        todayAttendance: attendance,
        todayAttendanceError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        todayAttendanceStatus: GymStatus.failure,
        todayAttendanceError: e.toString(),
      ));
    }
  }

  void _onClearFilters(
    ClearFilters event,
    Emitter<GymState> emit,
  ) {
    emit(GymState(
      membersStatus: state.membersStatus,
      members: state.members,
      membersPagination: state.membersPagination,
      subscriptionsStatus: state.subscriptionsStatus,
      subscriptions: state.subscriptions,
      subscriptionsPagination: state.subscriptionsPagination,
      trainersStatus: state.trainersStatus,
      trainers: state.trainers,
      trainersPagination: state.trainersPagination,
      attendanceStatus: state.attendanceStatus,
      attendance: state.attendance,
      attendancePagination: state.attendancePagination,
      dashboardStatus: state.dashboardStatus,
      dashboardStats: state.dashboardStats,
      expiringMembershipsStatus: state.expiringMembershipsStatus,
      expiringMemberships: state.expiringMemberships,
      todayAttendanceStatus: state.todayAttendanceStatus,
      todayAttendance: state.todayAttendance,
      currentMembersParams: PaginationParams(),
      currentSubscriptionsParams: PaginationParams(),
      currentTrainersParams: PaginationParams(),
      currentAttendanceParams: PaginationParams(),
    ));
  }

  Future<void> _onRefreshData(
    RefreshData event,
    Emitter<GymState> emit,
  ) async {
    add(const LoadMembers());
    add(const LoadSubscriptions());
    add(const LoadTrainers());
    add(const LoadAttendance());
    add(const LoadDashboardStats());
    add(const LoadExpiringMemberships());
    add(const LoadTodayAttendance());
  }
}
