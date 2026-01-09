/// Real Estate Module
///
/// Property and lead management for real estate:
/// - Property listings
/// - Lead tracking and CRM
/// - Site visit scheduling
/// - Agent management
/// - Document handling
library real_estate;

export 'domain/entities/property.dart';
export 'domain/entities/property_lead.dart';
export 'domain/entities/property_visit.dart';
export 'domain/entities/property_owner.dart';

export 'domain/repositories/real_estate_repository.dart';

export 'data/datasources/real_estate_remote_datasource.dart';
export 'data/repositories/real_estate_repository_impl.dart';
export 'data/models/real_estate_models.dart';

export 'presentation/bloc/real_estate_bloc.dart';
export 'presentation/bloc/real_estate_event.dart';
export 'presentation/bloc/real_estate_state.dart';

export 'presentation/pages/real_estate_dashboard_page.dart';
export 'presentation/pages/properties_page.dart';
export 'presentation/pages/property_detail_page.dart';
export 'presentation/pages/leads_page.dart';
export 'presentation/pages/site_visits_page.dart';
