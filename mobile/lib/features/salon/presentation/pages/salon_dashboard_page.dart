import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/salon_bloc.dart';
import '../bloc/salon_event.dart';
import '../bloc/salon_state.dart';

class SalonDashboardPage extends StatefulWidget {
  const SalonDashboardPage({super.key});

  @override
  State<SalonDashboardPage> createState() => _SalonDashboardPageState();
}

class _SalonDashboardPageState extends State<SalonDashboardPage> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    context.read<SalonBloc>().add(const LoadDashboardStats());
    context.read<SalonBloc>().add(const LoadTodayAppointments());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Salon Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _loadData(),
        child: BlocBuilder<SalonBloc, SalonState>(
          builder: (context, state) {
            if (state.dashboardStatus == SalonStatus.loading &&
                state.dashboardStats == null) {
              return const Center(child: CircularProgressIndicator());
            }

            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsGrid(state),
                  const SizedBox(height: 24),
                  _buildTodayAppointmentsSection(state),
                  const SizedBox(height: 24),
                  _buildQuickActionsSection(),
                ],
              ),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showQuickBookingDialog(),
        icon: const Icon(Icons.add),
        label: const Text('Book Appointment'),
      ),
    );
  }

  Widget _buildStatsGrid(SalonState state) {
    final stats = state.dashboardStats ?? {};
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          'Today\'s Appointments',
          '${stats['todayAppointments'] ?? state.todayAppointments.length}',
          Icons.calendar_today,
          Colors.blue,
        ),
        _buildStatCard(
          'Revenue',
          '\$${(stats['totalRevenue'] ?? 0).toStringAsFixed(2)}',
          Icons.attach_money,
          Colors.green,
        ),
        _buildStatCard(
          'Active Staff',
          '${stats['totalStaff'] ?? 0}',
          Icons.people,
          Colors.orange,
        ),
        _buildStatCard(
          'Services',
          '${stats['totalServices'] ?? 0}',
          Icons.spa,
          Colors.purple,
        ),
        _buildStatCard(
          'Pending',
          '${stats['pendingAppointments'] ?? 0}',
          Icons.pending_actions,
          Colors.amber,
        ),
        _buildStatCard(
          'Members',
          '${stats['activeMembers'] ?? 0}',
          Icons.card_membership,
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
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayAppointmentsSection(SalonState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Today\'s Appointments',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, '/salon/appointments');
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (state.todayAppointmentsStatus == SalonStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.todayAppointments.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.event_available, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 8),
                    Text(
                      'No appointments today',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: state.todayAppointments.length > 5 
                ? 5 
                : state.todayAppointments.length,
            itemBuilder: (context, index) {
              final appointment = state.todayAppointments[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _getStatusColor(appointment.status),
                    child: Text(
                      appointment.customerName?.substring(0, 1).toUpperCase() ?? 'C',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  title: Text(appointment.customerName ?? 'Customer'),
                  subtitle: Text(
                    '${appointment.serviceName ?? 'Service'} - ${_formatTime(appointment.dateTime)}',
                  ),
                  trailing: Chip(
                    label: Text(
                      appointment.status.toUpperCase(),
                      style: const TextStyle(fontSize: 10),
                    ),
                    backgroundColor: _getStatusColor(appointment.status).withOpacity(0.2),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildQuickActionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildQuickActionChip(
              'New Appointment',
              Icons.add_circle,
              () => _showQuickBookingDialog(),
            ),
            _buildQuickActionChip(
              'Add Customer',
              Icons.person_add,
              () => Navigator.pushNamed(context, '/salon/customers'),
            ),
            _buildQuickActionChip(
              'View Services',
              Icons.spa,
              () => Navigator.pushNamed(context, '/salon/services'),
            ),
            _buildQuickActionChip(
              'Staff Schedule',
              Icons.schedule,
              () => Navigator.pushNamed(context, '/salon/staff'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActionChip(String label, IconData icon, VoidCallback onTap) {
    return ActionChip(
      avatar: Icon(icon, size: 18),
      label: Text(label),
      onPressed: onTap,
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return Colors.blue;
      case 'confirmed':
        return Colors.green;
      case 'in_progress':
        return Colors.orange;
      case 'completed':
        return Colors.teal;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour;
    final minute = dateTime.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$displayHour:$minute $period';
  }

  void _showQuickBookingDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Quick Booking'),
        content: const Text(
          'Navigate to appointments page to create a new booking.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/salon/appointments');
            },
            child: const Text('Go to Appointments'),
          ),
        ],
      ),
    );
  }
}
