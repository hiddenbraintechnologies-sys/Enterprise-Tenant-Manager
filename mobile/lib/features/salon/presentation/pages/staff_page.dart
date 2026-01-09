import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/salon_staff.dart';
import '../bloc/salon_bloc.dart';
import '../bloc/salon_event.dart';
import '../bloc/salon_state.dart';

class StaffPage extends StatefulWidget {
  const StaffPage({super.key});

  @override
  State<StaffPage> createState() => _StaffPageState();
}

class _StaffPageState extends State<StaffPage> {
  final ScrollController _scrollController = ScrollController();
  bool? _isActiveFilter;

  @override
  void initState() {
    super.initState();
    _loadStaff();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _loadStaff() {
    context.read<SalonBloc>().add(LoadStaff(
      isActive: _isActiveFilter,
    ));
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      context.read<SalonBloc>().add(const LoadMoreStaff());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff Management'),
        actions: [
          PopupMenuButton<bool?>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() {
                _isActiveFilter = value;
              });
              _loadStaff();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: null,
                child: Text('All Staff'),
              ),
              const PopupMenuItem(
                value: true,
                child: Text('Active Only'),
              ),
              const PopupMenuItem(
                value: false,
                child: Text('Inactive Only'),
              ),
            ],
          ),
        ],
      ),
      body: BlocBuilder<SalonBloc, SalonState>(
        builder: (context, state) {
          if (state.staffStatus == SalonStatus.loading && state.staff.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.staffError != null && state.staff.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${state.staffError}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadStaff,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state.staff.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No staff members found',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => _loadStaff(),
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: state.staff.length +
                  (state.staffStatus == SalonStatus.loadingMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index >= state.staff.length) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }
                return _buildStaffCard(state.staff[index]);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddStaffDialog(),
        child: const Icon(Icons.person_add),
      ),
    );
  }

  Widget _buildStaffCard(SalonStaff staff) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showStaffDetailsDialog(staff),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: staff.isActive ? Colors.blue : Colors.grey,
                child: Text(
                  staff.name.substring(0, 1).toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            staff.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: staff.isActive
                                ? Colors.green[50]
                                : Colors.red[50],
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            staff.isActive ? 'Active' : 'Inactive',
                            style: TextStyle(
                              fontSize: 10,
                              color: staff.isActive ? Colors.green : Colors.red,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    if (staff.email != null || staff.phone != null)
                      Row(
                        children: [
                          if (staff.phone != null) ...[
                            Icon(Icons.phone, size: 14, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            Text(
                              staff.phone!,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(width: 12),
                          ],
                          if (staff.email != null) ...[
                            Icon(Icons.email, size: 14, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                staff.email!,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ],
                      ),
                    const SizedBox(height: 8),
                    if (staff.specializations.isNotEmpty)
                      Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: staff.specializations.map((spec) {
                          return Chip(
                            label: Text(spec),
                            labelStyle: const TextStyle(fontSize: 10),
                            padding: EdgeInsets.zero,
                            materialTapTargetSize:
                                MaterialTapTargetSize.shrinkWrap,
                          );
                        }).toList(),
                      ),
                    if (staff.commission > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          'Commission: ${staff.commission.toStringAsFixed(1)}%',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddStaffDialog() {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final emailController = TextEditingController();
    final commissionController = TextEditingController(text: '0');
    final List<String> selectedSpecializations = [];

    final availableSpecializations = [
      'Hair Styling',
      'Hair Coloring',
      'Manicure',
      'Pedicure',
      'Facial',
      'Massage',
      'Makeup',
      'Waxing',
    ];

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add Staff Member'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: commissionController,
                  decoration: const InputDecoration(
                    labelText: 'Commission (%)',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Specializations',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: availableSpecializations.map((spec) {
                    final isSelected = selectedSpecializations.contains(spec);
                    return FilterChip(
                      label: Text(spec),
                      selected: isSelected,
                      onSelected: (selected) {
                        setDialogState(() {
                          if (selected) {
                            selectedSpecializations.add(spec);
                          } else {
                            selectedSpecializations.remove(spec);
                          }
                        });
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                if (nameController.text.isNotEmpty) {
                  context.read<SalonBloc>().add(CreateStaff(
                    data: {
                      'name': nameController.text,
                      'phone': phoneController.text,
                      'email': emailController.text,
                      'commission':
                          double.tryParse(commissionController.text) ?? 0,
                      'specializations': selectedSpecializations,
                      'isActive': true,
                    },
                  ));
                  Navigator.pop(context);
                }
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  void _showStaffDetailsDialog(SalonStaff staff) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            CircleAvatar(
              backgroundColor: staff.isActive ? Colors.blue : Colors.grey,
              child: Text(
                staff.name.substring(0, 1).toUpperCase(),
                style: const TextStyle(color: Colors.white),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(staff.name)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (staff.phone != null) _buildDetailRow('Phone', staff.phone!),
            if (staff.email != null) _buildDetailRow('Email', staff.email!),
            _buildDetailRow(
              'Commission',
              '${staff.commission.toStringAsFixed(1)}%',
            ),
            _buildDetailRow('Status', staff.isActive ? 'Active' : 'Inactive'),
            if (staff.specializations.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text(
                'Specializations:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Wrap(
                spacing: 4,
                runSpacing: 4,
                children: staff.specializations.map((spec) {
                  return Chip(
                    label: Text(spec),
                    labelStyle: const TextStyle(fontSize: 10),
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  );
                }).toList(),
              ),
            ],
            if (staff.workingHours.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text(
                'Working Hours:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              ...staff.workingHours.where((wh) => wh.isWorking).map((wh) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(wh.dayOfWeek),
                      Text('${wh.startTime ?? ''} - ${wh.endTime ?? ''}'),
                    ],
                  ),
                );
              }),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<SalonBloc>().add(UpdateStaff(
                id: staff.id,
                data: {'isActive': !staff.isActive},
              ));
            },
            child: Text(
              staff.isActive ? 'Deactivate' : 'Activate',
              style: TextStyle(
                color: staff.isActive ? Colors.red : Colors.green,
              ),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
            },
            child: const Text('Edit'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
