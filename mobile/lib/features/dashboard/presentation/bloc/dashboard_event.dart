part of 'dashboard_bloc.dart';

abstract class DashboardEvent extends Equatable {
  const DashboardEvent();

  @override
  List<Object?> get props => [];
}

class DashboardDataRequested extends DashboardEvent {
  final String tenantId;
  final String accessToken;

  const DashboardDataRequested({
    required this.tenantId,
    required this.accessToken,
  });

  @override
  List<Object?> get props => [tenantId, accessToken];
}

class DashboardModuleSelected extends DashboardEvent {
  final String moduleId;

  const DashboardModuleSelected(this.moduleId);

  @override
  List<Object?> get props => [moduleId];
}

class DashboardModuleAccessChecked extends DashboardEvent {
  final String tenantId;
  final String moduleId;
  final String accessToken;

  const DashboardModuleAccessChecked({
    required this.tenantId,
    required this.moduleId,
    required this.accessToken,
  });

  @override
  List<Object?> get props => [tenantId, moduleId, accessToken];
}

class DashboardRefreshed extends DashboardEvent {
  final String tenantId;
  final String accessToken;

  const DashboardRefreshed({
    required this.tenantId,
    required this.accessToken,
  });

  @override
  List<Object?> get props => [tenantId, accessToken];
}
