/// PG/Hostel Module
///
/// PG and hostel management:
/// - Room inventory
/// - Residents
/// - Rent collection
/// - Maintenance
library pg_hostel;

export 'data/models/pg_hostel_models.dart';
export 'data/datasources/pg_remote_datasource.dart';
export 'data/repositories/pg_repository_impl.dart';

export 'domain/entities/pg_room.dart';
export 'domain/entities/pg_resident.dart';
export 'domain/entities/pg_payment.dart';
export 'domain/entities/pg_maintenance.dart';
export 'domain/repositories/pg_repository.dart';

export 'presentation/bloc/pg_bloc.dart';
export 'presentation/bloc/pg_event.dart';
export 'presentation/bloc/pg_state.dart';

export 'presentation/pages/pg_dashboard_page.dart';
export 'presentation/pages/rooms_page.dart';
export 'presentation/pages/residents_page.dart';
export 'presentation/pages/payments_page.dart';
export 'presentation/pages/maintenance_page.dart';
