/// Salon/Spa Module
///
/// Salon and spa management:
/// - Service catalog
/// - Staff scheduling
/// - Appointments
/// - Memberships
library salon;

export 'data/models/salon_models.dart';
export 'data/datasources/salon_remote_datasource.dart';
export 'data/repositories/salon_repository_impl.dart';

export 'domain/entities/salon_service.dart';
export 'domain/entities/salon_appointment.dart';
export 'domain/entities/salon_staff.dart';
export 'domain/entities/salon_customer.dart';
export 'domain/repositories/salon_repository.dart';

export 'presentation/bloc/salon_bloc.dart';
export 'presentation/bloc/salon_event.dart';
export 'presentation/bloc/salon_state.dart';

export 'presentation/pages/salon_dashboard_page.dart';
export 'presentation/pages/services_page.dart';
export 'presentation/pages/appointments_page.dart';
export 'presentation/pages/staff_page.dart';
export 'presentation/pages/customers_page.dart';
