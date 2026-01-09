import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/gym_bloc.dart';
import '../bloc/gym_event.dart';
import '../bloc/gym_state.dart';

class GymDashboardPage extends StatefulWidget {
  const GymDashboardPage({super.key});

  @override
  State<GymDashboardPage> createState() => _GymDashboardPageState();
}

class _GymDashboardPageState extends State<GymDashboardPage> {
  @override
  void initState() {
    super.initState();
    context.read<GymBloc>()
      ..add(const LoadDashboardStats())
      ..add(const LoadExpiringMemberships())
      ..add(const LoadTodayAttendance());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gym Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<GymBloc>().add(const RefreshData());
            },
          ),
        ],
      ),
      body: BlocBuilder<GymBloc, GymState>(
        builder: (context, state) {
          if (state.dashboardStatus == GymStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<GymBloc>().add(const RefreshData());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsGrid(state),
                  const SizedBox(height: 24),
                  _buildTodayAttendanceSection(state),
                  const SizedBox(height: 24),
                  _buildExpiringMembershipsSection(state),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsGrid(GymState state) {
    final stats = state.dashboardStats ?? {};
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        _buildStatCard(
          'Active Members',
          '${stats['activeMembers'] ?? 0}',
          Icons.people,
          Colors.blue,
        ),
        _buildStatCard(
          "Today's Check-ins",
          '${state.todayAttendance.length}',
          Icons.login,
          Colors.green,
        ),
        _buildStatCard(
          'Total Trainers',
          '${stats['totalTrainers'] ?? 0}',
          Icons.fitness_center,
          Colors.orange,
        ),
        _buildStatCard(
          'Expiring Soon',
          '${state.expiringMemberships.length}',
          Icons.warning,
          Colors.red,
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
            Icon(icon, size: 40, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodayAttendanceSection(GymState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              "Today's Check-ins",
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, '/gym/attendance');
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (state.todayAttendanceStatus == GymStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.todayAttendance.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: Text('No check-ins today'),
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: state.todayAttendance.take(5).length,
            itemBuilder: (context, index) {
              final attendance = state.todayAttendance[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    child: Text(
                      (attendance.memberName ?? 'M')[0].toUpperCase(),
                    ),
                  ),
                  title: Text(attendance.memberName ?? 'Unknown Member'),
                  subtitle: Text(
                    'Check-in: ${_formatTime(attendance.checkIn)}${attendance.checkOut != null ? ' - Check-out: ${_formatTime(attendance.checkOut!)}' : ''}',
                  ),
                  trailing: attendance.isCheckedOut
                      ? Text(attendance.formattedDuration)
                      : const Chip(
                          label: Text('Active'),
                          backgroundColor: Colors.green,
                          labelStyle: TextStyle(color: Colors.white, fontSize: 12),
                        ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildExpiringMembershipsSection(GymState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Expiring Memberships',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, '/gym/members');
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (state.expiringMembershipsStatus == GymStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.expiringMemberships.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Center(
                child: Text('No memberships expiring soon'),
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: state.expiringMemberships.take(5).length,
            itemBuilder: (context, index) {
              final member = state.expiringMemberships[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.orange,
                    child: Text(
                      member.name[0].toUpperCase(),
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  title: Text(member.name),
                  subtitle: Text('Expires: ${_formatDate(member.endDate)}'),
                  trailing: Chip(
                    label: Text('${member.daysUntilExpiry} days'),
                    backgroundColor: member.daysUntilExpiry <= 3
                        ? Colors.red[100]
                        : Colors.orange[100],
                  ),
                  onTap: () {
                    Navigator.pushNamed(
                      context,
                      '/gym/members/${member.id}',
                    );
                  },
                ),
              );
            },
          ),
      ],
    );
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
