import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/hr_dashboard_bloc.dart';
import '../data/models/hr_models.dart';

class HrDashboardPage extends StatefulWidget {
  const HrDashboardPage({super.key});

  @override
  State<HrDashboardPage> createState() => _HrDashboardPageState();
}

class _HrDashboardPageState extends State<HrDashboardPage> {
  @override
  void initState() {
    super.initState();
    context.read<HrDashboardBloc>().add(LoadDashboard());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('HR Dashboard'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<HrDashboardBloc>().add(RefreshDashboard()),
          ),
        ],
      ),
      body: BlocBuilder<HrDashboardBloc, HrDashboardState>(
        builder: (context, state) {
          if (state is HrDashboardLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is HrDashboardError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: Theme.of(context).colorScheme.error),
                  const SizedBox(height: 16),
                  Text(state.message),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => context.read<HrDashboardBloc>().add(LoadDashboard()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state is HrDashboardLoaded) {
            return RefreshIndicator(
              onRefresh: () async {
                context.read<HrDashboardBloc>().add(RefreshDashboard());
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildStatsGrid(state.stats),
                    const SizedBox(height: 24),
                    _buildQuickActions(),
                    const SizedBox(height: 24),
                    _buildPendingLeaves(state.pendingLeaves),
                    const SizedBox(height: 24),
                    _buildRecentEmployees(state.recentEmployees),
                  ],
                ),
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildStatsGrid(HrDashboardStats stats) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard('Total Employees', '${stats.totalEmployees}', Icons.people, Colors.blue),
        _buildStatCard('Present Today', '${stats.presentToday}', Icons.check_circle, Colors.green),
        _buildStatCard('On Leave', '${stats.onLeaveToday}', Icons.event_busy, Colors.orange),
        _buildStatCard('Pending Requests', '${stats.pendingLeaveRequests}', Icons.pending_actions, Colors.red),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildActionChip('Add Employee', Icons.person_add, '/hr/employees/add'),
            _buildActionChip('Mark Attendance', Icons.schedule, '/hr/attendance'),
            _buildActionChip('Apply Leave', Icons.event_note, '/hr/leaves'),
            _buildActionChip('Run Payroll', Icons.payments, '/hr/payroll'),
          ],
        ),
      ],
    );
  }

  Widget _buildActionChip(String label, IconData icon, String route) {
    return ActionChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      onPressed: () => Navigator.pushNamed(context, route),
    );
  }

  Widget _buildPendingLeaves(List<HrLeave> leaves) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Pending Leave Requests',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: () => Navigator.pushNamed(context, '/hr/leaves'),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (leaves.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'No pending leave requests',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ),
            ),
          )
        else
          Card(
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: leaves.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final leave = leaves[index];
                return ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text(leave.employeeName ?? 'Employee'),
                  subtitle: Text('${leave.startDate} - ${leave.endDate}'),
                  trailing: Chip(
                    label: Text(
                      'PENDING',
                      style: TextStyle(fontSize: 10, color: Colors.orange.shade700),
                    ),
                    backgroundColor: Colors.orange.withOpacity(0.1),
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildRecentEmployees(List<HrEmployee> employees) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Employees',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            TextButton(
              onPressed: () => Navigator.pushNamed(context, '/hr/employees'),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (employees.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text(
                  'No employees found',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ),
            ),
          )
        else
          Card(
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: employees.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final employee = employees[index];
                return ListTile(
                  leading: CircleAvatar(
                    child: Text(employee.firstName[0].toUpperCase()),
                  ),
                  title: Text(employee.fullName),
                  subtitle: Text(employee.position ?? employee.departmentName ?? 'No position'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    Navigator.pushNamed(context, '/hr/employees/${employee.id}');
                  },
                );
              },
            ),
          ),
      ],
    );
  }
}
