import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:bizflow_mobile/domain/entities/subscription.dart';
import 'package:bizflow_mobile/features/subscription/data/repositories/subscription_repository.dart';
import 'package:bizflow_mobile/features/subscription/presentation/bloc/subscription_bloc.dart';
import 'package:bizflow_mobile/features/subscription/presentation/pages/subscription_page.dart';

class MockSubscriptionBloc extends MockBloc<SubscriptionEvent, SubscriptionState>
    implements SubscriptionBloc {}

class MockSubscriptionRepository extends Mock implements SubscriptionRepository {}

class FakeSubscriptionEvent extends Fake implements SubscriptionEvent {}

class FakeSubscriptionState extends Fake implements SubscriptionState {}

void main() {
  setUpAll(() {
    registerFallbackValue(FakeSubscriptionEvent());
    registerFallbackValue(FakeSubscriptionState());
    registerFallbackValue(SubscriptionTier.free);
  });

  group('SubscriptionPage', () {
    late MockSubscriptionBloc mockBloc;

    setUp(() {
      mockBloc = MockSubscriptionBloc();
    });

    Widget createWidget() {
      return MaterialApp(
        home: BlocProvider<SubscriptionBloc>.value(
          value: mockBloc,
          child: const SubscriptionView(
            tenantId: 'test-tenant-id',
            accessToken: 'test-token',
          ),
        ),
      );
    }

    testWidgets('shows loading indicator when loading', (tester) async {
      when(() => mockBloc.state).thenReturn(const SubscriptionState(isLoading: true));

      await tester.pumpWidget(createWidget());

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows plan cards when loaded', (tester) async {
      when(() => mockBloc.state).thenReturn(SubscriptionState(
        isLoading: false,
        availablePlans: [
          const SubscriptionPlan(
            id: 'free',
            tier: SubscriptionTier.free,
            name: 'Free',
            description: 'Get started',
            features: ['1 User'],
            pricing: PricingDetails(
              basePrice: 0,
              finalPrice: 0,
              currency: 'USD',
              currencySymbol: '\$',
            ),
            modules: [],
          ),
          const SubscriptionPlan(
            id: 'starter',
            tier: SubscriptionTier.starter,
            name: 'Starter',
            description: 'For small businesses',
            features: ['5 Users'],
            pricing: PricingDetails(
              basePrice: 29,
              finalPrice: 29,
              currency: 'USD',
              currencySymbol: '\$',
              billingCycle: 'monthly',
            ),
            modules: [],
            isPopular: true,
          ),
        ],
      ));

      await tester.pumpWidget(createWidget());

      expect(find.text('Free'), findsOneWidget);
      expect(find.text('Starter'), findsOneWidget);
      expect(find.text('Popular'), findsOneWidget);
    });

    testWidgets('shows selected state for chosen plan', (tester) async {
      when(() => mockBloc.state).thenReturn(SubscriptionState(
        isLoading: false,
        selectedTier: SubscriptionTier.starter,
        availablePlans: [
          const SubscriptionPlan(
            id: 'starter',
            tier: SubscriptionTier.starter,
            name: 'Starter',
            description: 'For small businesses',
            features: [],
            pricing: PricingDetails(
              basePrice: 29,
              finalPrice: 29,
              currency: 'USD',
              currencySymbol: '\$',
            ),
            modules: [],
          ),
        ],
      ));

      await tester.pumpWidget(createWidget());

      expect(find.byIcon(Icons.check_circle), findsOneWidget);
    });

    testWidgets('dispatches SubscriptionTierSelected when plan is tapped', (tester) async {
      when(() => mockBloc.state).thenReturn(SubscriptionState(
        isLoading: false,
        availablePlans: [
          const SubscriptionPlan(
            id: 'starter',
            tier: SubscriptionTier.starter,
            name: 'Starter',
            description: 'For small businesses',
            features: [],
            pricing: PricingDetails(
              basePrice: 29,
              finalPrice: 29,
              currency: 'USD',
              currencySymbol: '\$',
            ),
            modules: [],
          ),
        ],
      ));

      await tester.pumpWidget(createWidget());
      await tester.tap(find.text('Starter'));

      verify(() => mockBloc.add(const SubscriptionTierSelected(SubscriptionTier.starter))).called(1);
    });

    testWidgets('shows error state with retry button', (tester) async {
      when(() => mockBloc.state).thenReturn(const SubscriptionState(
        isLoading: false,
        error: 'Failed to load plans',
        availablePlans: [],
      ));

      await tester.pumpWidget(createWidget());

      expect(find.text('Failed to load plans'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });

  group('SubscriptionBloc with repository', () {
    late MockSubscriptionRepository mockRepository;

    setUp(() {
      mockRepository = MockSubscriptionRepository();
    });

    blocTest<SubscriptionBloc, SubscriptionState>(
      'emits plans when SubscriptionPlansRequested is added',
      build: () {
        when(() => mockRepository.getPlans(country: any(named: 'country')))
            .thenAnswer((_) async => [
                  const SubscriptionPlan(
                    id: 'free',
                    tier: SubscriptionTier.free,
                    name: 'Free',
                    description: '',
                    features: [],
                    pricing: PricingDetails(
                      basePrice: 0,
                      finalPrice: 0,
                      currency: 'USD',
                      currencySymbol: '\$',
                    ),
                    modules: [],
                  ),
                ]);
        return SubscriptionBloc(repository: mockRepository);
      },
      act: (bloc) => bloc.add(const SubscriptionPlansRequested(country: 'usa')),
      expect: () => [
        isA<SubscriptionState>().having((s) => s.isLoading, 'isLoading', true),
        isA<SubscriptionState>()
            .having((s) => s.isLoading, 'isLoading', false)
            .having((s) => s.availablePlans.length, 'plans count', 1),
      ],
    );

    blocTest<SubscriptionBloc, SubscriptionState>(
      'emits selected tier when SubscriptionTierSelected is added',
      build: () => SubscriptionBloc(repository: mockRepository),
      act: (bloc) => bloc.add(const SubscriptionTierSelected(SubscriptionTier.pro)),
      expect: () => [
        const SubscriptionState(selectedTier: SubscriptionTier.pro),
      ],
    );

    blocTest<SubscriptionBloc, SubscriptionState>(
      'emits success when SubscriptionConfirmed succeeds',
      build: () {
        when(() => mockRepository.selectSubscription(
              tenantId: any(named: 'tenantId'),
              tier: any(named: 'tier'),
              country: any(named: 'country'),
              accessToken: any(named: 'accessToken'),
            )).thenAnswer((_) async => SubscriptionSelectionResult(
              subscription: Subscription(
                id: 'sub_123',
                tenantId: 'tenant_123',
                tier: SubscriptionTier.starter,
                startDate: DateTime.now(),
                isActive: true,
                pricing: const PricingDetails(
                  basePrice: 29,
                  finalPrice: 29,
                  currency: 'USD',
                  currencySymbol: '\$',
                ),
                modules: [],
              ),
              plan: const SubscriptionPlan(
                id: 'starter',
                tier: SubscriptionTier.starter,
                name: 'Starter',
                description: '',
                features: [],
                pricing: PricingDetails(
                  basePrice: 29,
                  finalPrice: 29,
                  currency: 'USD',
                  currencySymbol: '\$',
                ),
                modules: [],
              ),
              enabledModules: [],
              nextStep: '/dashboard',
            ));
        return SubscriptionBloc(repository: mockRepository);
      },
      seed: () => const SubscriptionState(selectedTier: SubscriptionTier.starter),
      act: (bloc) => bloc.add(const SubscriptionConfirmed(
        tenantId: 'test-tenant',
        accessToken: 'test-token',
      )),
      expect: () => [
        isA<SubscriptionState>().having((s) => s.isSubmitting, 'isSubmitting', true),
        isA<SubscriptionState>()
            .having((s) => s.isSubmitting, 'isSubmitting', false)
            .having((s) => s.isSuccess, 'isSuccess', true)
            .having((s) => s.activeSubscription, 'subscription', isNotNull),
      ],
    );

    blocTest<SubscriptionBloc, SubscriptionState>(
      'emits error when SubscriptionConfirmed fails',
      build: () {
        when(() => mockRepository.selectSubscription(
              tenantId: any(named: 'tenantId'),
              tier: any(named: 'tier'),
              country: any(named: 'country'),
              accessToken: any(named: 'accessToken'),
            )).thenThrow(SubscriptionException(
              code: 'FORBIDDEN',
              message: 'Access denied',
            ));
        return SubscriptionBloc(repository: mockRepository);
      },
      seed: () => const SubscriptionState(selectedTier: SubscriptionTier.starter),
      act: (bloc) => bloc.add(const SubscriptionConfirmed(
        tenantId: 'test-tenant',
        accessToken: 'test-token',
      )),
      expect: () => [
        isA<SubscriptionState>().having((s) => s.isSubmitting, 'isSubmitting', true),
        isA<SubscriptionState>()
            .having((s) => s.isSubmitting, 'isSubmitting', false)
            .having((s) => s.error, 'error', 'Access denied'),
      ],
    );
  });

  group('SubscriptionState', () {
    test('selectedPlan returns correct plan when tier is selected', () {
      final state = SubscriptionState(
        selectedTier: SubscriptionTier.starter,
        availablePlans: [
          const SubscriptionPlan(
            id: 'free',
            tier: SubscriptionTier.free,
            name: 'Free',
            description: '',
            features: [],
            pricing: PricingDetails(
              basePrice: 0,
              finalPrice: 0,
              currency: 'USD',
              currencySymbol: '\$',
            ),
            modules: [],
          ),
          const SubscriptionPlan(
            id: 'starter',
            tier: SubscriptionTier.starter,
            name: 'Starter',
            description: '',
            features: [],
            pricing: PricingDetails(
              basePrice: 29,
              finalPrice: 29,
              currency: 'USD',
              currencySymbol: '\$',
            ),
            modules: [],
          ),
        ],
      );

      expect(state.selectedPlan?.name, equals('Starter'));
    });

    test('selectedPlan returns null when no tier is selected', () {
      const state = SubscriptionState();
      expect(state.selectedPlan, isNull);
    });
  });
}
