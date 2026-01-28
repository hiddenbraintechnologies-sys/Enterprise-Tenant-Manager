import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/tenant/presentation/bloc/tenant_bloc.dart';

/// Listenable that triggers GoRouter refresh when auth or tenant state changes
class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<AuthState> _authSubscription;
  late final StreamSubscription<TenantState> _tenantSubscription;

  GoRouterRefreshStream(AuthBloc authBloc, TenantBloc tenantBloc) {
    _authSubscription = authBloc.stream.listen((_) {
      _debugLog('Auth state changed - triggering router refresh');
      notifyListeners();
    });
    _tenantSubscription = tenantBloc.stream.listen((_) {
      _debugLog('Tenant state changed - triggering router refresh');
      notifyListeners();
    });
  }

  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[GoRouterRefresh] $message');
    }
  }

  @override
  void dispose() {
    _authSubscription.cancel();
    _tenantSubscription.cancel();
    super.dispose();
  }
}
