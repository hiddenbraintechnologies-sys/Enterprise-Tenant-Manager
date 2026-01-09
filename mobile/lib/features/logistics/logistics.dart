/// Logistics Module
///
/// Fleet and shipment management:
/// - Vehicle tracking
/// - Driver management
/// - Trip planning
/// - Shipment tracking
/// - Route optimization
library logistics;

export 'data/models/logistics_models.dart';

export 'domain/entities/logistics_order.dart';
export 'domain/entities/logistics_vehicle.dart';
export 'domain/entities/logistics_driver.dart';
export 'domain/entities/logistics_tracking.dart';

export 'domain/repositories/logistics_repository.dart';

export 'data/datasources/logistics_remote_datasource.dart';
export 'data/repositories/logistics_repository_impl.dart';

export 'presentation/bloc/logistics_bloc.dart';
export 'presentation/bloc/logistics_event.dart';
export 'presentation/bloc/logistics_state.dart';

export 'presentation/pages/logistics_dashboard_page.dart';
export 'presentation/pages/orders_page.dart';
export 'presentation/pages/order_detail_page.dart';
export 'presentation/pages/vehicles_page.dart';
export 'presentation/pages/drivers_page.dart';
