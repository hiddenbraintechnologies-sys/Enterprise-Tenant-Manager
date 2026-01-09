import 'package:equatable/equatable.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/clinic_patient.dart';
import '../../domain/entities/clinic_appointment.dart';
import '../../domain/entities/clinic_doctor.dart';

enum ClinicStatus { initial, loading, loadingMore, success, failure }

class ClinicState extends Equatable {
  final ClinicStatus patientsStatus;
  final List<ClinicPatient> patients;
  final PaginationMeta? patientsPagination;
  final String? patientsError;
  final ClinicPatient? selectedPatient;

  final ClinicStatus appointmentsStatus;
  final List<ClinicAppointment> appointments;
  final PaginationMeta? appointmentsPagination;
  final String? appointmentsError;

  final ClinicStatus doctorsStatus;
  final List<ClinicDoctor> doctors;
  final PaginationMeta? doctorsPagination;
  final String? doctorsError;

  final ClinicStatus dashboardStatus;
  final Map<String, dynamic>? dashboardStats;
  final String? dashboardError;

  final List<ClinicAppointment> todayAppointments;
  final ClinicStatus todayAppointmentsStatus;

  final PaginationParams currentPatientsParams;
  final PaginationParams currentAppointmentsParams;
  final PaginationParams currentDoctorsParams;

  final String? patientsGender;
  final String? patientsBloodGroup;

  final String? appointmentsDoctorId;
  final String? appointmentsPatientId;
  final DateTime? appointmentsDate;

  final String? doctorsSpecialization;
  final bool? doctorsIsActive;

  final bool isCreating;
  final bool isUpdating;
  final bool isDeleting;
  final String? operationError;
  final String? operationSuccess;

  const ClinicState({
    this.patientsStatus = ClinicStatus.initial,
    this.patients = const [],
    this.patientsPagination,
    this.patientsError,
    this.selectedPatient,
    this.appointmentsStatus = ClinicStatus.initial,
    this.appointments = const [],
    this.appointmentsPagination,
    this.appointmentsError,
    this.doctorsStatus = ClinicStatus.initial,
    this.doctors = const [],
    this.doctorsPagination,
    this.doctorsError,
    this.dashboardStatus = ClinicStatus.initial,
    this.dashboardStats,
    this.dashboardError,
    this.todayAppointments = const [],
    this.todayAppointmentsStatus = ClinicStatus.initial,
    PaginationParams? currentPatientsParams,
    PaginationParams? currentAppointmentsParams,
    PaginationParams? currentDoctorsParams,
    this.patientsGender,
    this.patientsBloodGroup,
    this.appointmentsDoctorId,
    this.appointmentsPatientId,
    this.appointmentsDate,
    this.doctorsSpecialization,
    this.doctorsIsActive,
    this.isCreating = false,
    this.isUpdating = false,
    this.isDeleting = false,
    this.operationError,
    this.operationSuccess,
  })  : currentPatientsParams = currentPatientsParams ?? const _DefaultPaginationParams(),
        currentAppointmentsParams = currentAppointmentsParams ?? const _DefaultPaginationParams(),
        currentDoctorsParams = currentDoctorsParams ?? const _DefaultPaginationParams();

  bool get hasMorePatients => patientsPagination?.hasNext ?? false;
  bool get hasMoreAppointments => appointmentsPagination?.hasNext ?? false;
  bool get hasMoreDoctors => doctorsPagination?.hasNext ?? false;

  bool get isLoading =>
      patientsStatus == ClinicStatus.loading ||
      appointmentsStatus == ClinicStatus.loading ||
      doctorsStatus == ClinicStatus.loading ||
      dashboardStatus == ClinicStatus.loading;

  ClinicState copyWith({
    ClinicStatus? patientsStatus,
    List<ClinicPatient>? patients,
    PaginationMeta? patientsPagination,
    String? patientsError,
    ClinicPatient? selectedPatient,
    bool clearSelectedPatient = false,
    ClinicStatus? appointmentsStatus,
    List<ClinicAppointment>? appointments,
    PaginationMeta? appointmentsPagination,
    String? appointmentsError,
    ClinicStatus? doctorsStatus,
    List<ClinicDoctor>? doctors,
    PaginationMeta? doctorsPagination,
    String? doctorsError,
    ClinicStatus? dashboardStatus,
    Map<String, dynamic>? dashboardStats,
    String? dashboardError,
    List<ClinicAppointment>? todayAppointments,
    ClinicStatus? todayAppointmentsStatus,
    PaginationParams? currentPatientsParams,
    PaginationParams? currentAppointmentsParams,
    PaginationParams? currentDoctorsParams,
    String? patientsGender,
    String? patientsBloodGroup,
    String? appointmentsDoctorId,
    String? appointmentsPatientId,
    DateTime? appointmentsDate,
    String? doctorsSpecialization,
    bool? doctorsIsActive,
    bool? isCreating,
    bool? isUpdating,
    bool? isDeleting,
    String? operationError,
    String? operationSuccess,
  }) {
    return ClinicState(
      patientsStatus: patientsStatus ?? this.patientsStatus,
      patients: patients ?? this.patients,
      patientsPagination: patientsPagination ?? this.patientsPagination,
      patientsError: patientsError,
      selectedPatient: clearSelectedPatient ? null : (selectedPatient ?? this.selectedPatient),
      appointmentsStatus: appointmentsStatus ?? this.appointmentsStatus,
      appointments: appointments ?? this.appointments,
      appointmentsPagination: appointmentsPagination ?? this.appointmentsPagination,
      appointmentsError: appointmentsError,
      doctorsStatus: doctorsStatus ?? this.doctorsStatus,
      doctors: doctors ?? this.doctors,
      doctorsPagination: doctorsPagination ?? this.doctorsPagination,
      doctorsError: doctorsError,
      dashboardStatus: dashboardStatus ?? this.dashboardStatus,
      dashboardStats: dashboardStats ?? this.dashboardStats,
      dashboardError: dashboardError,
      todayAppointments: todayAppointments ?? this.todayAppointments,
      todayAppointmentsStatus: todayAppointmentsStatus ?? this.todayAppointmentsStatus,
      currentPatientsParams: currentPatientsParams ?? this.currentPatientsParams,
      currentAppointmentsParams: currentAppointmentsParams ?? this.currentAppointmentsParams,
      currentDoctorsParams: currentDoctorsParams ?? this.currentDoctorsParams,
      patientsGender: patientsGender ?? this.patientsGender,
      patientsBloodGroup: patientsBloodGroup ?? this.patientsBloodGroup,
      appointmentsDoctorId: appointmentsDoctorId ?? this.appointmentsDoctorId,
      appointmentsPatientId: appointmentsPatientId ?? this.appointmentsPatientId,
      appointmentsDate: appointmentsDate ?? this.appointmentsDate,
      doctorsSpecialization: doctorsSpecialization ?? this.doctorsSpecialization,
      doctorsIsActive: doctorsIsActive ?? this.doctorsIsActive,
      isCreating: isCreating ?? this.isCreating,
      isUpdating: isUpdating ?? this.isUpdating,
      isDeleting: isDeleting ?? this.isDeleting,
      operationError: operationError,
      operationSuccess: operationSuccess,
    );
  }

  @override
  List<Object?> get props => [
        patientsStatus,
        patients,
        patientsPagination,
        patientsError,
        selectedPatient,
        appointmentsStatus,
        appointments,
        appointmentsPagination,
        appointmentsError,
        doctorsStatus,
        doctors,
        doctorsPagination,
        doctorsError,
        dashboardStatus,
        dashboardStats,
        dashboardError,
        todayAppointments,
        todayAppointmentsStatus,
        currentPatientsParams,
        currentAppointmentsParams,
        currentDoctorsParams,
        patientsGender,
        patientsBloodGroup,
        appointmentsDoctorId,
        appointmentsPatientId,
        appointmentsDate,
        doctorsSpecialization,
        doctorsIsActive,
        isCreating,
        isUpdating,
        isDeleting,
        operationError,
        operationSuccess,
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
