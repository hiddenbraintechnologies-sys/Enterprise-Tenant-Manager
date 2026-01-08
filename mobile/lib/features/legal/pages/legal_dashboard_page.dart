/// Legal Services Dashboard Page
///
/// Displays key metrics and quick actions for legal services management.
library legal_dashboard_page;

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/legal_bloc.dart';
import '../data/models/legal_models.dart';

class LegalDashboardPage extends StatefulWidget {
  const LegalDashboardPage({super.key});

  @override
  State<LegalDashboardPage> createState() => _LegalDashboardPageState();
}

class _LegalDashboardPageState extends State<LegalDashboardPage> {
  @override
  void initState() {
    super.initState();
    context.read<LegalBloc>().add(LoadDashboard());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Legal Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<LegalBloc>().add(LoadDashboard()),
          ),
        ],
      ),
      body: BlocBuilder<LegalBloc, LegalState>(
        builder: (context, state) {
          if (state is LegalLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          if (state is LegalError) {
            return Center(child: Text('Error: ${state.message}'));
          }
          
          if (state is DashboardLoaded) {
            return _buildDashboard(state.stats);
          }
          
          return const Center(child: Text('Loading...'));
        },
      ),
    );
  }

  Widget _buildDashboard(LegalDashboardStats stats) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Overview',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              _StatCard(
                title: 'Total Cases',
                value: stats.totalCases.toString(),
                icon: Icons.folder,
                color: Colors.blue,
              ),
              _StatCard(
                title: 'Active Cases',
                value: stats.activeCases.toString(),
                icon: Icons.pending_actions,
                color: Colors.orange,
              ),
              _StatCard(
                title: 'Total Clients',
                value: stats.totalClients.toString(),
                icon: Icons.people,
                color: Colors.green,
              ),
              _StatCard(
                title: 'Upcoming Hearings',
                value: stats.upcomingHearings.toString(),
                icon: Icons.gavel,
                color: Colors.purple,
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Text(
            'Quick Actions',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.person_add),
                  label: const Text('New Client'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.folder_open),
                  label: const Text('New Case'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            Text(
              title,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }
}
