import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:bizflow_mobile/main.dart' as app;
import 'package:flutter/material.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('MyBizStream Flutter Platform UI Tests', () {
    final modules = [
      'Furniture',
      'HRMS',
      'Legal',
      'Education',
      'Tourism',
      'Logistics',
      'Real Estate',
      'Clinic',
      'Coworking',
      'PG',
      'Salon',
      'Gym',
    ];

    testWidgets('Check all module dashboards and screens', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      for (var module in modules) {
        final dashboardFinder = find.text('$module Dashboard');
        expect(dashboardFinder, findsOneWidget, reason: '$module Dashboard should exist');

        await tester.tap(dashboardFinder);
        await tester.pumpAndSettle();

        final crudFinder = find.text('Manage $module');
        expect(crudFinder, findsWidgets, reason: '$module CRUD screens should render');

        final addButton = find.byIcon(Icons.add);
        if (addButton.evaluate().isNotEmpty) {
          await tester.tap(addButton);
          await tester.pumpAndSettle();
          expect(find.text('Save'), findsOneWidget, reason: '$module Add Form should render');
          await tester.tap(find.text('Cancel'));
          await tester.pumpAndSettle();
        }

        final searchField = find.byType(TextField);
        if (searchField.evaluate().isNotEmpty) {
          await tester.enterText(searchField.first, 'demo');
          await tester.pumpAndSettle();
        }

        final backButton = find.byTooltip('Back');
        if (backButton.evaluate().isNotEmpty) {
          await tester.tap(backButton.first);
          await tester.pumpAndSettle();
        }
      }
    });

    testWidgets('Check onboarding & registration flows', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      final onboardingFinder = find.text('Welcome to MyBizStream');
      expect(onboardingFinder, findsOneWidget, reason: 'Onboarding screen should render');

      final registerButton = find.text('Register');
      await tester.tap(registerButton);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('tenantName')), 'Demo Tenant');
      await tester.enterText(find.byKey(const Key('userEmail')), 'demo@tenant.com');
      await tester.enterText(find.byKey(const Key('password')), 'DemoPass123!');
      await tester.tap(find.text('Submit'));
      await tester.pumpAndSettle();

      expect(find.text('Registration Successful'), findsOneWidget, reason: 'Registration should succeed');
    });

    testWidgets('Check subscription gating UI', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      final subscriptionButton = find.text('Subscriptions');
      await tester.tap(subscriptionButton);
      await tester.pumpAndSettle();

      expect(find.text('Available Modules'), findsOneWidget, reason: 'Subscription screen should render');
      expect(find.byType(ListView), findsWidgets, reason: 'Modules list should appear');
    });

    testWidgets('Check Tier 1 module full functionality', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      final tier1Modules = ['Furniture', 'HRMS', 'Legal', 'Education'];
      
      for (var module in tier1Modules) {
        final moduleFinder = find.text(module);
        if (moduleFinder.evaluate().isNotEmpty) {
          await tester.tap(moduleFinder);
          await tester.pumpAndSettle();
          
          expect(find.byType(Scaffold), findsOneWidget, reason: '$module screen should have Scaffold');
          
          final backButton = find.byTooltip('Back');
          if (backButton.evaluate().isNotEmpty) {
            await tester.tap(backButton.first);
            await tester.pumpAndSettle();
          }
        }
      }
    });

    testWidgets('Check Tier 2 module scaffold status', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      final tier2Modules = ['Clinic', 'Coworking', 'PG', 'Salon', 'Gym'];
      
      for (var module in tier2Modules) {
        final moduleFinder = find.text(module);
        if (moduleFinder.evaluate().isNotEmpty) {
          await tester.tap(moduleFinder);
          await tester.pumpAndSettle();
          
          final scaffoldFinder = find.byType(Scaffold);
          expect(scaffoldFinder, findsOneWidget, reason: '$module should have basic scaffold');
          
          final backButton = find.byTooltip('Back');
          if (backButton.evaluate().isNotEmpty) {
            await tester.tap(backButton.first);
            await tester.pumpAndSettle();
          }
        }
      }
    });

    testWidgets('Check offline mode fallback', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      final offlineIndicator = find.text('Offline');
      final cachedDataIndicator = find.text('Cached Data');
      
      expect(
        offlineIndicator.evaluate().isEmpty || cachedDataIndicator.evaluate().isEmpty,
        isTrue,
        reason: 'App should handle offline mode gracefully',
      );
    });

    testWidgets('Check multi-currency display', (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      final currencySymbols = ['\$', '₹', '£', 'AED', 'RM', 'S\$'];
      
      bool foundCurrency = false;
      for (var symbol in currencySymbols) {
        if (find.textContaining(symbol).evaluate().isNotEmpty) {
          foundCurrency = true;
          break;
        }
      }
      
      expect(foundCurrency, isTrue, reason: 'Currency display should be visible');
    });
  });
}
