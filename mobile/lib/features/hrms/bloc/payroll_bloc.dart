import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/models/hr_models.dart';
import '../data/repositories/hr_repository.dart';

abstract class PayrollEvent {}

class LoadPayroll extends PayrollEvent {
  final int month;
  final int year;
  final String? status;
  final int page;

  LoadPayroll({
    required this.month,
    required this.year,
    this.status,
    this.page = 1,
  });
}

class RunPayroll extends PayrollEvent {
  final int month;
  final int year;
  final String? employeeId;

  RunPayroll({
    required this.month,
    required this.year,
    this.employeeId,
  });
}

class ProcessPayroll extends PayrollEvent {
  final String id;
  ProcessPayroll(this.id);
}

abstract class PayrollState {}

class PayrollInitial extends PayrollState {}

class PayrollLoading extends PayrollState {}

class PayrollLoaded extends PayrollState {
  final List<HrPayroll> records;
  final int total;
  final int page;
  final bool hasMore;
  final int month;
  final int year;
  final String? currentFilter;
  final int processedCount;
  final int pendingCount;
  final int failedCount;

  PayrollLoaded({
    required this.records,
    this.total = 0,
    this.page = 1,
    this.hasMore = false,
    required this.month,
    required this.year,
    this.currentFilter,
    this.processedCount = 0,
    this.pendingCount = 0,
    this.failedCount = 0,
  });
}

class PayrollError extends PayrollState {
  final String message;
  PayrollError(this.message);
}

class PayrollActionSuccess extends PayrollState {
  final String message;
  PayrollActionSuccess(this.message);
}

class PayrollBloc extends Bloc<PayrollEvent, PayrollState> {
  final HrRepository _repository;
  int _currentMonth = DateTime.now().month;
  int _currentYear = DateTime.now().year;
  String? _currentStatus;

  PayrollBloc(this._repository) : super(PayrollInitial()) {
    on<LoadPayroll>(_onLoad);
    on<RunPayroll>(_onRun);
    on<ProcessPayroll>(_onProcess);
  }

  Future<void> _onLoad(LoadPayroll event, Emitter<PayrollState> emit) async {
    emit(PayrollLoading());
    _currentMonth = event.month;
    _currentYear = event.year;
    _currentStatus = event.status;

    try {
      final result = await _repository.getPayroll(
        month: event.month,
        year: event.year,
        status: event.status,
        page: event.page,
      );

      int processed = 0, pending = 0, failed = 0;
      for (var record in result.data) {
        switch (record.status) {
          case 'processed':
            processed++;
            break;
          case 'pending':
          case 'draft':
            pending++;
            break;
          case 'failed':
            failed++;
            break;
        }
      }

      emit(PayrollLoaded(
        records: result.data,
        total: result.total,
        page: result.page,
        hasMore: result.page < result.totalPages,
        month: event.month,
        year: event.year,
        currentFilter: event.status,
        processedCount: processed,
        pendingCount: pending,
        failedCount: failed,
      ));
    } catch (e) {
      emit(PayrollError(e.toString()));
    }
  }

  Future<void> _onRun(RunPayroll event, Emitter<PayrollState> emit) async {
    try {
      await _repository.runPayroll({
        'month': event.month,
        'year': event.year,
        if (event.employeeId != null) 'employeeId': event.employeeId,
      });
      emit(PayrollActionSuccess('Payroll processing started'));
      add(LoadPayroll(month: event.month, year: event.year, status: _currentStatus));
    } catch (e) {
      emit(PayrollError(e.toString()));
    }
  }

  Future<void> _onProcess(ProcessPayroll event, Emitter<PayrollState> emit) async {
    try {
      await _repository.updatePayrollStatus(event.id, 'processed');
      emit(PayrollActionSuccess('Payroll processed successfully'));
      add(LoadPayroll(month: _currentMonth, year: _currentYear, status: _currentStatus));
    } catch (e) {
      emit(PayrollError(e.toString()));
    }
  }
}
