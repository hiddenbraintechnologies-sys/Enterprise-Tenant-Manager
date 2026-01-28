import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../core/di/injection.dart';
import '../core/notifications/deep_link_handler.dart';
import '../features/auth/presentation/bloc/auth_bloc.dart';
import '../features/auth/presentation/pages/login_page.dart';
import '../features/tenant/presentation/bloc/tenant_bloc.dart';
import '../features/tenant/presentation/pages/tenant_selector_page.dart';
import '../features/dashboard/presentation/pages/dashboard_page.dart';
import '../presentation/routes/app_router.dart';
import 'app_theme.dart';

class BizFlowApp extends StatefulWidget {
  const BizFlowApp({super.key});

  @override
  State<BizFlowApp> createState() => _BizFlowAppState();
}

class _BizFlowAppState extends State<BizFlowApp> {
  late final AuthBloc _authBloc;
  late final TenantBloc _tenantBloc;
  late final GoRouter _router;
  late final GoRouterRefreshStream _refreshStream;
  late final StreamSubscription<AuthState> _authSubscription;
  bool _tenantLoadTriggered = false;

  @override
  void initState() {
    super.initState();
    _authBloc = getIt<AuthBloc>();
    _tenantBloc = getIt<TenantBloc>();
    
    // Create refresh stream that triggers router updates on state changes
    _refreshStream = GoRouterRefreshStream(_authBloc, _tenantBloc);
    
    // Listen to auth state changes directly to trigger tenant loading
    // This subscription is set up BEFORE AuthCheckRequested is dispatched
    _authSubscription = _authBloc.stream.listen((state) {
      if (state is AuthAuthenticated && !_tenantLoadTriggered) {
        _debugLog('Auth authenticated detected - triggering tenant load');
        _tenantLoadTriggered = true;
        _tenantBloc.add(const TenantLoadRequested());
      } else if (state is AuthUnauthenticated) {
        _tenantLoadTriggered = false;
      }
    });
    
    // Create router with refresh listenable
    _router = GoRouter(
      initialLocation: '/splash',
      debugLogDiagnostics: kDebugMode,
      refreshListenable: _refreshStream,
      redirect: (context, state) => _guardRoute(state),
      routes: [
        GoRoute(
          path: '/splash',
          name: 'splash',
          builder: (context, state) => const _SplashScreen(),
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
    
    // Wire router to DeepLinkHandler for notifications/deep links
    getIt<DeepLinkHandler>().setRouter(_router);
    
    // Start bootstrap after initState completes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _debugLog('Post-frame callback - starting bootstrap');
      _authBloc.add(const AuthCheckRequested());
    });
  }

  void _debugLog(String message) {
    if (kDebugMode) {
      debugPrint('[BizFlowApp] $message');
    }
  }

  String? _guardRoute(GoRouterState state) {
    final authState = _authBloc.state;
    final tenantState = _tenantBloc.state;
    
    final currentLocation = state.matchedLocation;
    final isOnSplash = currentLocation == '/splash';
    final isOnLogin = currentLocation == '/login';
    final isOnTenantSelector = currentLocation == '/select-tenant';
    
    _debugLog('Guard: location=$currentLocation, auth=${authState.runtimeType}, tenant=${tenantState.runtimeType}, bootstrapped=${authState.isBootstrapped}');

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

  @override
  void dispose() {
    _authSubscription.cancel();
    _refreshStream.dispose();
    _authBloc.close();
    _tenantBloc.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: _authBloc),
        BlocProvider.value(value: _tenantBloc),
      ],
      child: MaterialApp.router(
        title: 'BizFlow',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        routerConfig: _router,
      ),
    );
  }
}

// Splash screen shown during bootstrap
class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
    );
  }
}
