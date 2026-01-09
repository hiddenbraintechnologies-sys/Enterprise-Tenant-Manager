import 'package:flutter/material.dart';
import 'subscription_gating_service.dart';

class ModuleGuard extends StatelessWidget {
  final String moduleId;
  final SubscriptionGatingService gatingService;
  final Widget child;
  final Widget? fallback;
  final Widget? loading;

  const ModuleGuard({
    super.key,
    required this.moduleId,
    required this.gatingService,
    required this.child,
    this.fallback,
    this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<bool>(
      future: gatingService.hasModuleAccess(moduleId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return loading ?? const Center(child: CircularProgressIndicator());
        }

        if (snapshot.data == true) {
          return child;
        }

        return fallback ?? _buildUpgradePrompt(context);
      },
    );
  }

  Widget _buildUpgradePrompt(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.lock_outline,
              size: 64,
              color: Theme.of(context).colorScheme.secondary,
            ),
            const SizedBox(height: 16),
            Text(
              'Module Locked',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Upgrade your subscription to access this feature.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).pushNamed('/subscription');
              },
              icon: const Icon(Icons.upgrade),
              label: const Text('Upgrade Plan'),
            ),
          ],
        ),
      ),
    );
  }
}

class ModuleAccessChecker {
  final SubscriptionGatingService _gatingService;

  ModuleAccessChecker(this._gatingService);

  Future<bool> canAccess(String moduleId) async {
    return await _gatingService.hasModuleAccess(moduleId);
  }

  Future<void> checkOrNavigate(
    BuildContext context,
    String moduleId, {
    VoidCallback? onAllowed,
    VoidCallback? onDenied,
  }) async {
    final hasAccess = await canAccess(moduleId);
    
    if (hasAccess) {
      onAllowed?.call();
    } else {
      onDenied?.call();
      if (context.mounted) {
        _showUpgradeDialog(context, moduleId);
      }
    }
  }

  void _showUpgradeDialog(BuildContext context, String moduleId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Feature Unavailable'),
        content: Text(
          'The $moduleId module is not included in your current subscription plan. '
          'Would you like to upgrade?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/subscription');
            },
            child: const Text('Upgrade'),
          ),
        ],
      ),
    );
  }
}
