import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/repositories/clinic_repository.dart';
import 'clinic_event.dart';
import 'clinic_state.dart';

class ClinicBloc extends Bloc<ClinicEvent, ClinicState> {
  final ClinicRepository _repository;

  ClinicBloc(this._repository) : super(const ClinicState()) {
    on<LoadPatients>(_onLoadPatients);
    on<LoadMorePatients>(_onLoadMorePatients);
    on<LoadPatientDetail>(_onLoadPatientDetail);
    on<CreatePatient>(_onCreatePatient);
    on<UpdatePatient>(_onUpdatePatient);
    on<DeletePatient>(_onDeletePatient);
    on<LoadAppointments>(_onLoadAppointments);
    on<LoadMoreAppointments>(_onLoadMoreAppointments);
    on<CreateAppointment>(_onCreateAppointment);
    on<UpdateAppointment>(_onUpdateAppointment);
    on<CancelAppointment>(_onCancelAppointment);
    on<LoadDoctors>(_onLoadDoctors);
    on<LoadMoreDoctors>(_onLoadMoreDoctors);
    on<CreateDoctor>(_onCreateDoctor);
    on<UpdateDoctor>(_onUpdateDoctor);
    on<LoadDashboardStats>(_onLoadDashboardStats);
    on<LoadTodayAppointments>(_onLoadTodayAppointments);
    on<ClearFilters>(_onClearFilters);
    on<RefreshData>(_onRefreshData);
    on<ClearSelectedPatient>(_onClearSelectedPatient);
  }

  Future<void> _onLoadPatients(
    LoadPatients event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(patientsStatus: ClinicStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getPatients(
        params,
        gender: event.gender,
        bloodGroup: event.bloodGroup,
      );

      emit(state.copyWith(
        patientsStatus: ClinicStatus.success,
        patients: response.data,
        patientsPagination: response.pagination,
        currentPatientsParams: params,
        patientsGender: event.gender,
        patientsBloodGroup: event.bloodGroup,
        patientsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        patientsStatus: ClinicStatus.failure,
        patientsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMorePatients(
    LoadMorePatients event,
    Emitter<ClinicState> emit,
  ) async {
    if (!state.hasMorePatients || state.patientsStatus == ClinicStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(patientsStatus: ClinicStatus.loadingMore));

    try {
      final nextPage = (state.patientsPagination?.page ?? 0) + 1;
      final params = state.currentPatientsParams.copyWith(page: nextPage);

      final response = await _repository.getPatients(
        params,
        gender: state.patientsGender,
        bloodGroup: state.patientsBloodGroup,
      );

      emit(state.copyWith(
        patientsStatus: ClinicStatus.success,
        patients: [...state.patients, ...response.data],
        patientsPagination: response.pagination,
        currentPatientsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        patientsStatus: ClinicStatus.failure,
        patientsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadPatientDetail(
    LoadPatientDetail event,
    Emitter<ClinicState> emit,
  ) async {
    try {
      final patient = await _repository.getPatient(event.patientId);
      emit(state.copyWith(selectedPatient: patient));
    } catch (e) {
      emit(state.copyWith(patientsError: e.toString()));
    }
  }

  Future<void> _onCreatePatient(
    CreatePatient event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      final patient = await _repository.createPatient(event.data);
      emit(state.copyWith(
        isCreating: false,
        patients: [patient, ...state.patients],
        operationSuccess: 'Patient created successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdatePatient(
    UpdatePatient event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      final patient = await _repository.updatePatient(event.id, event.data);
      final updatedPatients = state.patients.map((p) {
        return p.id == event.id ? patient : p;
      }).toList();

      emit(state.copyWith(
        isUpdating: false,
        patients: updatedPatients,
        selectedPatient: state.selectedPatient?.id == event.id ? patient : null,
        operationSuccess: 'Patient updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onDeletePatient(
    DeletePatient event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(isDeleting: true, operationError: null));

    try {
      await _repository.deletePatient(event.id);
      final updatedPatients = state.patients.where((p) => p.id != event.id).toList();

      emit(state.copyWith(
        isDeleting: false,
        patients: updatedPatients,
        clearSelectedPatient: state.selectedPatient?.id == event.id,
        operationSuccess: 'Patient deleted successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isDeleting: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadAppointments(
    LoadAppointments event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(appointmentsStatus: ClinicStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        status: event.status,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getAppointments(
        params,
        doctorId: event.doctorId,
        patientId: event.patientId,
        date: event.date,
      );

      emit(state.copyWith(
        appointmentsStatus: ClinicStatus.success,
        appointments: response.data,
        appointmentsPagination: response.pagination,
        currentAppointmentsParams: params,
        appointmentsDoctorId: event.doctorId,
        appointmentsPatientId: event.patientId,
        appointmentsDate: event.date,
        appointmentsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        appointmentsStatus: ClinicStatus.failure,
        appointmentsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreAppointments(
    LoadMoreAppointments event,
    Emitter<ClinicState> emit,
  ) async {
    if (!state.hasMoreAppointments || state.appointmentsStatus == ClinicStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(appointmentsStatus: ClinicStatus.loadingMore));

    try {
      final nextPage = (state.appointmentsPagination?.page ?? 0) + 1;
      final params = state.currentAppointmentsParams.copyWith(page: nextPage);

      final response = await _repository.getAppointments(
        params,
        doctorId: state.appointmentsDoctorId,
        patientId: state.appointmentsPatientId,
        date: state.appointmentsDate,
      );

      emit(state.copyWith(
        appointmentsStatus: ClinicStatus.success,
        appointments: [...state.appointments, ...response.data],
        appointmentsPagination: response.pagination,
        currentAppointmentsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        appointmentsStatus: ClinicStatus.failure,
        appointmentsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateAppointment(
    CreateAppointment event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      final appointment = await _repository.createAppointment(event.data);
      emit(state.copyWith(
        isCreating: false,
        appointments: [appointment, ...state.appointments],
        operationSuccess: 'Appointment created successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateAppointment(
    UpdateAppointment event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      final appointment = await _repository.updateAppointment(event.id, event.data);
      final updatedAppointments = state.appointments.map((a) {
        return a.id == event.id ? appointment : a;
      }).toList();

      emit(state.copyWith(
        isUpdating: false,
        appointments: updatedAppointments,
        operationSuccess: 'Appointment updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onCancelAppointment(
    CancelAppointment event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      final appointment = await _repository.cancelAppointment(event.id);
      final updatedAppointments = state.appointments.map((a) {
        return a.id == event.id ? appointment : a;
      }).toList();

      emit(state.copyWith(
        isUpdating: false,
        appointments: updatedAppointments,
        operationSuccess: 'Appointment cancelled successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isUpdating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadDoctors(
    LoadDoctors event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(doctorsStatus: ClinicStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getDoctors(
        params,
        specialization: event.specialization,
        isActive: event.isActive,
      );

      emit(state.copyWith(
        doctorsStatus: ClinicStatus.success,
        doctors: response.data,
        doctorsPagination: response.pagination,
        currentDoctorsParams: params,
        doctorsSpecialization: event.specialization,
        doctorsIsActive: event.isActive,
        doctorsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        doctorsStatus: ClinicStatus.failure,
        doctorsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreDoctors(
    LoadMoreDoctors event,
    Emitter<ClinicState> emit,
  ) async {
    if (!state.hasMoreDoctors || state.doctorsStatus == ClinicStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(doctorsStatus: ClinicStatus.loadingMore));

    try {
      final nextPage = (state.doctorsPagination?.page ?? 0) + 1;
      final params = state.currentDoctorsParams.copyWith(page: nextPage);

      final response = await _repository.getDoctors(
        params,
        specialization: state.doctorsSpecialization,
        isActive: state.doctorsIsActive,
      );

      emit(state.copyWith(
        doctorsStatus: ClinicStatus.success,
        doctors: [...state.doctors, ...response.data],
        doctorsPagination: response.pagination,
        currentDoctorsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        doctorsStatus: ClinicStatus.failure,
        doctorsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateDoctor(
    CreateDoctor event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(isCreating: true, operationError: null));

    try {
      final doctor = await _repository.createDoctor(event.data);
      emit(state.copyWith(
        isCreating: false,
        doctors: [doctor, ...state.doctors],
        operationSuccess: 'Doctor created successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        isCreating: false,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateDoctor(
    UpdateDoctor event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(isUpdating: true, operationError: null));

    try {
      final doctor = await _repository.updateDoctor(event.id, event.data);
      final updatedDoctors = state.doctors.map((d) {
        return d.id == event.id ? doctor : d;
      }).toList();

      emit(state.copyWith(
        isUpdating: false,
        doctors: updatedDoctors,
        operationSuccess: 'Doctor updated successfully',
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
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(dashboardStatus: ClinicStatus.loading));

    try {
      final stats = await _repository.getDashboardStats();
      emit(state.copyWith(
        dashboardStatus: ClinicStatus.success,
        dashboardStats: stats,
        dashboardError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        dashboardStatus: ClinicStatus.failure,
        dashboardError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadTodayAppointments(
    LoadTodayAppointments event,
    Emitter<ClinicState> emit,
  ) async {
    emit(state.copyWith(todayAppointmentsStatus: ClinicStatus.loading));

    try {
      final appointments = await _repository.getTodayAppointments();
      emit(state.copyWith(
        todayAppointmentsStatus: ClinicStatus.success,
        todayAppointments: appointments,
      ));
    } catch (e) {
      emit(state.copyWith(
        todayAppointmentsStatus: ClinicStatus.failure,
      ));
    }
  }

  void _onClearFilters(
    ClearFilters event,
    Emitter<ClinicState> emit,
  ) {
    emit(const ClinicState());
  }

  Future<void> _onRefreshData(
    RefreshData event,
    Emitter<ClinicState> emit,
  ) async {
    add(const LoadPatients());
    add(const LoadAppointments());
    add(const LoadDoctors());
    add(const LoadDashboardStats());
    add(const LoadTodayAppointments());
  }

  void _onClearSelectedPatient(
    ClearSelectedPatient event,
    Emitter<ClinicState> emit,
  ) {
    emit(state.copyWith(clearSelectedPatient: true));
  }
}
