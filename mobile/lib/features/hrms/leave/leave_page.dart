import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/leave_bloc.dart';
import '../data/models/hr_models.dart';

class LeavePage extends StatefulWidget {
  const LeavePage({super.key});

  @override
  State<LeavePage> createState() => _LeavePageState();
}

class _LeavePageState extends State<LeavePage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    context.read<LeaveBloc>().add(LoadLeaves());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadLeaves() {
    context.read<LeaveBloc>().add(LoadLeaves(
      status: _selectedFilter == 'all' ? null : _selectedFilter,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Management'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Requests'),
            Tab(text: 'My Leaves'),
          ],
        ),
      ),
      body: BlocConsumer<LeaveBloc, LeaveState>(
        listener: (context, state) {
          if (state is LeaveActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          } else if (state is LeaveError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        builder: (context, state) {
          return TabBarView(
            controller: _tabController,
            children: [
              _buildLeaveRequestsList(state),
              _buildMyLeavesList(state),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showApplyLeaveDialog,
        icon: const Icon(Icons.add),
        label: const Text('Apply Leave'),
      ),
    );
  }

  Widget _buildLeaveRequestsList(LeaveState state) {
    return Column(
      children: [
        _buildFilterChips(),
        Expanded(
          child: _buildContent(state, showActions: true),
        ),
      ],
    );
  }

  Widget _buildFilterChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          FilterChip(
            label: const Text('All'),
            selected: _selectedFilter == 'all',
            onSelected: (selected) {
              setState(() => _selectedFilter = 'all');
              _loadLeaves();
            },
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Pending'),
            selected: _selectedFilter == 'pending',
            onSelected: (selected) {
              setState(() => _selectedFilter = 'pending');
              _loadLeaves();
            },
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Approved'),
            selected: _selectedFilter == 'approved',
            onSelected: (selected) {
              setState(() => _selectedFilter = 'approved');
              _loadLeaves();
            },
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Rejected'),
            selected: _selectedFilter == 'rejected',
            onSelected: (selected) {
              setState(() => _selectedFilter = 'rejected');
              _loadLeaves();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildContent(LeaveState state, {bool showActions = false}) {
    if (state is LeaveLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is LeaveError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 16),
            Text(state.message),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadLeaves,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state is LeaveLoaded) {
      if (state.leaves.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.event_note, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(height: 16),
              Text(
                'No leave requests',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
        );
      }

      return RefreshIndicator(
        onRefresh: () async => _loadLeaves(),
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: state.leaves.length,
          itemBuilder: (context, index) {
            return _buildLeaveCard(state.leaves[index], showActions: showActions);
          },
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildLeaveCard(HrLeave leave, {bool showActions = false}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const CircleAvatar(child: Icon(Icons.person)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        leave.employeeName ?? 'Employee',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        leave.leaveTypeName ?? 'Leave',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                _buildStatusChip(leave.status),
              ],
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('From', style: Theme.of(context).textTheme.bodySmall),
                    Text(leave.startDate),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('To', style: Theme.of(context).textTheme.bodySmall),
                    Text(leave.endDate),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Days', style: Theme.of(context).textTheme.bodySmall),
                    Text('${leave.days}'),
                  ],
                ),
              ],
            ),
            if (leave.reason != null && leave.reason!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                leave.reason!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
            if (showActions && leave.status == 'pending') ...[
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () {
                      context.read<LeaveBloc>().add(RejectLeave(leave.id));
                    },
                    child: const Text('Reject'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () {
                      context.read<LeaveBloc>().add(ApproveLeave(leave.id));
                    },
                    child: const Text('Approve'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMyLeavesList(LeaveState state) {
    return _buildContent(state, showActions: false);
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'approved':
        color = Colors.green;
        break;
      case 'rejected':
        color = Colors.red;
        break;
      case 'pending':
        color = Colors.orange;
        break;
      default:
        color = Colors.grey;
    }

    return Chip(
      label: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10),
      ),
      backgroundColor: color.withOpacity(0.1),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  void _showApplyLeaveDialog() {
    String? selectedLeaveTypeId;
    DateTime? fromDate;
    DateTime? toDate;
    final reasonController = TextEditingController();

    final bloc = context.read<LeaveBloc>();
    List<HrLeaveType> leaveTypes = [];
    final state = bloc.state;
    if (state is LeaveLoaded) {
      leaveTypes = state.leaveTypes;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return DraggableScrollableSheet(
              initialChildSize: 0.7,
              minChildSize: 0.5,
              maxChildSize: 0.9,
              expand: false,
              builder: (context, scrollController) {
                return SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Apply for Leave',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 24),
                      DropdownButtonFormField<String>(
                        value: selectedLeaveTypeId,
                        decoration: const InputDecoration(
                          labelText: 'Leave Type',
                          border: OutlineInputBorder(),
                        ),
                        items: leaveTypes.map((t) => DropdownMenuItem(
                              value: t.id,
                              child: Text(t.name),
                            )).toList(),
                        onChanged: (value) {
                          setModalState(() => selectedLeaveTypeId = value);
                        },
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final date = await showDatePicker(
                                  context: context,
                                  initialDate: fromDate ?? DateTime.now(),
                                  firstDate: DateTime.now(),
                                  lastDate: DateTime.now().add(const Duration(days: 365)),
                                );
                                if (date != null) {
                                  setModalState(() => fromDate = date);
                                }
                              },
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'From Date',
                                  border: OutlineInputBorder(),
                                  suffixIcon: Icon(Icons.calendar_today),
                                ),
                                child: Text(
                                  fromDate != null
                                      ? '${fromDate!.day}/${fromDate!.month}/${fromDate!.year}'
                                      : 'Select date',
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final date = await showDatePicker(
                                  context: context,
                                  initialDate: toDate ?? fromDate ?? DateTime.now(),
                                  firstDate: fromDate ?? DateTime.now(),
                                  lastDate: DateTime.now().add(const Duration(days: 365)),
                                );
                                if (date != null) {
                                  setModalState(() => toDate = date);
                                }
                              },
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'To Date',
                                  border: OutlineInputBorder(),
                                  suffixIcon: Icon(Icons.calendar_today),
                                ),
                                child: Text(
                                  toDate != null
                                      ? '${toDate!.day}/${toDate!.month}/${toDate!.year}'
                                      : 'Select date',
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: reasonController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Reason',
                          border: OutlineInputBorder(),
                          alignLabelWithHint: true,
                        ),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: (selectedLeaveTypeId == null || fromDate == null || toDate == null)
                              ? null
                              : () {
                                  Navigator.pop(context);
                                  final formatDate = (DateTime d) =>
                                      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
                                  bloc.add(ApplyLeave({
                                    'leaveTypeId': selectedLeaveTypeId,
                                    'startDate': formatDate(fromDate!),
                                    'endDate': formatDate(toDate!),
                                    'reason': reasonController.text,
                                  }));
                                },
                          child: const Text('Submit Request'),
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}
