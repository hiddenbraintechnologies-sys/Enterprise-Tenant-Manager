/// HRMS Module - Human Resource Management System for MyBizStream
///
/// This module provides comprehensive HR functionality for multi-tenant SaaS:
///
/// ## Features
/// - **Dashboard**: Workforce stats, pending leaves, recent employees
/// - **Employee Directory**: Search, filter, pagination, CRUD operations
/// - **Attendance**: Check-in/out, date navigation, summary stats
/// - **Leave Management**: Apply, approve/reject, balances, types
/// - **Payroll**: Salary structures, payroll processing, month selector
///
/// ## Architecture
/// Uses BLoC pattern for state management with clean separation:
/// - `data/models/` - Data models matching backend API
/// - `data/repositories/` - API communication layer
/// - `bloc/` - Business logic and state management
/// - Pages - UI components with BLoC integration
///
/// ## Usage
/// ```dart
/// import 'package:mybizstream/features/hrms/hrms.dart';
///
/// // Access HrDashboardPage, EmployeeDirectoryPage, etc.
/// Navigator.push(context, MaterialPageRoute(builder: (_) => HrDashboardPage()));
/// ```
///
/// ## API Integration
/// All API calls go through HrRepository which handles:
/// - Authentication headers (tenant context)
/// - Error handling and response parsing
/// - Pagination for list endpoints
///
/// @see server/routes/hrms/ for backend API endpoints

library hrms;

export 'data/models/hr_models.dart';
export 'data/repositories/hr_repository.dart';
export 'bloc/hr_dashboard_bloc.dart';
export 'bloc/employee_bloc.dart';
export 'bloc/attendance_bloc.dart';
export 'bloc/leave_bloc.dart';
export 'bloc/payroll_bloc.dart';
export 'dashboard/hr_dashboard_page.dart';
export 'employee_directory/employee_directory_page.dart';
export 'employee_directory/add_edit_employee_page.dart';
export 'attendance/attendance_page.dart';
export 'leave/leave_page.dart';
export 'payroll/payroll_page.dart';
