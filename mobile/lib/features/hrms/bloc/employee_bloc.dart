import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/models/hr_models.dart';
import '../data/repositories/hr_repository.dart';

abstract class EmployeeEvent {}

class LoadEmployees extends EmployeeEvent {
  final String? status;
  final String? departmentId;
  final String? search;
  final int page;

  LoadEmployees({
    this.status,
    this.departmentId,
    this.search,
    this.page = 1,
  });
}

class RefreshEmployees extends EmployeeEvent {}

class CreateEmployee extends EmployeeEvent {
  final Map<String, dynamic> data;
  CreateEmployee(this.data);
}

class UpdateEmployee extends EmployeeEvent {
  final String id;
  final Map<String, dynamic> data;
  UpdateEmployee(this.id, this.data);
}

class DeleteEmployee extends EmployeeEvent {
  final String id;
  DeleteEmployee(this.id);
}

abstract class EmployeeState {}

class EmployeeInitial extends EmployeeState {}

class EmployeeLoading extends EmployeeState {}

class EmployeeLoaded extends EmployeeState {
  final List<HrEmployee> employees;
  final List<HrDepartment> departments;
  final int total;
  final int page;
  final bool hasMore;

  EmployeeLoaded({
    required this.employees,
    this.departments = const [],
    this.total = 0,
    this.page = 1,
    this.hasMore = false,
  });

  EmployeeLoaded copyWith({
    List<HrEmployee>? employees,
    List<HrDepartment>? departments,
    int? total,
    int? page,
    bool? hasMore,
  }) {
    return EmployeeLoaded(
      employees: employees ?? this.employees,
      departments: departments ?? this.departments,
      total: total ?? this.total,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
    );
  }
}

class EmployeeError extends EmployeeState {
  final String message;
  EmployeeError(this.message);
}

class EmployeeActionSuccess extends EmployeeState {
  final String message;
  EmployeeActionSuccess(this.message);
}

class EmployeeBloc extends Bloc<EmployeeEvent, EmployeeState> {
  final HrRepository _repository;
  String? _currentStatus;
  String? _currentDepartmentId;
  String? _currentSearch;

  EmployeeBloc(this._repository) : super(EmployeeInitial()) {
    on<LoadEmployees>(_onLoad);
    on<RefreshEmployees>(_onRefresh);
    on<CreateEmployee>(_onCreate);
    on<UpdateEmployee>(_onUpdate);
    on<DeleteEmployee>(_onDelete);
  }

  Future<void> _onLoad(LoadEmployees event, Emitter<EmployeeState> emit) async {
    emit(EmployeeLoading());
    _currentStatus = event.status;
    _currentDepartmentId = event.departmentId;
    _currentSearch = event.search;
    await _loadData(emit, event.page);
  }

  Future<void> _onRefresh(RefreshEmployees event, Emitter<EmployeeState> emit) async {
    await _loadData(emit, 1);
  }

  Future<void> _loadData(Emitter<EmployeeState> emit, int page) async {
    try {
      final result = await _repository.getEmployees(
        status: _currentStatus,
        departmentId: _currentDepartmentId,
        search: _currentSearch,
        page: page,
      );
      final departments = await _repository.getDepartments();

      emit(EmployeeLoaded(
        employees: result.data,
        departments: departments,
        total: result.total,
        page: result.page,
        hasMore: result.page < result.totalPages,
      ));
    } catch (e) {
      emit(EmployeeError(e.toString()));
    }
  }

  Future<void> _onCreate(CreateEmployee event, Emitter<EmployeeState> emit) async {
    try {
      await _repository.createEmployee(event.data);
      emit(EmployeeActionSuccess('Employee created successfully'));
      add(RefreshEmployees());
    } catch (e) {
      emit(EmployeeError(e.toString()));
    }
  }

  Future<void> _onUpdate(UpdateEmployee event, Emitter<EmployeeState> emit) async {
    try {
      await _repository.updateEmployee(event.id, event.data);
      emit(EmployeeActionSuccess('Employee updated successfully'));
      add(RefreshEmployees());
    } catch (e) {
      emit(EmployeeError(e.toString()));
    }
  }

  Future<void> _onDelete(DeleteEmployee event, Emitter<EmployeeState> emit) async {
    try {
      await _repository.deleteEmployee(event.id);
      emit(EmployeeActionSuccess('Employee deleted successfully'));
      add(RefreshEmployees());
    } catch (e) {
      emit(EmployeeError(e.toString()));
    }
  }
}
