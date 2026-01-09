import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/real_estate_bloc.dart';
import '../bloc/real_estate_event.dart';
import '../bloc/real_estate_state.dart';
import '../../domain/entities/property_visit.dart';

class SiteVisitsPage extends StatefulWidget {
  const SiteVisitsPage({super.key});

  @override
  State<SiteVisitsPage> createState() => _SiteVisitsPageState();
}

class _SiteVisitsPageState extends State<SiteVisitsPage> with SingleTickerProviderStateMixin {
  final _scrollController = ScrollController();
  late TabController _tabController;
  VisitStatus? _selectedStatus;
  DateTime? _selectedDate;

  final List<VisitStatus?> _statusTabs = [
    null,
    VisitStatus.scheduled,
    VisitStatus.completed,
    VisitStatus.cancelled,
    VisitStatus.noShow,
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statusTabs.length, vsync: this);
    _tabController.addListener(_onTabChanged);
    _scrollController.addListener(_onScroll);
    context.read<RealEstateBloc>().add(const LoadSiteVisits());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      _selectedStatus = _statusTabs[_tabController.index];
      context.read<RealEstateBloc>().add(LoadSiteVisits(status: _selectedStatus));
    }
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<RealEstateBloc>().add(const LoadMoreSiteVisits());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  String _getStatusLabel(VisitStatus? status) {
    if (status == null) return 'All';
    switch (status) {
      case VisitStatus.scheduled:
        return 'Scheduled';
      case VisitStatus.completed:
        return 'Completed';
      case VisitStatus.cancelled:
        return 'Cancelled';
      case VisitStatus.noShow:
        return 'No Show';
    }
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (date != null) {
      setState(() => _selectedDate = date);
      context.read<RealEstateBloc>().add(LoadSiteVisits(
        status: _selectedStatus,
        fromDate: date,
        toDate: date.add(const Duration(days: 1)),
      ));
    }
  }

  void _clearDateFilter() {
    setState(() => _selectedDate = null);
    context.read<RealEstateBloc>().add(LoadSiteVisits(status: _selectedStatus));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Site Visits'),
        actions: [
          IconButton(
            icon: Icon(_selectedDate != null ? Icons.calendar_today : Icons.date_range),
            onPressed: _selectDate,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<RealEstateBloc>().add(LoadSiteVisits(status: _selectedStatus)),
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
          if (_selectedDate != null)
            Container(
              width: double.infinity,
              color: Theme.of(context).colorScheme.primaryContainer,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Showing visits for ${_formatDate(_selectedDate!)}',
                    style: TextStyle(color: Theme.of(context).colorScheme.onPrimaryContainer),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: _clearDateFilter,
                  ),
                ],
              ),
            ),
          Expanded(
            child: BlocBuilder<RealEstateBloc, RealEstateState>(
              builder: (context, state) {
                if (state.visitsStatus == RealEstateStatus.loading && state.visits.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.visitsStatus == RealEstateStatus.failure) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Error: ${state.visitsError}'),
                        ElevatedButton(
                          onPressed: () => context.read<RealEstateBloc>().add(LoadSiteVisits(status: _selectedStatus)),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state.visits.isEmpty) {
                  return const Center(child: Text('No visits found'));
                }

                final groupedVisits = _groupVisitsByDate(state.visits);

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<RealEstateBloc>().add(LoadSiteVisits(status: _selectedStatus));
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    itemCount: groupedVisits.length + (state.hasMoreVisits ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index >= groupedVisits.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(8.0),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }
                      final entry = groupedVisits.entries.elementAt(index);
                      return _buildDateSection(entry.key, entry.value);
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

  Map<String, List<PropertyVisit>> _groupVisitsByDate(List<PropertyVisit> visits) {
    final grouped = <String, List<PropertyVisit>>{};
    for (final visit in visits) {
      final dateKey = _formatDate(visit.scheduledAt);
      grouped.putIfAbsent(dateKey, () => []).add(visit);
    }
    return grouped;
  }

  Widget _buildDateSection(String date, List<PropertyVisit> visits) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Text(
            date,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
          ),
        ),
        ...visits.map((visit) => _VisitCard(
              visit: visit,
              onComplete: () => _showCompleteDialog(visit),
            )),
      ],
    );
  }

  void _showCompleteDialog(PropertyVisit visit) {
    final feedbackController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Complete Visit'),
        content: TextField(
          controller: feedbackController,
          decoration: const InputDecoration(
            labelText: 'Feedback',
            hintText: 'Enter visit feedback...',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<RealEstateBloc>().add(
                    CompleteSiteVisit(visit.id, feedback: feedbackController.text),
                  );
              Navigator.pop(context);
            },
            child: const Text('Complete'),
          ),
        ],
      ),
    );
  }

  Widget _buildPaginationInfo() {
    return BlocBuilder<RealEstateBloc, RealEstateState>(
      builder: (context, state) {
        if (state.visitsPagination == null) return const SizedBox.shrink();

        final pagination = state.visitsPagination!;
        final start = ((pagination.page - 1) * pagination.limit) + 1;
        final end = start + state.visits.length - 1;

        return Container(
          padding: const EdgeInsets.all(8.0),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Text(
            'Showing $start-$end of ${pagination.total} visits',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final visitDate = DateTime(date.year, date.month, date.day);

    if (visitDate == today) {
      return 'Today';
    } else if (visitDate == today.add(const Duration(days: 1))) {
      return 'Tomorrow';
    } else if (visitDate == today.subtract(const Duration(days: 1))) {
      return 'Yesterday';
    }

    return '${date.day}/${date.month}/${date.year}';
  }
}

class _VisitCard extends StatelessWidget {
  final PropertyVisit visit;
  final VoidCallback onComplete;

  const _VisitCard({required this.visit, required this.onComplete});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(visit.status).withOpacity(0.2),
          child: Icon(Icons.calendar_month, color: _getStatusColor(visit.status)),
        ),
        title: Text(visit.propertyTitle ?? 'Property Visit'),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_formatTime(visit.scheduledAt)),
            if (visit.leadName != null) Text('Lead: ${visit.leadName}'),
            if (visit.agentName != null) Text('Agent: ${visit.agentName}'),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            _buildStatusChip(visit.status),
            if (visit.status == VisitStatus.scheduled)
              TextButton(
                onPressed: onComplete,
                child: const Text('Complete'),
              ),
          ],
        ),
        isThreeLine: true,
        onTap: () {},
      ),
    );
  }

  Color _getStatusColor(VisitStatus status) {
    switch (status) {
      case VisitStatus.scheduled:
        return Colors.blue;
      case VisitStatus.completed:
        return Colors.green;
      case VisitStatus.cancelled:
        return Colors.red;
      case VisitStatus.noShow:
        return Colors.orange;
    }
  }

  Widget _buildStatusChip(VisitStatus status) {
    final color = _getStatusColor(status);
    String label;
    switch (status) {
      case VisitStatus.noShow:
        label = 'NO SHOW';
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

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
