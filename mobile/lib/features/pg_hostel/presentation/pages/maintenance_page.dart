import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/pg_maintenance.dart';
import '../bloc/pg_bloc.dart';
import '../bloc/pg_event.dart';
import '../bloc/pg_state.dart';

class MaintenancePage extends StatefulWidget {
  const MaintenancePage({super.key});

  @override
  State<MaintenancePage> createState() => _MaintenancePageState();
}

class _MaintenancePageState extends State<MaintenancePage> {
  final ScrollController _scrollController = ScrollController();
  String? _selectedStatus;
  String? _selectedPriority;

  @override
  void initState() {
    super.initState();
    _loadMaintenanceRequests();
    context.read<PgBloc>().add(const LoadRooms());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _loadMaintenanceRequests() {
    context.read<PgBloc>().add(LoadMaintenanceRequests(
          status: _selectedStatus,
          priority: _selectedPriority,
        ));
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.9) {
      context.read<PgBloc>().add(const LoadMoreMaintenanceRequests());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Maintenance Requests'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: BlocBuilder<PgBloc, PgState>(
        builder: (context, state) {
          if (state.maintenanceStatus == PgStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.maintenanceStatus == PgStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.maintenanceError ?? 'Error loading requests'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadMaintenanceRequests,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state.maintenanceRequests.isEmpty) {
            return const Center(child: Text('No maintenance requests found'));
          }

          return RefreshIndicator(
            onRefresh: () async => _loadMaintenanceRequests(),
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: state.maintenanceRequests.length +
                  (state.maintenanceStatus == PgStatus.loadingMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index >= state.maintenanceRequests.length) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }
                return _buildMaintenanceCard(state.maintenanceRequests[index]);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddRequestDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildMaintenanceCard(PgMaintenance request) {
    final priorityColors = {
      MaintenancePriority.low: Colors.green,
      MaintenancePriority.medium: Colors.orange,
      MaintenancePriority.high: Colors.red,
      MaintenancePriority.urgent: Colors.purple,
    };

    final statusColors = {
      MaintenanceStatus.pending: Colors.orange,
      MaintenanceStatus.inProgress: Colors.blue,
      MaintenanceStatus.completed: Colors.green,
      MaintenanceStatus.cancelled: Colors.grey,
    };

    final priorityColor = priorityColors[request.priority] ?? Colors.grey;
    final statusColor = statusColors[request.status] ?? Colors.grey;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showRequestDetails(request),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: priorityColor.withOpacity(0.2),
                    child: Icon(Icons.build, color: priorityColor),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Room ${request.roomNumber ?? 'N/A'}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (request.residentName != null)
                          Text(
                            request.residentName!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: priorityColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          request.priority.name.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: priorityColor,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _formatStatus(request.status),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                request.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: Colors.grey[700]),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Created: ${_formatDate(request.createdAt)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[500],
                    ),
                  ),
                  if (request.status == MaintenanceStatus.pending ||
                      request.status == MaintenanceStatus.inProgress)
                    TextButton(
                      onPressed: () => _showUpdateStatusDialog(request),
                      child: const Text('Update'),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatStatus(MaintenanceStatus status) {
    switch (status) {
      case MaintenanceStatus.pending:
        return 'PENDING';
      case MaintenanceStatus.inProgress:
        return 'IN PROGRESS';
      case MaintenanceStatus.completed:
        return 'COMPLETED';
      case MaintenanceStatus.cancelled:
        return 'CANCELLED';
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _showFilterDialog() {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Filter Requests',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String?>(
                    value: _selectedStatus,
                    decoration: const InputDecoration(
                      labelText: 'Status',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: 'pending', child: Text('Pending')),
                      DropdownMenuItem(value: 'in_progress', child: Text('In Progress')),
                      DropdownMenuItem(value: 'completed', child: Text('Completed')),
                    ],
                    onChanged: (value) {
                      setModalState(() => _selectedStatus = value);
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String?>(
                    value: _selectedPriority,
                    decoration: const InputDecoration(
                      labelText: 'Priority',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: 'low', child: Text('Low')),
                      DropdownMenuItem(value: 'medium', child: Text('Medium')),
                      DropdownMenuItem(value: 'high', child: Text('High')),
                      DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                    ],
                    onChanged: (value) {
                      setModalState(() => _selectedPriority = value);
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setModalState(() {
                              _selectedStatus = null;
                              _selectedPriority = null;
                            });
                          },
                          child: const Text('Clear'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            setState(() {});
                            _loadMaintenanceRequests();
                          },
                          child: const Text('Apply'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showAddRequestDialog() {
    final formKey = GlobalKey<FormState>();
    final descriptionController = TextEditingController();
    String? selectedRoomId;
    String selectedPriority = 'medium';
    String? selectedCategory;

    showDialog(
      context: context,
      builder: (context) {
        return BlocBuilder<PgBloc, PgState>(
          builder: (context, state) {
            return AlertDialog(
              title: const Text('New Maintenance Request'),
              content: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DropdownButtonFormField<String>(
                        value: selectedRoomId,
                        decoration: const InputDecoration(labelText: 'Room'),
                        validator: (v) => v == null ? 'Required' : null,
                        items: state.rooms
                            .map((room) => DropdownMenuItem(
                                  value: room.id,
                                  child: Text('Room ${room.roomNumber}'),
                                ))
                            .toList(),
                        onChanged: (v) => selectedRoomId = v,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedCategory,
                        decoration: const InputDecoration(labelText: 'Category'),
                        items: const [
                          DropdownMenuItem(value: 'plumbing', child: Text('Plumbing')),
                          DropdownMenuItem(value: 'electrical', child: Text('Electrical')),
                          DropdownMenuItem(value: 'furniture', child: Text('Furniture')),
                          DropdownMenuItem(value: 'cleaning', child: Text('Cleaning')),
                          DropdownMenuItem(value: 'other', child: Text('Other')),
                        ],
                        onChanged: (v) => selectedCategory = v,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedPriority,
                        decoration: const InputDecoration(labelText: 'Priority'),
                        items: const [
                          DropdownMenuItem(value: 'low', child: Text('Low')),
                          DropdownMenuItem(value: 'medium', child: Text('Medium')),
                          DropdownMenuItem(value: 'high', child: Text('High')),
                          DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                        ],
                        onChanged: (v) => selectedPriority = v!,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: descriptionController,
                        decoration: const InputDecoration(
                          labelText: 'Description',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 3,
                        validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: state.isCreating
                      ? null
                      : () {
                          if (formKey.currentState!.validate()) {
                            context.read<PgBloc>().add(CreateMaintenanceRequest({
                                  'roomId': selectedRoomId,
                                  'description': descriptionController.text,
                                  'priority': selectedPriority,
                                  'category': selectedCategory,
                                  'status': 'pending',
                                }));
                            Navigator.pop(context);
                          }
                        },
                  child: state.isCreating
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showUpdateStatusDialog(PgMaintenance request) {
    String newStatus = request.status == MaintenanceStatus.pending
        ? 'in_progress'
        : 'completed';
    final costController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Update Status'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: newStatus,
                decoration: const InputDecoration(labelText: 'New Status'),
                items: const [
                  DropdownMenuItem(value: 'in_progress', child: Text('In Progress')),
                  DropdownMenuItem(value: 'completed', child: Text('Completed')),
                  DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
                ],
                onChanged: (v) => newStatus = v!,
              ),
              if (newStatus == 'completed') ...[
                const SizedBox(height: 12),
                TextField(
                  controller: costController,
                  decoration: const InputDecoration(
                    labelText: 'Actual Cost (Optional)',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            BlocBuilder<PgBloc, PgState>(
              builder: (context, state) {
                return ElevatedButton(
                  onPressed: state.isUpdating
                      ? null
                      : () {
                          if (newStatus == 'completed') {
                            context.read<PgBloc>().add(CompleteMaintenanceRequest(
                                  request.id,
                                  actualCost: costController.text.isNotEmpty
                                      ? double.tryParse(costController.text)
                                      : null,
                                ));
                          } else {
                            context.read<PgBloc>().add(UpdateMaintenanceRequest(
                                  request.id,
                                  {'status': newStatus},
                                ));
                          }
                          Navigator.pop(context);
                        },
                  child: state.isUpdating
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Update'),
                );
              },
            ),
          ],
        );
      },
    );
  }

  void _showRequestDetails(PgMaintenance request) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (context, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Maintenance Request',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 16),
                  _buildDetailRow('Room', request.roomNumber ?? 'N/A'),
                  if (request.residentName != null)
                    _buildDetailRow('Resident', request.residentName!),
                  if (request.category != null)
                    _buildDetailRow('Category', request.category!.toUpperCase()),
                  _buildDetailRow('Priority', request.priority.name.toUpperCase()),
                  _buildDetailRow('Status', _formatStatus(request.status)),
                  const SizedBox(height: 16),
                  const Text(
                    'Description',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(request.description),
                  const SizedBox(height: 16),
                  _buildDetailRow('Created', _formatDate(request.createdAt)),
                  if (request.completedAt != null)
                    _buildDetailRow('Completed', _formatDate(request.completedAt!)),
                  if (request.estimatedCost != null)
                    _buildDetailRow(
                      'Estimated Cost',
                      '\$${request.estimatedCost!.toStringAsFixed(2)}',
                    ),
                  if (request.actualCost != null)
                    _buildDetailRow(
                      'Actual Cost',
                      '\$${request.actualCost!.toStringAsFixed(2)}',
                    ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
