import 'package:flutter/material.dart';

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
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildLeaveRequestsList(),
          _buildMyLeavesList(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showApplyLeaveDialog,
        icon: const Icon(Icons.add),
        label: const Text('Apply Leave'),
      ),
    );
  }

  Widget _buildLeaveRequestsList() {
    return Column(
      children: [
        _buildFilterChips(),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: 0,
            itemBuilder: (context, index) {
              return _buildLeaveRequestCard(index);
            },
          ),
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
            onSelected: (selected) => setState(() => _selectedFilter = 'all'),
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Pending'),
            selected: _selectedFilter == 'pending',
            onSelected: (selected) => setState(() => _selectedFilter = 'pending'),
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Approved'),
            selected: _selectedFilter == 'approved',
            onSelected: (selected) => setState(() => _selectedFilter = 'approved'),
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Rejected'),
            selected: _selectedFilter == 'rejected',
            onSelected: (selected) => setState(() => _selectedFilter = 'rejected'),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaveRequestCard(int index) {
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
                        'Employee Name',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        'Leave Type',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                _buildStatusChip('pending'),
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
                    const Text('--/--/----'),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('To', style: Theme.of(context).textTheme.bodySmall),
                    const Text('--/--/----'),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Days', style: Theme.of(context).textTheme.bodySmall),
                    const Text('0'),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton(
                  onPressed: () {},
                  child: const Text('Reject'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () {},
                  child: const Text('Approve'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMyLeavesList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 0,
      itemBuilder: (context, index) {
        return Card(
          child: ListTile(
            leading: const Icon(Icons.event_note),
            title: const Text('Leave Type'),
            subtitle: const Text('--/--/---- to --/--/----'),
            trailing: _buildStatusChip('approved'),
          ),
        );
      },
    );
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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
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
                    decoration: const InputDecoration(
                      labelText: 'Leave Type',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'annual', child: Text('Annual Leave')),
                      DropdownMenuItem(value: 'sick', child: Text('Sick Leave')),
                      DropdownMenuItem(value: 'casual', child: Text('Casual Leave')),
                    ],
                    onChanged: (value) {},
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {},
                          child: const InputDecorator(
                            decoration: InputDecoration(
                              labelText: 'From Date',
                              border: OutlineInputBorder(),
                              suffixIcon: Icon(Icons.calendar_today),
                            ),
                            child: Text('Select date'),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: InkWell(
                          onTap: () {},
                          child: const InputDecorator(
                            decoration: InputDecoration(
                              labelText: 'To Date',
                              border: OutlineInputBorder(),
                              suffixIcon: Icon(Icons.calendar_today),
                            ),
                            child: Text('Select date'),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
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
                      onPressed: () {
                        Navigator.pop(context);
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
  }
}
