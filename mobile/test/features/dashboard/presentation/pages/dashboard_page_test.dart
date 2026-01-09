import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:bizflow_mobile/domain/entities/subscription.dart';
import 'package:bizflow_mobile/features/dashboard/data/repositories/dashboard_repository.dart';
import 'package:bizflow_mobile/features/dashboard/presentation/bloc/dashboard_bloc.dart';

class MockDashboardBloc extends MockBloc<DashboardEvent, DashboardState>
    implements DashboardBloc {}

class MockDashboardRepository extends Mock implements DashboardRepository {}

class FakeDashboardEvent extends Fake implements DashboardEvent {}

class FakeDashboardState extends Fake implements DashboardState {}

void main() {
  setUpAll(() {
    registerFallbackValue(FakeDashboardEvent());
    registerFallbackValue(FakeDashboardState());
  });

  group('DashboardBloc with repository', () {
    late MockDashboardRepository mockRepository;

    setUp(() {
      mockRepository = MockDashboardRepository();
    });

    blocTest<DashboardBloc, DashboardState>(
      'emits loading then data when DashboardDataRequested is added',
      build: () {
        when(() => mockRepository.getDashboardData(
              tenantId: any(named: 'tenantId'),
              accessToken: any(named: 'accessToken'),
            )).thenAnswer((_) async => const DashboardData(
              tenantId: 'tenant_123',
              tenantName: 'Test Business',
              subscriptionTier: 'starter',
              enabledModules: [
                DashboardModule(
                  id: 'bookings',
                  name: 'Bookings',
                  description: '',
                  icon: 'calendar',
                  route: '/bookings',
                ),
              ],
              addonModules: [],
              navigationItems: [],
            ));
        return DashboardBloc(repository: mockRepository);
      },
      act: (bloc) => bloc.add(const DashboardDataRequested(
        tenantId: 'test-tenant',
        accessToken: 'test-token',
      )),
      expect: () => [
        isA<DashboardState>().having((s) => s.isLoading, 'isLoading', true),
        isA<DashboardState>()
            .having((s) => s.isLoading, 'isLoading', false)
            .having((s) => s.enabledModules.length, 'modules count', 1)
            .having((s) => s.tenantName, 'tenantName', 'Test Business'),
      ],
    );

    blocTest<DashboardBloc, DashboardState>(
      'emits error when DashboardDataRequested fails',
      build: () {
        when(() => mockRepository.getDashboardData(
              tenantId: any(named: 'tenantId'),
              accessToken: any(named: 'accessToken'),
            )).thenThrow(DashboardException(
              code: 'UNAUTHORIZED',
              message: 'Please log in again',
            ));
        return DashboardBloc(repository: mockRepository);
      },
      act: (bloc) => bloc.add(const DashboardDataRequested(
        tenantId: 'test-tenant',
        accessToken: 'test-token',
      )),
      expect: () => [
        isA<DashboardState>().having((s) => s.isLoading, 'isLoading', true),
        isA<DashboardState>()
            .having((s) => s.isLoading, 'isLoading', false)
            .having((s) => s.error, 'error', 'Please log in again')
            .having((s) => s.errorCode, 'errorCode', 'UNAUTHORIZED'),
      ],
    );

    blocTest<DashboardBloc, DashboardState>(
      'emits selected module when DashboardModuleSelected is added',
      build: () => DashboardBloc(repository: mockRepository),
      act: (bloc) => bloc.add(const DashboardModuleSelected('bookings')),
      expect: () => [
        const DashboardState(selectedModuleId: 'bookings'),
      ],
    );

    blocTest<DashboardBloc, DashboardState>(
      'checks module access when DashboardModuleAccessChecked is added',
      build: () {
        when(() => mockRepository.checkModuleAccess(
              tenantId: any(named: 'tenantId'),
              moduleId: any(named: 'moduleId'),
              accessToken: any(named: 'accessToken'),
            )).thenAnswer((_) async => const ModuleAccessResult(
              moduleId: 'analytics',
              allowed: false,
              upgradeMessage: 'Upgrade to Pro to access Analytics',
            ));
        return DashboardBloc(repository: mockRepository);
      },
      act: (bloc) => bloc.add(const DashboardModuleAccessChecked(
        tenantId: 'test-tenant',
        moduleId: 'analytics',
        accessToken: 'test-token',
      )),
      expect: () => [
        isA<DashboardState>().having(
          (s) => s.moduleAccessError,
          'moduleAccessError',
          'Upgrade to Pro to access Analytics',
        ),
      ],
    );
  });

  group('DashboardState', () {
    test('subscriptionLabel returns correct label for each tier', () {
      expect(
        const DashboardState(subscriptionTier: SubscriptionTier.free).subscriptionLabel,
        equals('Free Plan'),
      );
      expect(
        const DashboardState(subscriptionTier: SubscriptionTier.starter).subscriptionLabel,
        equals('Starter Plan'),
      );
      expect(
        const DashboardState(subscriptionTier: SubscriptionTier.pro).subscriptionLabel,
        equals('Pro Plan'),
      );
      expect(
        const DashboardState(subscriptionTier: SubscriptionTier.enterprise).subscriptionLabel,
        equals('Enterprise Plan'),
      );
    });

    test('selectedModule returns correct module when ID matches', () {
      final state = DashboardState(
        selectedModuleId: 'bookings',
        enabledModules: const [
          DashboardModule(
            id: 'bookings',
            name: 'Bookings',
            description: 'Manage appointments',
            icon: 'calendar',
            route: '/bookings',
          ),
          DashboardModule(
            id: 'customers',
            name: 'Customers',
            description: 'Customer management',
            icon: 'people',
            route: '/customers',
          ),
        ],
      );

      expect(state.selectedModule?.name, equals('Bookings'));
    });

    test('selectedModule returns null when no module is selected', () {
      const state = DashboardState();
      expect(state.selectedModule, isNull);
    });

    test('hasSubscription returns true for non-free tiers', () {
      expect(
        const DashboardState(subscriptionTier: SubscriptionTier.free).hasSubscription,
        isFalse,
      );
      expect(
        const DashboardState(subscriptionTier: SubscriptionTier.starter).hasSubscription,
        isTrue,
      );
    });

    test('requiresSubscriptionUpgrade returns true for specific error codes', () {
      expect(
        const DashboardState(errorCode: 'NO_SUBSCRIPTION').requiresSubscriptionUpgrade,
        isTrue,
      );
      expect(
        const DashboardState(errorCode: 'SUBSCRIPTION_EXPIRED').requiresSubscriptionUpgrade,
        isTrue,
      );
      expect(
        const DashboardState(errorCode: 'OTHER_ERROR').requiresSubscriptionUpgrade,
        isFalse,
      );
    });
  });

  group('DashboardModule', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': 'bookings',
        'name': 'Bookings',
        'description': 'Manage appointments',
        'icon': 'calendar',
        'route': '/bookings',
        'isEnabled': true,
      };

      final module = DashboardModule.fromJson(json);

      expect(module.id, equals('bookings'));
      expect(module.name, equals('Bookings'));
      expect(module.route, equals('/bookings'));
      expect(module.isEnabled, isTrue);
    });

    test('toJson serializes correctly', () {
      const module = DashboardModule(
        id: 'bookings',
        name: 'Bookings',
        description: 'Manage appointments',
        icon: 'calendar',
        route: '/bookings',
      );

      final json = module.toJson();

      expect(json['id'], equals('bookings'));
      expect(json['name'], equals('Bookings'));
    });
  });

  group('NavigationItem', () {
    test('fromJson parses correctly', () {
      final json = {
        'id': 'home',
        'label': 'Home',
        'icon': 'home',
        'route': '/',
      };

      final item = NavigationItem.fromJson(json);

      expect(item.id, equals('home'));
      expect(item.label, equals('Home'));
      expect(item.route, equals('/'));
    });
  });

  group('Module access based on subscription', () {
    test('starter tier has limited modules', () {
      final state = DashboardState(
        subscriptionTier: SubscriptionTier.starter,
        enabledModules: const [
          DashboardModule(
            id: 'bookings',
            name: 'Bookings',
            description: '',
            icon: 'calendar',
            route: '/bookings',
          ),
          DashboardModule(
            id: 'customers',
            name: 'Customers',
            description: '',
            icon: 'people',
            route: '/customers',
          ),
        ],
        addonModules: const [
          DashboardModule(
            id: 'analytics',
            name: 'Analytics',
            description: '',
            icon: 'analytics',
            route: '/analytics',
          ),
        ],
      );

      expect(state.enabledModules.length, equals(2));
      expect(state.addonModules.length, equals(1));
    });

    test('pro tier has more enabled modules', () {
      final state = DashboardState(
        subscriptionTier: SubscriptionTier.pro,
        enabledModules: const [
          DashboardModule(
            id: 'bookings',
            name: 'Bookings',
            description: '',
            icon: 'calendar',
            route: '/bookings',
          ),
          DashboardModule(
            id: 'customers',
            name: 'Customers',
            description: '',
            icon: 'people',
            route: '/customers',
          ),
          DashboardModule(
            id: 'analytics',
            name: 'Analytics',
            description: '',
            icon: 'analytics',
            route: '/analytics',
          ),
          DashboardModule(
            id: 'hrms',
            name: 'HR Management',
            description: '',
            icon: 'work',
            route: '/hr',
          ),
        ],
        addonModules: const [],
      );

      expect(state.enabledModules.length, equals(4));
      expect(state.addonModules.length, equals(0));
    });
  });
}
