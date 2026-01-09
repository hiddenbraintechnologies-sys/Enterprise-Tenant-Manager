import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/logistics_bloc.dart';
import '../bloc/logistics_event.dart';
import '../bloc/logistics_state.dart';
import '../../domain/entities/logistics_order.dart';

class LogisticsDashboardPage extends StatefulWidget {
  const LogisticsDashboardPage({super.key});

  @override
  State<LogisticsDashboardPage> createState() => _LogisticsDashboardPageState();
}

class _LogisticsDashboardPageState extends State<LogisticsDashboardPage> {
  @override
  void initState() {
    super.initState();
    context.read<LogisticsBloc>().add(const LoadDashboardStats());
    context.read<LogisticsBloc>().add(const LoadOrders(limit: 5));
    context.read<LogisticsBloc>().add(const LoadAvailableDrivers());
    context.read<LogisticsBloc>().add(const LoadAvailableVehicles());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Logistics Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              context.read<LogisticsBloc>().add(const RefreshData());
            },
          ),
        ],
      ),
      body: BlocBuilder<LogisticsBloc, LogisticsState>(
        builder: (context, state) {
          if (state.dashboardStatus == LogisticsStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<LogisticsBloc>().add(const RefreshData());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsGrid(state),
                  const SizedBox(height: 24),
                  _buildActiveDeliveriesSection(state),
                  const SizedBox(height: 24),
                  _buildAvailableResourcesSection(state),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsGrid(LogisticsState state) {
    final stats = state.dashboardStats ?? {};

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          'Active Deliveries',
          '${stats['activeDeliveries'] ?? 0}',
          Icons.local_shipping,
          Colors.blue,
        ),
        _buildStatCard(
          'Pending Orders',
          '${stats['pendingOrders'] ?? 0}',
          Icons.pending_actions,
          Colors.orange,
        ),
        _buildStatCard(
          'Available Drivers',
          '${stats['availableDrivers'] ?? state.availableDrivers.length}',
          Icons.person,
          Colors.green,
        ),
        _buildStatCard(
          'Available Vehicles',
          '${stats['availableVehicles'] ?? state.availableVehicles.length}',
          Icons.directions_car,
          Colors.purple,
        ),
        _buildStatCard(
          'Delivered Today',
          '${stats['deliveredToday'] ?? 0}',
          Icons.check_circle,
          Colors.teal,
        ),
        _buildStatCard(
          'Total Orders',
          '${stats['totalOrders'] ?? 0}',
          Icons.inventory,
          Colors.indigo,
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
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 24),
                const SizedBox(width: 8),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
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

  Widget _buildActiveDeliveriesSection(LogisticsState state) {
    final activeOrders = state.orders
        .where((o) =>
            o.status == LogisticsOrderStatus.pickedUp ||
            o.status == LogisticsOrderStatus.inTransit)
        .take(5)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Active Deliveries',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            TextButton(
              onPressed: () {
                Navigator.pushNamed(context, '/logistics/orders');
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (activeOrders.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.local_shipping_outlined,
                      size: 48,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No active deliveries',
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
            itemCount: activeOrders.length,
            itemBuilder: (context, index) {
              final order = activeOrders[index];
              return _buildOrderCard(order);
            },
          ),
      ],
    );
  }

  Widget _buildOrderCard(LogisticsOrder order) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(order.status),
          child: Icon(
            _getStatusIcon(order.status),
            color: Colors.white,
            size: 20,
          ),
        ),
        title: Text(
          order.orderNumber,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(order.deliveryAddress, maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _getStatusColor(order.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    order.statusDisplayName,
                    style: TextStyle(
                      fontSize: 12,
                      color: _getStatusColor(order.status),
                    ),
                  ),
                ),
                if (order.driverName != null) ...[
                  const SizedBox(width: 8),
                  Icon(Icons.person, size: 14, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    order.driverName!,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ],
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          Navigator.pushNamed(context, '/logistics/orders/${order.id}');
        },
      ),
    );
  }

  Widget _buildAvailableResourcesSection(LogisticsState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Available Resources',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildResourceCard(
                'Drivers',
                state.availableDrivers.length,
                Icons.person,
                Colors.green,
                () => Navigator.pushNamed(context, '/logistics/drivers'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildResourceCard(
                'Vehicles',
                state.availableVehicles.length,
                Icons.directions_car,
                Colors.blue,
                () => Navigator.pushNamed(context, '/logistics/vehicles'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildResourceCard(
    String title,
    int count,
    IconData icon,
    Color color,
    VoidCallback onTap,
  ) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, color: color),
                  const SizedBox(width: 8),
                  Text(
                    '$count Available',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(title),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(LogisticsOrderStatus status) {
    switch (status) {
      case LogisticsOrderStatus.pending:
        return Colors.orange;
      case LogisticsOrderStatus.pickedUp:
        return Colors.blue;
      case LogisticsOrderStatus.inTransit:
        return Colors.indigo;
      case LogisticsOrderStatus.delivered:
        return Colors.green;
      case LogisticsOrderStatus.cancelled:
        return Colors.red;
    }
  }

  IconData _getStatusIcon(LogisticsOrderStatus status) {
    switch (status) {
      case LogisticsOrderStatus.pending:
        return Icons.pending_actions;
      case LogisticsOrderStatus.pickedUp:
        return Icons.inventory;
      case LogisticsOrderStatus.inTransit:
        return Icons.local_shipping;
      case LogisticsOrderStatus.delivered:
        return Icons.check_circle;
      case LogisticsOrderStatus.cancelled:
        return Icons.cancel;
    }
  }
}
