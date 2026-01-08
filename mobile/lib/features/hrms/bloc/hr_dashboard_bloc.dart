import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/models/hr_models.dart';
import '../data/repositories/hr_repository.dart';

abstract class HrDashboardEvent {}

class LoadDashboard extends HrDashboardEvent {}

class RefreshDashboard extends HrDashboardEvent {}

abstract class HrDashboardState {}

class HrDashboardInitial extends HrDashboardState {}

class HrDashboardLoading extends HrDashboardState {}

class HrDashboardLoaded extends HrDashboardState {
  final HrDashboardStats stats;
  final List<HrEmployee> recentEmployees;
  final List<HrLeave> pendingLeaves;

  HrDashboardLoaded({
    required this.stats,
    this.recentEmployees = const [],
    this.pendingLeaves = const [],
  });
}

class HrDashboardError extends HrDashboardState {
  final String message;
  HrDashboardError(this.message);
}

class HrDashboardBloc extends Bloc<HrDashboardEvent, HrDashboardState> {
  final HrRepository _repository;

  HrDashboardBloc(this._repository) : super(HrDashboardInitial()) {
    on<LoadDashboard>(_onLoad);
    on<RefreshDashboard>(_onRefresh);
  }

  Future<void> _onLoad(LoadDashboard event, Emitter<HrDashboardState> emit) async {
    emit(HrDashboardLoading());
    await _loadData(emit);
  }

  Future<void> _onRefresh(RefreshDashboard event, Emitter<HrDashboardState> emit) async {
    await _loadData(emit);
  }

  Future<void> _loadData(Emitter<HrDashboardState> emit) async {
    try {
      final stats = await _repository.getDashboardStats();
      final employeesResult = await _repository.getEmployees(limit: 5);
      final leavesResult = await _repository.getLeaves(status: 'pending', limit: 5);

      emit(HrDashboardLoaded(
        stats: stats,
        recentEmployees: employeesResult.data,
        pendingLeaves: leavesResult.data,
      ));
    } catch (e) {
      emit(HrDashboardError(e.toString()));
    }
  }
}
