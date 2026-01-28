import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/tenant/presentation/bloc/tenant_bloc.dart';
import '../../features/tenant/presentation/pages/tenant_selector_page.dart';
import '../../features/dashboard/presentation/pages/dashboard_page.dart';
import '../pages/splash_page.dart';

class AppRouter {
  static final _rootNavigatorKey = GlobalKey<NavigatorState>();

  static final router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    debugLogDiagnostics: kDebugMode,
    redirect: _guardRoute,
    routes: [
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/select-tenant',
        name: 'selectTenant',
        builder: (context, state) => const TenantSelectorPage(),
      ),
      GoRoute(
        path: '/dashboard',
        name: 'dashboard',
        builder: (context, state) => const DashboardPage(),
      ),
    ],
  );

  static void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[AppRouter] $message');
    }
  }

  static String? _guardRoute(BuildContext context, GoRouterState state) {
    final authState = context.read<AuthBloc>().state;
    final tenantState = context.read<TenantBloc>().state;
    
    final currentLocation = state.matchedLocation;
    final isOnSplash = currentLocation == '/splash';
    final isOnLogin = currentLocation == '/login';
    final isOnTenantSelector = currentLocation == '/select-tenant';
    
    _debugLog('Guard: location=$currentLocation, auth=${authState.runtimeType}, bootstrapped=${authState.isBootstrapped}');

    // Wait for bootstrap to complete before making routing decisions
    if (!authState.isBootstrapped) {
      _debugLog('Not bootstrapped yet - staying on splash');
      return isOnSplash ? null : '/splash';
    }
    
    // After bootstrap, route based on auth state
    if (authState is AuthUnauthenticated || authState is AuthError) {
      _debugLog('Unauthenticated - redirect to login');
      return isOnLogin ? null : '/login';
    }
    
    if (authState is AuthAuthenticated) {
      // Wait for tenant state to be loaded before leaving splash
      if (tenantState is TenantInitial || tenantState is TenantLoading) {
        _debugLog('Tenant still loading - staying on splash');
        return isOnSplash ? null : '/splash';
      }
      
      // Don't stay on splash or login if authenticated
      if (isOnLogin || isOnSplash) {
        if (tenantState is TenantLoaded && tenantState.currentTenant != null) {
          _debugLog('Authenticated with tenant - redirect to dashboard');
          return '/dashboard';
        }
        _debugLog('Authenticated without tenant - redirect to tenant selector');
        return '/select-tenant';
      }
      
      // Ensure tenant is selected before accessing dashboard
      if (!isOnTenantSelector && tenantState is TenantLoaded && tenantState.currentTenant == null) {
        _debugLog('No tenant selected - redirect to tenant selector');
        return '/select-tenant';
      }
    }
    
    return null;
  }
}
