import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/coworking_bloc.dart';
import '../bloc/coworking_event.dart';
import '../bloc/coworking_state.dart';

class CoworkingDashboardPage extends StatefulWidget {
  const CoworkingDashboardPage({super.key});

  @override
  State<CoworkingDashboardPage> createState() => _CoworkingDashboardPageState();
}

class _CoworkingDashboardPageState extends State<CoworkingDashboardPage> {
  @override
  void initState() {
    super.initState();
    context.read<CoworkingBloc>().add(const LoadDashboardStats());
    context.read<CoworkingBloc>().add(const LoadBookings());
    context.read<CoworkingBloc>().add(const LoadDesks(isAvailable: true));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Coworking Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<CoworkingBloc>().add(const RefreshData());
            },
          ),
        ],
      ),
      body: BlocBuilder<CoworkingBloc, CoworkingState>(
        builder: (context, state) {
          if (state.dashboardStatus == CoworkingStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<CoworkingBloc>().add(const RefreshData());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsGrid(state),
                  const SizedBox(height: 24),
                  _buildTodaysBookings(state),
                  const SizedBox(height: 24),
                  _buildAvailableDesks(state),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsGrid(CoworkingState state) {
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
          'Total Desks',
          '${stats['totalDesks'] ?? 0}',
          Icons.desk,
          Colors.blue,
        ),
        _buildStatCard(
          'Occupancy',
          '${stats['occupancyRate'] ?? 0}%',
          Icons.trending_up,
          Colors.green,
        ),
        _buildStatCard(
          'Today\'s Bookings',
          '${stats['todaysBookings'] ?? 0}',
          Icons.calendar_today,
          Colors.orange,
        ),
        _buildStatCard(
          'Active Members',
          '${stats['activeMembers'] ?? 0}',
          Icons.people,
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
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodaysBookings(CoworkingState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Today\'s Bookings',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, '/coworking/bookings');
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (state.bookingsStatus == CoworkingStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.bookings.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.event_busy, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 8),
                    Text(
                      'No bookings for today',
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
            itemCount: state.bookings.take(5).length,
            itemBuilder: (context, index) {
              final booking = state.bookings[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _getStatusColor(booking.status),
                    child: Icon(
                      _getBookingIcon(booking.bookingType),
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  title: Text(booking.memberName ?? 'Unknown Member'),
                  subtitle: Text(
                    '${booking.deskName ?? booking.meetingRoomName ?? 'N/A'} - ${booking.bookingType}',
                  ),
                  trailing: _buildStatusChip(booking.status),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildAvailableDesks(CoworkingState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Available Desks',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, '/coworking/desks');
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (state.desksStatus == CoworkingStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.desks.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.desk, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 8),
                    Text(
                      'No desks available',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          SizedBox(
            height: 140,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: state.desks.take(10).length,
              itemBuilder: (context, index) {
                final desk = state.desks[index];
                return SizedBox(
                  width: 160,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                _getDeskTypeIcon(desk.type),
                                color: Theme.of(context).primaryColor,
                              ),
                              const Spacer(),
                              if (desk.isAvailable)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.green[100],
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'Available',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: Colors.green[800],
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            desk.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            desk.type.toUpperCase(),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '\$${desk.pricePerDay.toStringAsFixed(0)}/day',
                            style: TextStyle(
                              color: Theme.of(context).primaryColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      case 'completed':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  IconData _getBookingIcon(String bookingType) {
    switch (bookingType.toLowerCase()) {
      case 'hourly':
        return Icons.schedule;
      case 'daily':
        return Icons.today;
      case 'monthly':
        return Icons.calendar_month;
      default:
        return Icons.event;
    }
  }

  IconData _getDeskTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'hot':
        return Icons.local_fire_department;
      case 'dedicated':
        return Icons.person;
      case 'private':
        return Icons.lock;
      default:
        return Icons.desk;
    }
  }

  Widget _buildStatusChip(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: _getStatusColor(status),
        ),
      ),
    );
  }
}
