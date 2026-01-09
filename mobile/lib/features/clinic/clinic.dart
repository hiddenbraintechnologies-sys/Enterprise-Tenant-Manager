/// Clinic/Healthcare Module
///
/// Healthcare management:
/// - Patient management
/// - Doctor profiles
/// - Appointments
/// - Medical records
/// - Prescriptions
library clinic;

export 'domain/entities/clinic_patient.dart';
export 'domain/entities/clinic_appointment.dart';
export 'domain/entities/clinic_doctor.dart';

export 'domain/repositories/clinic_repository.dart';

export 'data/datasources/clinic_remote_datasource.dart';
export 'data/repositories/clinic_repository_impl.dart';

export 'presentation/bloc/clinic_bloc.dart';
export 'presentation/bloc/clinic_event.dart';
export 'presentation/bloc/clinic_state.dart';

export 'presentation/pages/clinic_dashboard_page.dart';
export 'presentation/pages/patients_list_page.dart';
export 'presentation/pages/patient_detail_page.dart';
export 'presentation/pages/appointments_page.dart';
export 'presentation/pages/doctors_page.dart';
