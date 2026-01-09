import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/repositories/signup_repository.dart';
import '../bloc/signup_bloc.dart';

class SignupPage extends StatelessWidget {
  final SignupRepository repository;

  const SignupPage({
    super.key,
    required this.repository,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => SignupBloc(repository: repository),
      child: const SignupView(),
    );
  }
}

class SignupView extends StatelessWidget {
  const SignupView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Your Business'),
        centerTitle: true,
      ),
      body: BlocConsumer<SignupBloc, SignupState>(
        listener: (context, state) {
          if (state.isSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Account created successfully!'),
                backgroundColor: Colors.green,
              ),
            );
            Navigator.of(context).pushReplacementNamed(
              state.nextStep ?? '/subscription/select',
              arguments: {
                'tenantId': state.tenantId,
                'accessToken': state.accessToken,
                'refreshToken': state.refreshToken,
                'country': state.country,
              },
            );
          }
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.error!),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        builder: (context, state) {
          return Stepper(
            currentStep: state.currentStep,
            onStepContinue: () {
              if (state.currentStep == 0 && state.isStep1Valid) {
                context.read<SignupBloc>().add(const SignupStepChanged(1));
              } else if (state.currentStep == 1 && state.canSubmit) {
                context.read<SignupBloc>().add(const SignupSubmitted());
              }
            },
            onStepCancel: () {
              if (state.currentStep > 0) {
                context.read<SignupBloc>().add(SignupStepChanged(state.currentStep - 1));
              }
            },
            controlsBuilder: (context, details) {
              return Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Row(
                  children: [
                    ElevatedButton(
                      onPressed: state.isLoading ? null : details.onStepContinue,
                      child: state.isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(state.currentStep == 1 ? 'Create Account' : 'Continue'),
                    ),
                    const SizedBox(width: 12),
                    if (state.currentStep > 0)
                      TextButton(
                        onPressed: state.isLoading ? null : details.onStepCancel,
                        child: const Text('Back'),
                      ),
                  ],
                ),
              );
            },
            steps: [
              Step(
                title: const Text('Business Information'),
                subtitle: const Text('Tell us about your business'),
                isActive: state.currentStep >= 0,
                state: state.currentStep > 0 ? StepState.complete : StepState.indexed,
                content: const _BusinessInfoStep(),
              ),
              Step(
                title: const Text('Admin Account'),
                subtitle: const Text('Create your admin credentials'),
                isActive: state.currentStep >= 1,
                state: state.currentStep > 1 ? StepState.complete : StepState.indexed,
                content: const _AdminInfoStep(),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _BusinessInfoStep extends StatelessWidget {
  const _BusinessInfoStep();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SignupBloc, SignupState>(
      builder: (context, state) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              initialValue: state.tenantName,
              decoration: const InputDecoration(
                labelText: 'Business Name',
                hintText: 'Enter your business name',
                prefixIcon: Icon(Icons.business),
              ),
              onChanged: (value) {
                context.read<SignupBloc>().add(SignupTenantInfoChanged(tenantName: value));
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              initialValue: state.subdomain,
              decoration: const InputDecoration(
                labelText: 'Subdomain (Optional)',
                hintText: 'your-business',
                prefixIcon: Icon(Icons.link),
                suffixText: '.mybizstream.com',
              ),
              onChanged: (value) {
                context.read<SignupBloc>().add(SignupTenantInfoChanged(subdomain: value));
              },
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: state.businessType.isNotEmpty ? state.businessType : null,
              decoration: const InputDecoration(
                labelText: 'Business Type',
                prefixIcon: Icon(Icons.category),
              ),
              items: const [
                DropdownMenuItem(value: 'salon', child: Text('Salon & Spa')),
                DropdownMenuItem(value: 'clinic', child: Text('Clinic / Healthcare')),
                DropdownMenuItem(value: 'coworking', child: Text('Coworking Space')),
                DropdownMenuItem(value: 'gym', child: Text('Gym & Fitness')),
                DropdownMenuItem(value: 'education', child: Text('Education / Training')),
                DropdownMenuItem(value: 'service', child: Text('General Service')),
                DropdownMenuItem(value: 'real_estate', child: Text('Real Estate')),
                DropdownMenuItem(value: 'legal', child: Text('Legal Services')),
                DropdownMenuItem(value: 'furniture', child: Text('Furniture Manufacturing')),
              ],
              onChanged: (value) {
                if (value != null) {
                  context.read<SignupBloc>().add(SignupTenantInfoChanged(businessType: value));
                }
              },
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: state.country,
              decoration: const InputDecoration(
                labelText: 'Country',
                prefixIcon: Icon(Icons.public),
              ),
              items: const [
                DropdownMenuItem(value: 'india', child: Text('India')),
                DropdownMenuItem(value: 'uae', child: Text('UAE')),
                DropdownMenuItem(value: 'usa', child: Text('United States')),
                DropdownMenuItem(value: 'uk', child: Text('United Kingdom')),
                DropdownMenuItem(value: 'singapore', child: Text('Singapore')),
              ],
              onChanged: (value) {
                if (value != null) {
                  context.read<SignupBloc>().add(SignupTenantInfoChanged(country: value));
                }
              },
            ),
          ],
        );
      },
    );
  }
}

class _AdminInfoStep extends StatelessWidget {
  const _AdminInfoStep();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<SignupBloc, SignupState>(
      builder: (context, state) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: state.adminFirstName,
                    decoration: const InputDecoration(
                      labelText: 'First Name',
                      prefixIcon: Icon(Icons.person),
                    ),
                    onChanged: (value) {
                      context.read<SignupBloc>().add(SignupAdminInfoChanged(firstName: value));
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    initialValue: state.adminLastName,
                    decoration: const InputDecoration(
                      labelText: 'Last Name',
                    ),
                    onChanged: (value) {
                      context.read<SignupBloc>().add(SignupAdminInfoChanged(lastName: value));
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              initialValue: state.adminEmail,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email Address',
                hintText: 'admin@yourbusiness.com',
                prefixIcon: Icon(Icons.email),
              ),
              onChanged: (value) {
                context.read<SignupBloc>().add(SignupAdminInfoChanged(email: value));
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              initialValue: state.adminPhone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone Number (Optional)',
                hintText: '+1 234 567 8900',
                prefixIcon: Icon(Icons.phone),
              ),
              onChanged: (value) {
                context.read<SignupBloc>().add(SignupAdminInfoChanged(phone: value));
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              initialValue: state.adminPassword,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Password',
                hintText: 'Minimum 8 characters',
                prefixIcon: Icon(Icons.lock),
              ),
              onChanged: (value) {
                context.read<SignupBloc>().add(SignupAdminInfoChanged(password: value));
              },
            ),
            const SizedBox(height: 8),
            Text(
              'Password must be at least 8 characters with uppercase, lowercase, and numbers',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        );
      },
    );
  }
}
