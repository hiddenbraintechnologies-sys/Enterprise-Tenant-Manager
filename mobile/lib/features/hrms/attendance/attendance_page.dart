import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/attendance_bloc.dart';
import '../data/models/hr_models.dart';

class AttendancePage extends StatefulWidget {
  const AttendancePage({super.key});

  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  DateTime _selectedDate = DateTime.now();
  String _selectedView = 'daily';

  @override
  void initState() {
    super.initState();
    _loadAttendance();
  }

  void _loadAttendance() {
    context.read<AttendanceBloc>().add(LoadAttendance(date: _selectedDate));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month),
            onPressed: _selectDate,
          ),
        ],
      ),
      body: BlocConsumer<AttendanceBloc, AttendanceState>(
        listener: (context, state) {
          if (state is AttendanceActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          } else if (state is AttendanceError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        builder: (context, state) {
          return Column(
            children: [
              _buildViewToggle(),
              _buildDateHeader(),
              if (state is AttendanceLoaded) _buildSummaryRow(state),
              Expanded(
                child: _buildContent(state),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showMarkAttendanceDialog,
        icon: const Icon(Icons.check),
        label: const Text('Mark Attendance'),
      ),
    );
  }

  Widget _buildViewToggle() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: SegmentedButton<String>(
        segments: const [
          ButtonSegment(value: 'daily', label: Text('Daily')),
          ButtonSegment(value: 'weekly', label: Text('Weekly')),
          ButtonSegment(value: 'monthly', label: Text('Monthly')),
        ],
        selected: {_selectedView},
        onSelectionChanged: (value) {
          setState(() => _selectedView = value.first);
        },
      ),
    );
  }

  Widget _buildDateHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () {
              setState(() {
                _selectedDate = _selectedDate.subtract(const Duration(days: 1));
              });
              _loadAttendance();
            },
          ),
          Text(
            '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () {
              setState(() {
                _selectedDate = _selectedDate.add(const Duration(days: 1));
              });
              _loadAttendance();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(AttendanceLoaded state) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildSummaryItem('Present', '${state.presentCount}', Colors.green),
          _buildSummaryItem('Absent', '${state.absentCount}', Colors.red),
          _buildSummaryItem('On Leave', '${state.onLeaveCount}', Colors.orange),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }

  Widget _buildContent(AttendanceState state) {
    if (state is AttendanceLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is AttendanceError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 16),
            Text(state.message),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadAttendance,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state is AttendanceLoaded) {
      if (state.records.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.schedule, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(height: 16),
              Text(
                'No attendance records',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'No attendance marked for this date',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        );
      }

      return RefreshIndicator(
        onRefresh: () async => _loadAttendance(),
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: state.records.length,
          itemBuilder: (context, index) {
            final record = state.records[index];
            return Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.person)),
                title: Text(record.employeeName ?? 'Employee'),
                subtitle: Text(
                  'Check-in: ${record.checkIn ?? '--'} | Check-out: ${record.checkOut ?? '--'}',
                ),
                trailing: _buildStatusChip(record.status),
              ),
            );
          },
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'present':
        color = Colors.green;
        break;
      case 'absent':
        color = Colors.red;
        break;
      case 'half_day':
        color = Colors.orange;
        break;
      case 'leave':
        color = Colors.blue;
        break;
      default:
        color = Colors.grey;
    }

    return Chip(
      label: Text(
        status.toUpperCase().replaceAll('_', ' '),
        style: TextStyle(color: color, fontSize: 10),
      ),
      backgroundColor: color.withOpacity(0.1),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (date != null) {
      setState(() => _selectedDate = date);
      _loadAttendance();
    }
  }

  void _showMarkAttendanceDialog() {
    String? selectedEmployeeId;
    String selectedStatus = 'present';
    
    final bloc = context.read<AttendanceBloc>();
    List<HrEmployee> employees = [];
    final state = bloc.state;
    if (state is AttendanceLoaded) {
      employees = state.employees;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 16,
                right: 16,
                top: 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Mark Attendance',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: selectedEmployeeId,
                    decoration: const InputDecoration(
                      labelText: 'Select Employee',
                      border: OutlineInputBorder(),
                    ),
                    items: employees.map((e) => DropdownMenuItem(
                          value: e.id,
                          child: Text(e.fullName),
                        )).toList(),
                    onChanged: (value) {
                      setModalState(() => selectedEmployeeId = value);
                    },
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: selectedStatus,
                    decoration: const InputDecoration(
                      labelText: 'Status',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'present', child: Text('Present')),
                      DropdownMenuItem(value: 'absent', child: Text('Absent')),
                      DropdownMenuItem(value: 'half_day', child: Text('Half Day')),
                      DropdownMenuItem(value: 'leave', child: Text('On Leave')),
                    ],
                    onChanged: (value) {
                      setModalState(() => selectedStatus = value ?? 'present');
                    },
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: selectedEmployeeId == null
                          ? null
                          : () {
                              Navigator.pop(context);
                              final dateStr = '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';
                              bloc.add(MarkAttendance({
                                'employeeId': selectedEmployeeId,
                                'date': dateStr,
                                'status': selectedStatus,
                              }));
                            },
                      child: const Text('Save'),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
