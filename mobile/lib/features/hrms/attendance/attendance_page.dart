import 'package:flutter/material.dart';

class AttendancePage extends StatefulWidget {
  const AttendancePage({super.key});

  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  DateTime _selectedDate = DateTime.now();
  String _selectedView = 'daily';

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
      body: Column(
        children: [
          _buildViewToggle(),
          _buildDateHeader(),
          Expanded(
            child: _buildAttendanceList(),
          ),
        ],
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
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 0,
      itemBuilder: (context, index) {
        return Card(
          child: ListTile(
            leading: const CircleAvatar(child: Icon(Icons.person)),
            title: const Text('Employee Name'),
            subtitle: const Text('Check-in: -- | Check-out: --'),
            trailing: _buildStatusChip('present'),
          ),
        );
      },
    );
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

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (date != null) {
      setState(() => _selectedDate = date);
    }
  }

  void _showMarkAttendanceDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
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
                decoration: const InputDecoration(
                  labelText: 'Select Employee',
                  border: OutlineInputBorder(),
                ),
                items: const [],
                onChanged: (value) {},
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
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
                onChanged: (value) {},
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    Navigator.pop(context);
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
  }
}
