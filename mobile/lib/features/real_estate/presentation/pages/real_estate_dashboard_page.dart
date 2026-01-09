import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/real_estate_bloc.dart';
import '../bloc/real_estate_event.dart';
import '../bloc/real_estate_state.dart';

class RealEstateDashboardPage extends StatefulWidget {
  const RealEstateDashboardPage({super.key});

  @override
  State<RealEstateDashboardPage> createState() => _RealEstateDashboardPageState();
}

class _RealEstateDashboardPageState extends State<RealEstateDashboardPage> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    context.read<RealEstateBloc>().add(const LoadDashboardStats());
    context.read<RealEstateBloc>().add(const LoadProperties());
    context.read<RealEstateBloc>().add(const LoadLeads());
    context.read<RealEstateBloc>().add(const LoadSiteVisits());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Real Estate Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: BlocBuilder<RealEstateBloc, RealEstateState>(
        builder: (context, state) {
          if (state.dashboardStatus == RealEstateStatus.loading && state.dashboardStats == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.dashboardStatus == RealEstateStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${state.dashboardError}'),
                  ElevatedButton(
                    onPressed: _loadData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => _loadData(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatsCards(state),
                  const SizedBox(height: 24),
                  _buildRecentListings(state),
                  const SizedBox(height: 24),
                  _buildRecentLeads(state),
                  const SizedBox(height: 24),
                  _buildUpcomingVisits(state),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatsCards(RealEstateState state) {
    final stats = state.dashboardStats ?? {};
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _StatCard(
          title: 'Total Properties',
          value: '${stats['totalProperties'] ?? state.properties.length}',
          icon: Icons.home_work,
          color: Colors.blue,
        ),
        _StatCard(
          title: 'Available',
          value: '${stats['availableProperties'] ?? 0}',
          icon: Icons.check_circle,
          color: Colors.green,
        ),
        _StatCard(
          title: 'Active Leads',
          value: '${stats['activeLeads'] ?? state.leads.length}',
          icon: Icons.people,
          color: Colors.orange,
        ),
        _StatCard(
          title: 'Scheduled Visits',
          value: '${stats['scheduledVisits'] ?? state.visits.length}',
          icon: Icons.calendar_today,
          color: Colors.purple,
        ),
      ],
    );
  }

  Widget _buildRecentListings(RealEstateState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Listings',
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
        if (state.propertiesStatus == RealEstateStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.properties.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No properties found'),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: state.properties.take(3).length,
            itemBuilder: (context, index) {
              final property = state.properties[index];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    child: Icon(_getPropertyIcon(property.type.name)),
                  ),
                  title: Text(property.title),
                  subtitle: Text('${property.location} - \$${property.price.toStringAsFixed(0)}'),
                  trailing: _buildStatusChip(property.status.name),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildRecentLeads(RealEstateState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Leads',
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
        if (state.leadsStatus == RealEstateStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.leads.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No leads found'),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: state.leads.take(3).length,
            itemBuilder: (context, index) {
              final lead = state.leads[index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text(lead.name),
                  subtitle: Text(lead.phone),
                  trailing: _buildLeadStatusChip(lead.status.name),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildUpcomingVisits(RealEstateState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Upcoming Visits',
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
        if (state.visitsStatus == RealEstateStatus.loading)
          const Center(child: CircularProgressIndicator())
        else if (state.visits.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('No scheduled visits'),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: state.visits.take(3).length,
            itemBuilder: (context, index) {
              final visit = state.visits[index];
              return Card(
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.calendar_month)),
                  title: Text(visit.propertyTitle ?? 'Property Visit'),
                  subtitle: Text(_formatDateTime(visit.scheduledAt)),
                  trailing: _buildVisitStatusChip(visit.status.name),
                ),
              );
            },
          ),
      ],
    );
  }

  IconData _getPropertyIcon(String type) {
    switch (type) {
      case 'apartment':
        return Icons.apartment;
      case 'house':
        return Icons.house;
      case 'villa':
        return Icons.villa;
      case 'commercial':
        return Icons.business;
      case 'land':
        return Icons.landscape;
      default:
        return Icons.home;
    }
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'available':
        color = Colors.green;
        break;
      case 'sold':
        color = Colors.red;
        break;
      case 'rented':
        color = Colors.orange;
        break;
      default:
        color = Colors.grey;
    }
    return Chip(
      label: Text(status.toUpperCase(), style: const TextStyle(fontSize: 10)),
      backgroundColor: color.withOpacity(0.2),
      side: BorderSide.none,
      padding: EdgeInsets.zero,
    );
  }

  Widget _buildLeadStatusChip(String status) {
    Color color;
    switch (status) {
      case 'newLead':
        color = Colors.blue;
        break;
      case 'contacted':
        color = Colors.cyan;
        break;
      case 'interested':
        color = Colors.green;
        break;
      case 'siteVisitScheduled':
        color = Colors.purple;
        break;
      case 'converted':
        color = Colors.teal;
        break;
      case 'lost':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }
    return Chip(
      label: Text(status.toUpperCase(), style: const TextStyle(fontSize: 10)),
      backgroundColor: color.withOpacity(0.2),
      side: BorderSide.none,
      padding: EdgeInsets.zero,
    );
  }

  Widget _buildVisitStatusChip(String status) {
    Color color;
    switch (status) {
      case 'scheduled':
        color = Colors.blue;
        break;
      case 'completed':
        color = Colors.green;
        break;
      case 'cancelled':
        color = Colors.red;
        break;
      case 'noShow':
        color = Colors.orange;
        break;
      default:
        color = Colors.grey;
    }
    return Chip(
      label: Text(status.toUpperCase(), style: const TextStyle(fontSize: 10)),
      backgroundColor: color.withOpacity(0.2),
      side: BorderSide.none,
      padding: EdgeInsets.zero,
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
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
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
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
}
