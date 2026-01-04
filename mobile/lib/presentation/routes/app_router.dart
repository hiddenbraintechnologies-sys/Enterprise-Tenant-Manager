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
    debugLogDiagnostics: true,
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

  static String? _guardRoute(BuildContext context, GoRouterState state) {
    final authState = context.read<AuthBloc>().state;
    final tenantState = context.read<TenantBloc>().state;
    
    final isOnSplash = state.matchedLocation == '/splash';
    final isOnLogin = state.matchedLocation == '/login';
    final isOnTenantSelector = state.matchedLocation == '/select-tenant';
    
    if (authState is AuthInitial || authState is AuthLoading) {
      return isOnSplash ? null : '/splash';
    }
    
    if (authState is AuthUnauthenticated) {
      return isOnLogin ? null : '/login';
    }
    
    if (authState is AuthAuthenticated) {
      if (isOnLogin || isOnSplash) {
        if (tenantState is TenantLoaded && tenantState.currentTenant != null) {
          return '/dashboard';
        }
        return '/select-tenant';
      }
      
      if (tenantState is TenantLoaded && tenantState.currentTenant == null && !isOnTenantSelector) {
        return '/select-tenant';
      }
    }
    
    return null;
  }
}
