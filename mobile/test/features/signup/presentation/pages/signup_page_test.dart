import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:bizflow_mobile/features/signup/data/repositories/signup_repository.dart';
import 'package:bizflow_mobile/features/signup/presentation/bloc/signup_bloc.dart';
import 'package:bizflow_mobile/features/signup/presentation/pages/signup_page.dart';

class MockSignupBloc extends MockBloc<SignupEvent, SignupState>
    implements SignupBloc {}

class MockSignupRepository extends Mock implements SignupRepository {}

class FakeSignupEvent extends Fake implements SignupEvent {}

class FakeSignupState extends Fake implements SignupState {}

void main() {
  setUpAll(() {
    registerFallbackValue(FakeSignupEvent());
    registerFallbackValue(FakeSignupState());
  });

  group('SignupPage', () {
    late MockSignupBloc mockBloc;

    setUp(() {
      mockBloc = MockSignupBloc();
    });

    Widget createWidget() {
      return MaterialApp(
        home: BlocProvider<SignupBloc>.value(
          value: mockBloc,
          child: const SignupView(),
        ),
      );
    }

    testWidgets('renders SignupPage with stepper', (tester) async {
      when(() => mockBloc.state).thenReturn(const SignupState());

      await tester.pumpWidget(createWidget());

      expect(find.byType(Stepper), findsOneWidget);
      expect(find.text('Business Information'), findsOneWidget);
      expect(find.text('Admin Account'), findsOneWidget);
    });

    testWidgets('renders business name field', (tester) async {
      when(() => mockBloc.state).thenReturn(const SignupState());

      await tester.pumpWidget(createWidget());

      expect(find.text('Business Name'), findsOneWidget);
    });

    testWidgets('renders business type dropdown', (tester) async {
      when(() => mockBloc.state).thenReturn(const SignupState());

      await tester.pumpWidget(createWidget());

      expect(find.text('Business Type'), findsOneWidget);
    });

    testWidgets('shows Continue button on step 1', (tester) async {
      when(() => mockBloc.state).thenReturn(const SignupState(currentStep: 0));

      await tester.pumpWidget(createWidget());

      expect(find.text('Continue'), findsOneWidget);
    });

    testWidgets('shows Create Account button on step 2', (tester) async {
      when(() => mockBloc.state).thenReturn(const SignupState(currentStep: 1));

      await tester.pumpWidget(createWidget());

      expect(find.text('Create Account'), findsOneWidget);
    });

    testWidgets('shows loading indicator when submitting', (tester) async {
      when(() => mockBloc.state).thenReturn(const SignupState(
        currentStep: 1,
        isLoading: true,
      ));

      await tester.pumpWidget(createWidget());

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('dispatches TenantInfoChanged when business name changes', (tester) async {
      when(() => mockBloc.state).thenReturn(const SignupState());

      await tester.pumpWidget(createWidget());

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Business Name'),
        'My Business',
      );

      verify(() => mockBloc.add(const SignupTenantInfoChanged(tenantName: 'My Business'))).called(1);
    });
  });

  group('SignupBloc with repository', () {
    late MockSignupRepository mockRepository;

    setUp(() {
      mockRepository = MockSignupRepository();
    });

    blocTest<SignupBloc, SignupState>(
      'emits step change when SignupStepChanged is added',
      build: () => SignupBloc(repository: mockRepository),
      act: (bloc) => bloc.add(const SignupStepChanged(1)),
      expect: () => [const SignupState(currentStep: 1)],
    );

    blocTest<SignupBloc, SignupState>(
      'emits tenant info when SignupTenantInfoChanged is added',
      build: () => SignupBloc(repository: mockRepository),
      act: (bloc) => bloc.add(const SignupTenantInfoChanged(
        tenantName: 'Test Business',
        businessType: 'salon',
      )),
      expect: () => [
        const SignupState(
          tenantName: 'Test Business',
          businessType: 'salon',
        ),
      ],
    );

    blocTest<SignupBloc, SignupState>(
      'emits admin info when SignupAdminInfoChanged is added',
      build: () => SignupBloc(repository: mockRepository),
      act: (bloc) => bloc.add(const SignupAdminInfoChanged(
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      )),
      expect: () => [
        const SignupState(
          adminFirstName: 'John',
          adminLastName: 'Doe',
          adminEmail: 'john@example.com',
        ),
      ],
    );

    blocTest<SignupBloc, SignupState>(
      'emits loading then success when SignupSubmitted succeeds',
      build: () {
        when(() => mockRepository.signup(
              tenantName: any(named: 'tenantName'),
              subdomain: any(named: 'subdomain'),
              businessType: any(named: 'businessType'),
              country: any(named: 'country'),
              adminFirstName: any(named: 'adminFirstName'),
              adminLastName: any(named: 'adminLastName'),
              adminEmail: any(named: 'adminEmail'),
              adminPassword: any(named: 'adminPassword'),
              adminPhone: any(named: 'adminPhone'),
            )).thenAnswer((_) async => const SignupResult(
              accessToken: 'test_token',
              refreshToken: 'refresh_token',
              tenantId: 'tenant_123',
              tenantName: 'Test',
              userId: 'user_123',
              userEmail: 'john@example.com',
              nextStep: '/subscription/select',
            ));

        return SignupBloc(repository: mockRepository);
      },
      seed: () => const SignupState(
        tenantName: 'Test',
        businessType: 'salon',
        country: 'india',
        adminFirstName: 'John',
        adminLastName: 'Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'Password123!',
      ),
      act: (bloc) => bloc.add(const SignupSubmitted()),
      expect: () => [
        isA<SignupState>().having((s) => s.isLoading, 'isLoading', true),
        isA<SignupState>()
            .having((s) => s.isLoading, 'isLoading', false)
            .having((s) => s.isSuccess, 'isSuccess', true)
            .having((s) => s.accessToken, 'accessToken', 'test_token')
            .having((s) => s.tenantId, 'tenantId', 'tenant_123'),
      ],
    );

    blocTest<SignupBloc, SignupState>(
      'emits error when SignupSubmitted fails',
      build: () {
        when(() => mockRepository.signup(
              tenantName: any(named: 'tenantName'),
              subdomain: any(named: 'subdomain'),
              businessType: any(named: 'businessType'),
              country: any(named: 'country'),
              adminFirstName: any(named: 'adminFirstName'),
              adminLastName: any(named: 'adminLastName'),
              adminEmail: any(named: 'adminEmail'),
              adminPassword: any(named: 'adminPassword'),
              adminPhone: any(named: 'adminPhone'),
            )).thenThrow(SignupException(
              code: 'EMAIL_EXISTS',
              message: 'Email already exists',
            ));

        return SignupBloc(repository: mockRepository);
      },
      seed: () => const SignupState(
        tenantName: 'Test',
        businessType: 'salon',
        country: 'india',
        adminFirstName: 'John',
        adminLastName: 'Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'Password123!',
      ),
      act: (bloc) => bloc.add(const SignupSubmitted()),
      expect: () => [
        isA<SignupState>().having((s) => s.isLoading, 'isLoading', true),
        isA<SignupState>()
            .having((s) => s.isLoading, 'isLoading', false)
            .having((s) => s.error, 'error', 'Email already exists')
            .having((s) => s.errorCode, 'errorCode', 'EMAIL_EXISTS'),
      ],
    );

    blocTest<SignupBloc, SignupState>(
      'resets state when SignupReset is added',
      build: () => SignupBloc(repository: mockRepository),
      seed: () => const SignupState(
        tenantName: 'Test',
        businessType: 'salon',
      ),
      act: (bloc) => bloc.add(const SignupReset()),
      expect: () => [const SignupState()],
    );
  });

  group('SignupState validation', () {
    test('isStep1Valid returns true when required fields are filled', () {
      const state = SignupState(
        tenantName: 'Test Business',
        businessType: 'salon',
        country: 'india',
      );
      expect(state.isStep1Valid, isTrue);
    });

    test('isStep1Valid returns false when tenantName is empty', () {
      const state = SignupState(
        tenantName: '',
        businessType: 'salon',
        country: 'india',
      );
      expect(state.isStep1Valid, isFalse);
    });

    test('isStep2Valid returns true when admin fields are valid', () {
      const state = SignupState(
        adminFirstName: 'John',
        adminLastName: 'Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'Password123!',
      );
      expect(state.isStep2Valid, isTrue);
    });

    test('isStep2Valid returns false when password is too short', () {
      const state = SignupState(
        adminFirstName: 'John',
        adminLastName: 'Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'short',
      );
      expect(state.isStep2Valid, isFalse);
    });

    test('canSubmit returns true when all fields are valid', () {
      const state = SignupState(
        tenantName: 'Test Business',
        businessType: 'salon',
        country: 'india',
        adminFirstName: 'John',
        adminLastName: 'Doe',
        adminEmail: 'john@example.com',
        adminPassword: 'Password123!',
      );
      expect(state.canSubmit, isTrue);
    });
  });
}
