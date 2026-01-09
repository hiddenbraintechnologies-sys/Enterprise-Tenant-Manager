/// Coworking Module
///
/// Coworking space management:
/// - Desk inventory
/// - Meeting rooms
/// - Members
/// - Bookings
library coworking;

export 'data/models/coworking_models.dart';
export 'data/datasources/coworking_remote_datasource.dart';
export 'data/repositories/coworking_repository_impl.dart';

export 'domain/entities/coworking_desk.dart';
export 'domain/entities/coworking_booking.dart';
export 'domain/entities/coworking_member.dart';
export 'domain/entities/coworking_meeting_room.dart';
export 'domain/repositories/coworking_repository.dart';

export 'presentation/bloc/coworking_bloc.dart';
export 'presentation/bloc/coworking_event.dart';
export 'presentation/bloc/coworking_state.dart';

export 'presentation/pages/coworking_dashboard_page.dart';
export 'presentation/pages/desks_page.dart';
export 'presentation/pages/bookings_page.dart';
export 'presentation/pages/members_page.dart';
export 'presentation/pages/meeting_rooms_page.dart';
