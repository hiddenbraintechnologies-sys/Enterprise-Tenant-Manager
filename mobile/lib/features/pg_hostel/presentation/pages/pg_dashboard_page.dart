import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/pg_bloc.dart';
import '../bloc/pg_event.dart';
import '../bloc/pg_state.dart';

class PgDashboardPage extends StatefulWidget {
  const PgDashboardPage({super.key});

  @override
  State<PgDashboardPage> createState() => _PgDashboardPageState();
}

class _PgDashboardPageState extends State<PgDashboardPage> {
  @override
  void initState() {
    super.initState();
    context.read<PgBloc>().add(const LoadDashboardStats());
    context.read<PgBloc>().add(const LoadOverduePayments());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PG/Hostel Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<PgBloc>().add(const RefreshData());
            },
          ),
        ],
      ),
      body: BlocBuilder<PgBloc, PgState>(
        builder: (context, state) {
          if (state.dashboardStatus == PgStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.dashboardStatus == PgStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Error loading dashboard',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(state.dashboardError ?? 'Unknown error'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<PgBloc>().add(const LoadDashboardStats());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final stats = state.dashboardStats ?? {};

          return RefreshIndicator(
            onRefresh: () async {
              context.read<PgBloc>().add(const RefreshData());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsGrid(stats),
                  const SizedBox(height: 24),
                  _buildOccupancySection(stats),
                  const SizedBox(height: 24),
                  _buildOverduePaymentsSection(state),
                  const SizedBox(height: 24),
                  _buildQuickActions(context),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsGrid(Map<String, dynamic> stats) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          'Total Rooms',
          '${stats['totalRooms'] ?? 0}',
          Icons.meeting_room,
          Colors.blue,
        ),
        _buildStatCard(
          'Occupied Rooms',
          '${stats['occupiedRooms'] ?? 0}',
          Icons.bed,
          Colors.green,
        ),
        _buildStatCard(
          'Total Residents',
          '${stats['totalResidents'] ?? 0}',
          Icons.people,
          Colors.orange,
        ),
        _buildStatCard(
          'Pending Payments',
          '${stats['pendingPayments'] ?? 0}',
          Icons.payment,
          Colors.red,
        ),
        _buildStatCard(
          'Maintenance Pending',
          '${stats['pendingMaintenance'] ?? 0}',
          Icons.build,
          Colors.purple,
        ),
        _buildStatCard(
          'This Month Revenue',
          '\$${stats['monthlyRevenue'] ?? 0}',
          Icons.attach_money,
          Colors.teal,
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOccupancySection(Map<String, dynamic> stats) {
    final totalRooms = stats['totalRooms'] ?? 0;
    final occupiedRooms = stats['occupiedRooms'] ?? 0;
    final occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) : 0.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Occupancy Rate',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: occupancyRate,
              backgroundColor: Colors.grey[200],
              color: occupancyRate > 0.8 ? Colors.green : Colors.orange,
              minHeight: 10,
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${(occupancyRate * 100).toStringAsFixed(1)}% occupied'),
                Text('$occupiedRooms / $totalRooms rooms'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOverduePaymentsSection(PgState state) {
    final overduePayments = state.overduePayments;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Overdue Payments',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                if (overduePayments.isNotEmpty)
                  Badge(
                    label: Text('${overduePayments.length}'),
                    backgroundColor: Colors.red,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (overduePayments.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No overdue payments'),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: overduePayments.length > 5 ? 5 : overduePayments.length,
                separatorBuilder: (_, __) => const Divider(),
                itemBuilder: (context, index) {
                  final payment = overduePayments[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: Colors.red[100],
                      child: const Icon(Icons.warning, color: Colors.red),
                    ),
                    title: Text(payment.residentName ?? 'Unknown'),
                    subtitle: Text('Room ${payment.roomNumber ?? 'N/A'}'),
                    trailing: Text(
                      '\$${payment.amount.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.red,
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildActionChip(
                  'Add Room',
                  Icons.add_home,
                  () => _navigateToRooms(context),
                ),
                _buildActionChip(
                  'New Resident',
                  Icons.person_add,
                  () => _navigateToResidents(context),
                ),
                _buildActionChip(
                  'Collect Payment',
                  Icons.payment,
                  () => _navigateToPayments(context),
                ),
                _buildActionChip(
                  'Maintenance',
                  Icons.build,
                  () => _navigateToMaintenance(context),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionChip(String label, IconData icon, VoidCallback onPressed) {
    return ActionChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      onPressed: onPressed,
    );
  }

  void _navigateToRooms(BuildContext context) {
    Navigator.pushNamed(context, '/pg/rooms');
  }

  void _navigateToResidents(BuildContext context) {
    Navigator.pushNamed(context, '/pg/residents');
  }

  void _navigateToPayments(BuildContext context) {
    Navigator.pushNamed(context, '/pg/payments');
  }

  void _navigateToMaintenance(BuildContext context) {
    Navigator.pushNamed(context, '/pg/maintenance');
  }
}
