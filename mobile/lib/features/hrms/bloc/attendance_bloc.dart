import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/models/hr_models.dart';
import '../data/repositories/hr_repository.dart';

abstract class AttendanceEvent {}

class LoadAttendance extends AttendanceEvent {
  final DateTime date;
  final String? employeeId;
  final String? status;

  LoadAttendance({required this.date, this.employeeId, this.status});
}

class CheckIn extends AttendanceEvent {
  final String employeeId;
  CheckIn(this.employeeId);
}

class CheckOut extends AttendanceEvent {
  final String employeeId;
  CheckOut(this.employeeId);
}

class MarkAttendance extends AttendanceEvent {
  final Map<String, dynamic> data;
  MarkAttendance(this.data);
}

abstract class AttendanceState {}

class AttendanceInitial extends AttendanceState {}

class AttendanceLoading extends AttendanceState {}

class AttendanceLoaded extends AttendanceState {
  final List<HrAttendance> records;
  final List<HrEmployee> employees;
  final DateTime selectedDate;
  final int presentCount;
  final int absentCount;
  final int onLeaveCount;

  AttendanceLoaded({
    required this.records,
    this.employees = const [],
    required this.selectedDate,
    this.presentCount = 0,
    this.absentCount = 0,
    this.onLeaveCount = 0,
  });
}

class AttendanceError extends AttendanceState {
  final String message;
  AttendanceError(this.message);
}

class AttendanceActionSuccess extends AttendanceState {
  final String message;
  AttendanceActionSuccess(this.message);
}

class AttendanceBloc extends Bloc<AttendanceEvent, AttendanceState> {
  final HrRepository _repository;
  DateTime _currentDate = DateTime.now();

  AttendanceBloc(this._repository) : super(AttendanceInitial()) {
    on<LoadAttendance>(_onLoad);
    on<CheckIn>(_onCheckIn);
    on<CheckOut>(_onCheckOut);
    on<MarkAttendance>(_onMark);
  }

  Future<void> _onLoad(LoadAttendance event, Emitter<AttendanceState> emit) async {
    emit(AttendanceLoading());
    _currentDate = event.date;
    
    try {
      final dateStr = '${event.date.year}-${event.date.month.toString().padLeft(2, '0')}-${event.date.day.toString().padLeft(2, '0')}';
      final result = await _repository.getAttendance(
        startDate: dateStr,
        endDate: dateStr,
        employeeId: event.employeeId,
        status: event.status,
      );
      final employees = await _repository.getEmployees(limit: 100);

      int present = 0, absent = 0, onLeave = 0;
      for (var record in result.data) {
        switch (record.status) {
          case 'present':
          case 'half_day':
            present++;
            break;
          case 'absent':
            absent++;
            break;
          case 'leave':
            onLeave++;
            break;
        }
      }

      emit(AttendanceLoaded(
        records: result.data,
        employees: employees.data,
        selectedDate: event.date,
        presentCount: present,
        absentCount: absent,
        onLeaveCount: onLeave,
      ));
    } catch (e) {
      emit(AttendanceError(e.toString()));
    }
  }

  Future<void> _onCheckIn(CheckIn event, Emitter<AttendanceState> emit) async {
    try {
      await _repository.checkIn(event.employeeId);
      emit(AttendanceActionSuccess('Checked in successfully'));
      add(LoadAttendance(date: _currentDate));
    } catch (e) {
      emit(AttendanceError(e.toString()));
    }
  }

  Future<void> _onCheckOut(CheckOut event, Emitter<AttendanceState> emit) async {
    try {
      await _repository.checkOut(event.employeeId);
      emit(AttendanceActionSuccess('Checked out successfully'));
      add(LoadAttendance(date: _currentDate));
    } catch (e) {
      emit(AttendanceError(e.toString()));
    }
  }

  Future<void> _onMark(MarkAttendance event, Emitter<AttendanceState> emit) async {
    try {
      await _repository.markAttendance(event.data);
      emit(AttendanceActionSuccess('Attendance marked successfully'));
      add(LoadAttendance(date: _currentDate));
    } catch (e) {
      emit(AttendanceError(e.toString()));
    }
  }
}
