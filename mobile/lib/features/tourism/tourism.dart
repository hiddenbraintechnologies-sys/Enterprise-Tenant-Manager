/// Tourism/Travel Module
///
/// Tour package and booking management:
/// - Package catalog with pricing
/// - Booking management
/// - Itinerary planning
/// - Customer management
library tourism;

export 'domain/entities/tour_package.dart';
export 'domain/entities/tour_booking.dart';
export 'domain/entities/tour_itinerary.dart';
export 'domain/entities/tour_customer.dart';

export 'domain/repositories/tourism_repository.dart';

export 'data/datasources/tourism_remote_datasource.dart';
export 'data/repositories/tourism_repository_impl.dart';
export 'data/models/tourism_models.dart';

export 'presentation/bloc/tourism_bloc.dart';
export 'presentation/bloc/tourism_event.dart';
export 'presentation/bloc/tourism_state.dart';

export 'presentation/pages/tourism_dashboard_page.dart';
export 'presentation/pages/packages_page.dart';
export 'presentation/pages/package_detail_page.dart';
export 'presentation/pages/bookings_page.dart';
export 'presentation/pages/customers_page.dart';
