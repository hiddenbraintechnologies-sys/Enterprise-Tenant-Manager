import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/tenant/presentation/bloc/tenant_bloc.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  bool _hasNavigated = false;

  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[SplashPage] $message');
    }
  }

  void _handleAuthState(BuildContext context, AuthState state) {
    if (_hasNavigated) return;
    
    _debugLog('Auth state changed: ${state.runtimeType}, isBootstrapped: ${state.isBootstrapped}');

    if (!state.isBootstrapped) {
      return;
    }

    if (state is AuthAuthenticated) {
      _debugLog('Authenticated - loading tenants');
      context.read<TenantBloc>().add(const TenantLoadRequested());
    } else if (state is AuthUnauthenticated) {
      _debugLog('Unauthenticated - navigating to login');
      _hasNavigated = true;
      context.go('/login');
    }
  }

  void _handleTenantState(BuildContext context, TenantState state) {
    if (_hasNavigated) return;
    
    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) return;

    _debugLog('Tenant state changed: ${state.runtimeType}');

    if (state is TenantLoaded) {
      _hasNavigated = true;
      if (state.currentTenant != null) {
        _debugLog('Tenant loaded: ${state.currentTenant!.name} - navigating to dashboard');
        context.go('/dashboard');
      } else {
        _debugLog('No current tenant - navigating to tenant selector');
        context.go('/select-tenant');
      }
    } else if (state is TenantError) {
      _debugLog('Tenant error: ${state.message} - navigating to tenant selector');
      _hasNavigated = true;
      context.go('/select-tenant');
    }
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<AuthBloc, AuthState>(
          listener: _handleAuthState,
        ),
        BlocListener<TenantBloc, TenantState>(
          listener: _handleTenantState,
        ),
      ],
      child: Scaffold(
        body: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Theme.of(context).colorScheme.primary,
                Theme.of(context).colorScheme.secondary,
              ],
            ),
          ),
          child: const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.business_center,
                  size: 80,
                  color: Colors.white,
                ),
                SizedBox(height: 24),
                Text(
                  'BizFlow',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Business Management Platform',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white70,
                  ),
                ),
                SizedBox(height: 48),
                CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
