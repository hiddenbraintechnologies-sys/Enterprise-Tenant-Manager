part of 'tenant_bloc.dart';

abstract class TenantState extends Equatable {
  final List<Tenant> tenants;
  
  const TenantState({this.tenants = const []});

  @override
  List<Object?> get props => [tenants];
}

class TenantInitial extends TenantState {
  const TenantInitial();
}

class TenantLoading extends TenantState {
  const TenantLoading({super.tenants});
}

class TenantLoaded extends TenantState {
  final Tenant? currentTenant;

  const TenantLoaded({
    required super.tenants,
    this.currentTenant,
  });

  bool get hasTenant => currentTenant != null;

  @override
  List<Object?> get props => [tenants, currentTenant];
}

class TenantError extends TenantState {
  final String message;

  const TenantError(this.message, {super.tenants});

  @override
  List<Object?> get props => [message, tenants];
}
