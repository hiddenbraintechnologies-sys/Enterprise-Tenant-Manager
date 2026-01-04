part of 'tenant_bloc.dart';

abstract class TenantEvent extends Equatable {
  const TenantEvent();

  @override
  List<Object?> get props => [];
}

class TenantLoadRequested extends TenantEvent {
  const TenantLoadRequested();
}

class TenantSelected extends TenantEvent {
  final String tenantId;

  const TenantSelected(this.tenantId);

  @override
  List<Object?> get props => [tenantId];
}

class TenantCleared extends TenantEvent {
  const TenantCleared();
}
