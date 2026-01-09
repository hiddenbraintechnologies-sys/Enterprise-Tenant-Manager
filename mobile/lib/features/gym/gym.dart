/// Gym/Fitness Module
///
/// Fitness center management:
/// - Member management
/// - Memberships
/// - Trainers
/// - Classes
/// - Attendance tracking
library gym;

export 'data/models/gym_models.dart';
export 'data/datasources/gym_remote_datasource.dart';
export 'data/repositories/gym_repository_impl.dart';

export 'domain/entities/gym_member.dart';
export 'domain/entities/gym_subscription.dart';
export 'domain/entities/gym_trainer.dart';
export 'domain/entities/gym_attendance.dart';
export 'domain/repositories/gym_repository.dart';

export 'presentation/bloc/gym_bloc.dart';
export 'presentation/bloc/gym_event.dart';
export 'presentation/bloc/gym_state.dart';

export 'presentation/pages/gym_dashboard_page.dart';
export 'presentation/pages/members_page.dart';
export 'presentation/pages/member_detail_page.dart';
export 'presentation/pages/subscriptions_page.dart';
export 'presentation/pages/trainers_page.dart';
export 'presentation/pages/attendance_page.dart';
