import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/employee_bloc.dart';
import '../data/models/hr_models.dart';

class EmployeeDirectoryPage extends StatefulWidget {
  const EmployeeDirectoryPage({super.key});

  @override
  State<EmployeeDirectoryPage> createState() => _EmployeeDirectoryPageState();
}

class _EmployeeDirectoryPageState extends State<EmployeeDirectoryPage> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedFilter = 'all';
  String? _selectedDepartment;

  @override
  void initState() {
    super.initState();
    context.read<EmployeeBloc>().add(LoadEmployees());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applyFilters() {
    context.read<EmployeeBloc>().add(LoadEmployees(
      status: _selectedFilter == 'all' ? null : _selectedFilter,
      departmentId: _selectedDepartment,
      search: _searchController.text,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Employee Directory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterBottomSheet,
          ),
        ],
      ),
      body: BlocConsumer<EmployeeBloc, EmployeeState>(
        listener: (context, state) {
          if (state is EmployeeActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          } else if (state is EmployeeError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        builder: (context, state) {
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search employees...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _applyFilters();
                            },
                          )
                        : null,
                  ),
                  onSubmitted: (_) => _applyFilters(),
                  onChanged: (value) {
                    setState(() {});
                  },
                ),
              ),
              Expanded(
                child: _buildContent(state),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.pushNamed(context, '/hr/employees/add'),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildContent(EmployeeState state) {
    if (state is EmployeeLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is EmployeeError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 16),
            Text(state.message),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => context.read<EmployeeBloc>().add(LoadEmployees()),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state is EmployeeLoaded) {
      if (state.employees.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.people_outline, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(height: 16),
              Text(
                'No employees found',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Add your first employee to get started',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        );
      }

      return RefreshIndicator(
        onRefresh: () async {
          context.read<EmployeeBloc>().add(RefreshEmployees());
        },
        child: ListView.builder(
          itemCount: state.employees.length,
          itemBuilder: (context, index) {
            return _buildEmployeeCard(state.employees[index]);
          },
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildEmployeeCard(HrEmployee employee) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundImage: employee.profileImageUrl != null
              ? NetworkImage(employee.profileImageUrl!)
              : null,
          child: employee.profileImageUrl == null
              ? Text(employee.firstName[0].toUpperCase())
              : null,
        ),
        title: Text(employee.fullName),
        subtitle: Text(
          [employee.departmentName, employee.position]
              .where((e) => e != null)
              .join(' - '),
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            switch (value) {
              case 'edit':
                Navigator.pushNamed(context, '/hr/employees/${employee.id}/edit');
                break;
              case 'view':
                Navigator.pushNamed(context, '/hr/employees/${employee.id}');
                break;
              case 'delete':
                _showDeleteConfirmation(employee);
                break;
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(value: 'view', child: Text('View Details')),
            const PopupMenuItem(value: 'edit', child: Text('Edit')),
            const PopupMenuItem(
              value: 'delete',
              child: Text('Delete', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
        onTap: () => Navigator.pushNamed(context, '/hr/employees/${employee.id}'),
      ),
    );
  }

  void _showDeleteConfirmation(HrEmployee employee) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Employee'),
        content: Text('Are you sure you want to delete ${employee.fullName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<EmployeeBloc>().add(DeleteEmployee(employee.id));
            },
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showFilterBottomSheet() {
    final bloc = context.read<EmployeeBloc>();
    List<HrDepartment> departments = [];
    final state = bloc.state;
    if (state is EmployeeLoaded) {
      departments = state.departments;
    }

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
                  Text(
                    'Filter Employees',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 16),
                  Text('Status', style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      FilterChip(
                        label: const Text('All'),
                        selected: _selectedFilter == 'all',
                        onSelected: (selected) {
                          setModalState(() => _selectedFilter = 'all');
                          setState(() {});
                        },
                      ),
                      FilterChip(
                        label: const Text('Active'),
                        selected: _selectedFilter == 'active',
                        onSelected: (selected) {
                          setModalState(() => _selectedFilter = 'active');
                          setState(() {});
                        },
                      ),
                      FilterChip(
                        label: const Text('Inactive'),
                        selected: _selectedFilter == 'inactive',
                        onSelected: (selected) {
                          setModalState(() => _selectedFilter = 'inactive');
                          setState(() {});
                        },
                      ),
                    ],
                  ),
                  if (departments.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text('Department', style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _selectedDepartment,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      hint: const Text('All Departments'),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('All Departments')),
                        ...departments.map((d) => DropdownMenuItem(
                              value: d.id,
                              child: Text(d.name),
                            )),
                      ],
                      onChanged: (value) {
                        setModalState(() => _selectedDepartment = value);
                        setState(() {});
                      },
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _applyFilters();
                      },
                      child: const Text('Apply Filter'),
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
