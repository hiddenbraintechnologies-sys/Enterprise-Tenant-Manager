import 'package:flutter/material.dart';

class EmployeeDirectoryPage extends StatefulWidget {
  const EmployeeDirectoryPage({super.key});

  @override
  State<EmployeeDirectoryPage> createState() => _EmployeeDirectoryPageState();
}

class _EmployeeDirectoryPageState extends State<EmployeeDirectoryPage> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedFilter = 'all';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
      body: Column(
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
              ),
              onChanged: (value) {
                setState(() {});
              },
            ),
          ),
          Expanded(
            child: _buildEmployeeList(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.pushNamed(context, '/hr/employees/add');
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildEmployeeList() {
    return ListView.builder(
      itemCount: 0,
      itemBuilder: (context, index) {
        return _buildEmployeeCard(index);
      },
    );
  }

  Widget _buildEmployeeCard(int index) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: const CircleAvatar(
          child: Icon(Icons.person),
        ),
        title: const Text('Employee Name'),
        subtitle: const Text('Department - Position'),
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            switch (value) {
              case 'edit':
                // Navigate to edit
                break;
              case 'view':
                // Navigate to view details
                break;
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(value: 'view', child: Text('View Details')),
            const PopupMenuItem(value: 'edit', child: Text('Edit')),
          ],
        ),
        onTap: () {
          // Navigate to employee details
        },
      ),
    );
  }

  void _showFilterBottomSheet() {
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
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.pop(context),
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
