/// Legal Services Module
///
/// Comprehensive legal services management for law firms:
/// - Client management with contact details
/// - Case tracking with status and hearings
/// - Document management
/// - Billing and invoicing
///
/// @see server/core/legal/ for backend API endpoints
library legal;

export 'data/models/legal_models.dart';
export 'data/repositories/legal_repository.dart';
export 'bloc/legal_bloc.dart';
export 'pages/legal_dashboard_page.dart';
