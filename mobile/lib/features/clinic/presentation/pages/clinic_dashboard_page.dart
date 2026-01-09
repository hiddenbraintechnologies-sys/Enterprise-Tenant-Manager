import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/clinic_bloc.dart';
import '../bloc/clinic_event.dart';
import '../bloc/clinic_state.dart';
import '../../domain/entities/clinic_appointment.dart';

class ClinicDashboardPage extends StatefulWidget {
  const ClinicDashboardPage({super.key});

  @override
  State<ClinicDashboardPage> createState() => _ClinicDashboardPageState();
}

class _ClinicDashboardPageState extends State<ClinicDashboardPage> {
  @override
  void initState() {
    super.initState();
    context.read<ClinicBloc>().add(const LoadDashboardStats());
    context.read<ClinicBloc>().add(const LoadTodayAppointments());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Clinic Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<ClinicBloc>().add(const RefreshData());
            },
          ),
        ],
      ),
      body: BlocBuilder<ClinicBloc, ClinicState>(
        builder: (context, state) {
          if (state.dashboardStatus == ClinicStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<ClinicBloc>().add(const LoadDashboardStats());
              context.read<ClinicBloc>().add(const LoadTodayAppointments());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsGrid(state),
                  const SizedBox(height: 24),
                  _buildQuickActions(context),
                  const SizedBox(height: 24),
                  _buildTodayAppointments(state),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsGrid(ClinicState state) {
    final stats = state.dashboardStats ?? {};
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          'Total Patients',
          '${stats['totalPatients'] ?? 0}',
          Icons.people,
          Colors.blue,
        ),
        _buildStatCard(
          'Total Doctors',
          '${stats['totalDoctors'] ?? 0}',
          Icons.medical_services,
          Colors.green,
        ),
        _buildStatCard(
          'Today\'s Appointments',
          '${stats['todayAppointments'] ?? state.todayAppointments.length}',
          Icons.calendar_today,
          Colors.orange,
        ),
        _buildStatCard(
          'Pending',
          '${stats['pendingAppointments'] ?? 0}',
          Icons.pending_actions,
          Colors.purple,
        ),
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
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
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

  Widget _buildQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                context,
                'New Patient',
                Icons.person_add,
                Colors.blue,
                () => Navigator.pushNamed(context, '/clinic/patients/new'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                context,
                'Book Appointment',
                Icons.add_circle,
                Colors.green,
                () => Navigator.pushNamed(context, '/clinic/appointments/new'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                context,
                'View Patients',
                Icons.people,
                Colors.orange,
                () => Navigator.pushNamed(context, '/clinic/patients'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionButton(
                context,
                'View Doctors',
                Icons.medical_services,
                Colors.purple,
                () => Navigator.pushNamed(context, '/clinic/doctors'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildActionButton(
    BuildContext context,
    String label,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayAppointments(ClinicState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Today\'s Appointments',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            TextButton(
              onPressed: () => Navigator.pushNamed(context, '/clinic/appointments'),
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (state.todayAppointmentsStatus == ClinicStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.todayAppointments.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.calendar_today, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 12),
                    Text(
                      'No appointments scheduled for today',
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
            itemCount: state.todayAppointments.length > 5 ? 5 : state.todayAppointments.length,
            itemBuilder: (context, index) {
              return _buildAppointmentCard(state.todayAppointments[index]);
            },
          ),
      ],
    );
  }

  Widget _buildAppointmentCard(ClinicAppointment appointment) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(appointment.status).withOpacity(0.2),
          child: Icon(
            Icons.schedule,
            color: _getStatusColor(appointment.status),
          ),
        ),
        title: Text(appointment.patientName ?? 'Patient'),
        subtitle: Text(
          '${_formatTime(appointment.dateTime)} - Dr. ${appointment.doctorName ?? 'Unknown'}',
        ),
        trailing: Chip(
          label: Text(
            appointment.statusString,
            style: const TextStyle(fontSize: 10),
          ),
          backgroundColor: _getStatusColor(appointment.status).withOpacity(0.2),
        ),
        onTap: () {
          Navigator.pushNamed(
            context,
            '/clinic/appointments/${appointment.id}',
          );
        },
      ),
    );
  }

  Color _getStatusColor(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.scheduled:
        return Colors.blue;
      case AppointmentStatus.completed:
        return Colors.green;
      case AppointmentStatus.cancelled:
        return Colors.red;
    }
  }

  String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour;
    final minute = dateTime.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '$displayHour:$minute $period';
  }
}
