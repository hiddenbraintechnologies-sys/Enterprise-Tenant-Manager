import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
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

  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[TenantBloc] $message');
    }
  }

  Future<void> _onLoadRequested(
    TenantLoadRequested event,
    Emitter<TenantState> emit,
  ) async {
    _debugLog('=== TENANT LOAD START ===');
    emit(const TenantLoading());

    _debugLog('Step 1: Loading saved tenant from storage...');
    final currentTenant = await _tenantStorage.getCurrentTenant();
    _debugLog('Step 1 Result: savedTenant=${currentTenant?.name ?? "NULL"}');
    
    _debugLog('Step 2: Fetching tenants from API...');
    final result = await _getTenantsUseCase();
    
    result.fold(
      (failure) {
        _debugLog('=== TENANT LOAD ERROR: ${failure.message} ===');
        emit(TenantError(failure.message));
      },
      (tenants) {
        _debugLog('Step 2 Result: ${tenants.length} tenants fetched');
        
        Tenant? selected;
        if (currentTenant != null) {
          try {
            selected = tenants.firstWhere((t) => t.id == currentTenant.id);
            _debugLog('Step 3: Restored saved tenant: ${selected.name}');
          } catch (_) {
            selected = tenants.isNotEmpty ? tenants.first : null;
            _debugLog('Step 3: Saved tenant not found, using first: ${selected?.name ?? "NONE"}');
          }
        } else if (tenants.length == 1) {
          selected = tenants.first;
          _debugLog('Step 3: Only one tenant, auto-selecting: ${selected.name}');
        } else {
          _debugLog('Step 3: No saved tenant, ${tenants.length} available');
        }
        
        _debugLog('=== TENANT LOAD END: selected=${selected?.name ?? "NULL"} ===');
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
