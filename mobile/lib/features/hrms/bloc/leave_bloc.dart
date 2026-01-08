import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/models/hr_models.dart';
import '../data/repositories/hr_repository.dart';

abstract class LeaveEvent {}

class LoadLeaves extends LeaveEvent {
  final String? status;
  final String? employeeId;
  final int page;

  LoadLeaves({this.status, this.employeeId, this.page = 1});
}

class ApplyLeave extends LeaveEvent {
  final Map<String, dynamic> data;
  ApplyLeave(this.data);
}

class ApproveLeave extends LeaveEvent {
  final String id;
  ApproveLeave(this.id);
}

class RejectLeave extends LeaveEvent {
  final String id;
  RejectLeave(this.id);
}

abstract class LeaveState {}

class LeaveInitial extends LeaveState {}

class LeaveLoading extends LeaveState {}

class LeaveLoaded extends LeaveState {
  final List<HrLeave> leaves;
  final List<HrLeaveType> leaveTypes;
  final int total;
  final int page;
  final bool hasMore;
  final String? currentFilter;

  LeaveLoaded({
    required this.leaves,
    this.leaveTypes = const [],
    this.total = 0,
    this.page = 1,
    this.hasMore = false,
    this.currentFilter,
  });
}

class LeaveError extends LeaveState {
  final String message;
  LeaveError(this.message);
}

class LeaveActionSuccess extends LeaveState {
  final String message;
  LeaveActionSuccess(this.message);
}

class LeaveBloc extends Bloc<LeaveEvent, LeaveState> {
  final HrRepository _repository;
  String? _currentStatus;
  String? _currentEmployeeId;

  LeaveBloc(this._repository) : super(LeaveInitial()) {
    on<LoadLeaves>(_onLoad);
    on<ApplyLeave>(_onApply);
    on<ApproveLeave>(_onApprove);
    on<RejectLeave>(_onReject);
  }

  Future<void> _onLoad(LoadLeaves event, Emitter<LeaveState> emit) async {
    emit(LeaveLoading());
    _currentStatus = event.status;
    _currentEmployeeId = event.employeeId;

    try {
      final result = await _repository.getLeaves(
        status: event.status,
        employeeId: event.employeeId,
        page: event.page,
      );
      final leaveTypes = await _repository.getLeaveTypes();

      emit(LeaveLoaded(
        leaves: result.data,
        leaveTypes: leaveTypes,
        total: result.total,
        page: result.page,
        hasMore: result.page < result.totalPages,
        currentFilter: event.status,
      ));
    } catch (e) {
      emit(LeaveError(e.toString()));
    }
  }

  Future<void> _onApply(ApplyLeave event, Emitter<LeaveState> emit) async {
    try {
      await _repository.applyLeave(event.data);
      emit(LeaveActionSuccess('Leave application submitted'));
      add(LoadLeaves(status: _currentStatus, employeeId: _currentEmployeeId));
    } catch (e) {
      emit(LeaveError(e.toString()));
    }
  }

  Future<void> _onApprove(ApproveLeave event, Emitter<LeaveState> emit) async {
    try {
      await _repository.updateLeaveStatus(event.id, 'approved');
      emit(LeaveActionSuccess('Leave approved'));
      add(LoadLeaves(status: _currentStatus, employeeId: _currentEmployeeId));
    } catch (e) {
      emit(LeaveError(e.toString()));
    }
  }

  Future<void> _onReject(RejectLeave event, Emitter<LeaveState> emit) async {
    try {
      await _repository.updateLeaveStatus(event.id, 'rejected');
      emit(LeaveActionSuccess('Leave rejected'));
      add(LoadLeaves(status: _currentStatus, employeeId: _currentEmployeeId));
    } catch (e) {
      emit(LeaveError(e.toString()));
    }
  }
}
