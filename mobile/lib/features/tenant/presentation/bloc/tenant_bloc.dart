import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/storage/tenant_storage.dart';
import '../../../../domain/entities/tenant.dart';
import '../../../../domain/usecases/get_tenants_usecase.dart';
import '../../../../domain/usecases/select_tenant_usecase.dart';

part 'tenant_event.dart';
part 'tenant_state.dart';

class TenantBloc extends Bloc<TenantEvent, TenantState> {
  final GetTenantsUseCase _getTenantsUseCase;
  final SelectTenantUseCase _selectTenantUseCase;
  final TenantStorage _tenantStorage;

  TenantBloc({
    required GetTenantsUseCase getTenantsUseCase,
    required SelectTenantUseCase selectTenantUseCase,
    required TenantStorage tenantStorage,
  })  : _getTenantsUseCase = getTenantsUseCase,
        _selectTenantUseCase = selectTenantUseCase,
        _tenantStorage = tenantStorage,
        super(const TenantInitial()) {
    on<TenantLoadRequested>(_onLoadRequested);
    on<TenantSelected>(_onTenantSelected);
    on<TenantCleared>(_onTenantCleared);
  }

  Future<void> _onLoadRequested(
    TenantLoadRequested event,
    Emitter<TenantState> emit,
  ) async {
    emit(const TenantLoading());

    final currentTenant = await _tenantStorage.getCurrentTenant();
    
    final result = await _getTenantsUseCase();
    
    result.fold(
      (failure) => emit(TenantError(failure.message)),
      (tenants) {
        Tenant? selected;
        if (currentTenant != null) {
          try {
            selected = tenants.firstWhere((t) => t.id == currentTenant.id);
          } catch (_) {
            selected = tenants.isNotEmpty ? tenants.first : null;
          }
        } else if (tenants.length == 1) {
          selected = tenants.first;
        }
        
        emit(TenantLoaded(
          tenants: tenants,
          currentTenant: selected,
        ));
      },
    );
  }

  Future<void> _onTenantSelected(
    TenantSelected event,
    Emitter<TenantState> emit,
  ) async {
    final currentState = state;
    if (currentState is! TenantLoaded) return;

    emit(TenantLoading(tenants: currentState.tenants));

    final result = await _selectTenantUseCase(event.tenantId);
    
    result.fold(
      (failure) => emit(TenantError(failure.message, tenants: currentState.tenants)),
      (tenant) => emit(TenantLoaded(
        tenants: currentState.tenants,
        currentTenant: tenant,
      )),
    );
  }

  Future<void> _onTenantCleared(
    TenantCleared event,
    Emitter<TenantState> emit,
  ) async {
    await _tenantStorage.clearCurrentTenant();
    
    final currentState = state;
    if (currentState is TenantLoaded) {
      emit(TenantLoaded(
        tenants: currentState.tenants,
        currentTenant: null,
      ));
    }
  }
}
