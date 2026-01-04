import 'package:flutter/material.dart';

import '../../core/offline/connectivity_service.dart';
import '../../core/offline/sync_service.dart';

class OfflineIndicator extends StatelessWidget {
  final Widget child;

  const OfflineIndicator({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<ConnectionStatus>(
      stream: ConnectivityService.instance.statusStream,
      initialData: ConnectivityService.instance.currentStatus,
      builder: (context, snapshot) {
        final isOffline = snapshot.data == ConnectionStatus.offline;

        return Column(
          children: [
            if (isOffline) const _OfflineBanner(),
            Expanded(child: child),
          ],
        );
      },
    );
  }
}

class _OfflineBanner extends StatelessWidget {
  const _OfflineBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      color: Colors.orange.shade700,
      child: const SafeArea(
        bottom: false,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text(
              'You are offline. Changes will sync when online.',
              style: TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SyncStatusIndicator extends StatelessWidget {
  final SyncService syncService;

  const SyncStatusIndicator({super.key, required this.syncService});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<SyncStatus>(
      stream: syncService.syncStatusStream,
      initialData: syncService.currentStatus,
      builder: (context, snapshot) {
        final status = snapshot.data ?? SyncStatus.idle;

        switch (status) {
          case SyncStatus.syncing:
            return _buildSyncingIndicator();
          case SyncStatus.error:
            return _buildErrorIndicator(context);
          case SyncStatus.completed:
          case SyncStatus.idle:
            return const SizedBox.shrink();
        }
      },
    );
  }

  Widget _buildSyncingIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.blue.shade700),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            'Syncing...',
            style: TextStyle(
              fontSize: 12,
              color: Colors.blue.shade700,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorIndicator(BuildContext context) {
    return GestureDetector(
      onTap: () => syncService.syncAll(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.sync_problem, size: 14, color: Colors.red.shade700),
            const SizedBox(width: 8),
            Text(
              'Sync failed. Tap to retry',
              style: TextStyle(
                fontSize: 12,
                color: Colors.red.shade700,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SyncProgressOverlay extends StatelessWidget {
  final SyncService syncService;

  const SyncProgressOverlay({super.key, required this.syncService});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<SyncProgress>(
      stream: syncService.syncProgressStream,
      builder: (context, snapshot) {
        final progress = snapshot.data;
        if (progress == null || progress.isComplete) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.all(16),
          margin: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.sync, size: 20),
                  const SizedBox(width: 8),
                  const Text(
                    'Syncing data...',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const Spacer(),
                  Text(
                    '${progress.completed}/${progress.total}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              LinearProgressIndicator(
                value: progress.percentage,
                backgroundColor: Colors.grey.shade200,
              ),
              if (progress.currentEntity != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Syncing ${progress.currentEntity}...',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
