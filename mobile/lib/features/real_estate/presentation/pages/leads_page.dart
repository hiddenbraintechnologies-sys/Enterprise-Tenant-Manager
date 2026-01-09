import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/real_estate_bloc.dart';
import '../bloc/real_estate_event.dart';
import '../bloc/real_estate_state.dart';
import '../../domain/entities/property_lead.dart';

class LeadsPage extends StatefulWidget {
  const LeadsPage({super.key});

  @override
  State<LeadsPage> createState() => _LeadsPageState();
}

class _LeadsPageState extends State<LeadsPage> with SingleTickerProviderStateMixin {
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();
  late TabController _tabController;
  LeadStatus? _selectedStatus;

  final List<LeadStatus?> _statusTabs = [
    null,
    LeadStatus.newLead,
    LeadStatus.contacted,
    LeadStatus.interested,
    LeadStatus.siteVisitScheduled,
    LeadStatus.negotiating,
    LeadStatus.converted,
    LeadStatus.lost,
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statusTabs.length, vsync: this);
    _tabController.addListener(_onTabChanged);
    _scrollController.addListener(_onScroll);
    context.read<RealEstateBloc>().add(const LoadLeads());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      _selectedStatus = _statusTabs[_tabController.index];
      context.read<RealEstateBloc>().add(LoadLeads(status: _selectedStatus));
    }
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<RealEstateBloc>().add(const LoadMoreLeads());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  void _onSearch(String value) {
    context.read<RealEstateBloc>().add(LoadLeads(
      search: value.isEmpty ? null : value,
      status: _selectedStatus,
    ));
  }

  String _getStatusLabel(LeadStatus? status) {
    if (status == null) return 'All';
    switch (status) {
      case LeadStatus.newLead:
        return 'New';
      case LeadStatus.contacted:
        return 'Contacted';
      case LeadStatus.interested:
        return 'Interested';
      case LeadStatus.siteVisitScheduled:
        return 'Visit';
      case LeadStatus.negotiating:
        return 'Negotiating';
      case LeadStatus.converted:
        return 'Converted';
      case LeadStatus.lost:
        return 'Lost';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leads'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<RealEstateBloc>().add(LoadLeads(status: _selectedStatus)),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: _statusTabs.map((status) => Tab(text: _getStatusLabel(status))).toList(),
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search leads...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _onSearch('');
                        },
                      )
                    : null,
                border: const OutlineInputBorder(),
              ),
              onChanged: _onSearch,
            ),
          ),
          Expanded(
            child: BlocBuilder<RealEstateBloc, RealEstateState>(
              builder: (context, state) {
                if (state.leadsStatus == RealEstateStatus.loading && state.leads.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.leadsStatus == RealEstateStatus.failure) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Error: ${state.leadsError}'),
                        ElevatedButton(
                          onPressed: () => context.read<RealEstateBloc>().add(LoadLeads(status: _selectedStatus)),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state.leads.isEmpty) {
                  return const Center(child: Text('No leads found'));
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<RealEstateBloc>().add(LoadLeads(status: _selectedStatus));
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    itemCount: state.hasMoreLeads ? state.leads.length + 1 : state.leads.length,
                    itemBuilder: (context, index) {
                      if (index >= state.leads.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(8.0),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }
                      return _LeadCard(
                        lead: state.leads[index],
                        onConvert: () {
                          context.read<RealEstateBloc>().add(ConvertLead(state.leads[index].id));
                        },
                      );
                    },
                  ),
                );
              },
            ),
          ),
          _buildPaginationInfo(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildPaginationInfo() {
    return BlocBuilder<RealEstateBloc, RealEstateState>(
      builder: (context, state) {
        if (state.leadsPagination == null) return const SizedBox.shrink();

        final pagination = state.leadsPagination!;
        final start = ((pagination.page - 1) * pagination.limit) + 1;
        final end = start + state.leads.length - 1;

        return Container(
          padding: const EdgeInsets.all(8.0),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Text(
            'Showing $start-$end of ${pagination.total} leads',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        );
      },
    );
  }
}

class _LeadCard extends StatelessWidget {
  final PropertyLead lead;
  final VoidCallback onConvert;

  const _LeadCard({required this.lead, required this.onConvert});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(lead.status).withOpacity(0.2),
          child: Icon(Icons.person, color: _getStatusColor(lead.status)),
        ),
        title: Text(lead.name),
        subtitle: Text(lead.phone),
        trailing: _buildStatusChip(lead.status),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (lead.email != null) ...[
                  Row(
                    children: [
                      const Icon(Icons.email, size: 16),
                      const SizedBox(width: 8),
                      Text(lead.email!),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
                Row(
                  children: [
                    const Icon(Icons.source, size: 16),
                    const SizedBox(width: 8),
                    Text('Source: ${lead.source.name}'),
                  ],
                ),
                if (lead.notes != null && lead.notes!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('Notes: ${lead.notes}'),
                ],
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.phone),
                      label: const Text('Call'),
                    ),
                    TextButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.calendar_today),
                      label: const Text('Schedule Visit'),
                    ),
                    if (lead.status != LeadStatus.converted && lead.status != LeadStatus.lost)
                      ElevatedButton(
                        onPressed: onConvert,
                        child: const Text('Convert'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(LeadStatus status) {
    switch (status) {
      case LeadStatus.newLead:
        return Colors.blue;
      case LeadStatus.contacted:
        return Colors.cyan;
      case LeadStatus.interested:
        return Colors.green;
      case LeadStatus.siteVisitScheduled:
        return Colors.purple;
      case LeadStatus.negotiating:
        return Colors.orange;
      case LeadStatus.converted:
        return Colors.teal;
      case LeadStatus.lost:
        return Colors.red;
    }
  }

  Widget _buildStatusChip(LeadStatus status) {
    final color = _getStatusColor(status);
    String label;
    switch (status) {
      case LeadStatus.newLead:
        label = 'NEW';
        break;
      case LeadStatus.siteVisitScheduled:
        label = 'VISIT';
        break;
      default:
        label = status.name.toUpperCase();
    }
    return Chip(
      label: Text(label, style: const TextStyle(fontSize: 10)),
      backgroundColor: color.withOpacity(0.2),
      side: BorderSide.none,
      padding: EdgeInsets.zero,
    );
  }
}
