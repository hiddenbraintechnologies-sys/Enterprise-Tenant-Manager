import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/tourism_bloc.dart';
import '../bloc/tourism_event.dart';
import '../bloc/tourism_state.dart';

class TourismDashboardPage extends StatefulWidget {
  const TourismDashboardPage({super.key});

  @override
  State<TourismDashboardPage> createState() => _TourismDashboardPageState();
}

class _TourismDashboardPageState extends State<TourismDashboardPage> {
  @override
  void initState() {
    super.initState();
    context.read<TourismBloc>().add(const LoadDashboardStats());
    context.read<TourismBloc>().add(const LoadBookings(limit: 5));
    context.read<TourismBloc>().add(const LoadPackages(limit: 5));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tourism Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                context.read<TourismBloc>().add(const RefreshData()),
          ),
        ],
      ),
      body: BlocBuilder<TourismBloc, TourismState>(
        builder: (context, state) {
          if (state.dashboardStatus == TourismStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.dashboardStatus == TourismStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${state.dashboardError}'),
                  ElevatedButton(
                    onPressed: () =>
                        context.read<TourismBloc>().add(const RefreshData()),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<TourismBloc>().add(const RefreshData());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsGrid(state),
                  const SizedBox(height: 24),
                  _buildUpcomingBookings(state),
                  const SizedBox(height: 24),
                  _buildPopularPackages(state),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsGrid(TourismState state) {
    final stats = state.dashboardStats ?? {};

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _StatCard(
          title: 'Total Packages',
          value: '${stats['totalPackages'] ?? 0}',
          icon: Icons.card_travel,
          color: Colors.blue,
        ),
        _StatCard(
          title: 'Active Bookings',
          value: '${stats['activeBookings'] ?? 0}',
          icon: Icons.book_online,
          color: Colors.green,
        ),
        _StatCard(
          title: 'Total Revenue',
          value: '\$${_formatCurrency(stats['totalRevenue'])}',
          icon: Icons.attach_money,
          color: Colors.orange,
        ),
        _StatCard(
          title: 'Upcoming Tours',
          value: '${stats['upcomingTours'] ?? 0}',
          icon: Icons.event,
          color: Colors.purple,
        ),
        _StatCard(
          title: 'Total Customers',
          value: '${stats['totalCustomers'] ?? 0}',
          icon: Icons.people,
          color: Colors.teal,
        ),
        _StatCard(
          title: 'This Month',
          value: '\$${_formatCurrency(stats['monthlyRevenue'])}',
          icon: Icons.trending_up,
          color: Colors.indigo,
        ),
      ],
    );
  }

  String _formatCurrency(dynamic value) {
    if (value == null) return '0';
    final num = value is num ? value.toDouble() : double.tryParse(value.toString()) ?? 0;
    if (num >= 1000000) {
      return '${(num / 1000000).toStringAsFixed(1)}M';
    } else if (num >= 1000) {
      return '${(num / 1000).toStringAsFixed(1)}K';
    }
    return num.toStringAsFixed(0);
  }

  Widget _buildUpcomingBookings(TourismState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Upcoming Bookings',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            TextButton(
              onPressed: () {
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (state.bookingsStatus == TourismStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.bookings.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No upcoming bookings'),
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
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: _getStatusColor(booking.status.name),
                    child: const Icon(Icons.flight_takeoff, color: Colors.white),
                  ),
                  title: Text(booking.packageName ?? 'Package #${booking.packageId}'),
                  subtitle: Text(
                    '${booking.customerName ?? 'Customer'} - ${_formatDate(booking.travelDate)}',
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '\$${booking.totalAmount.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        booking.status.name.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          color: _getStatusColor(booking.status.name),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildPopularPackages(TourismState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Popular Packages',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            TextButton(
              onPressed: () {
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (state.packagesStatus == TourismStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.packages.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No packages available'),
            ),
          )
        else
          SizedBox(
            height: 200,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: state.packages.take(5).length,
              itemBuilder: (context, index) {
                final package = state.packages[index];
                return Card(
                  margin: const EdgeInsets.only(right: 12),
                  child: SizedBox(
                    width: 160,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            height: 80,
                            decoration: BoxDecoration(
                              color: Colors.blue.shade100,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: Icon(
                                Icons.landscape,
                                size: 40,
                                color: Colors.blue.shade700,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            package.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Spacer(),
                          Text(
                            '${package.durationDays}D/${package.durationNights}N',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          Text(
                            '\$${package.price.toStringAsFixed(0)}',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.primary,
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

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
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
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 24),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey,
                      ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
