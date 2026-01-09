import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/gym_attendance.dart';
import '../bloc/gym_bloc.dart';
import '../bloc/gym_event.dart';
import '../bloc/gym_state.dart';

class AttendancePage extends StatefulWidget {
  final String? memberId;

  const AttendancePage({
    super.key,
    this.memberId,
  });

  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadAttendance();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _loadAttendance() {
    context.read<GymBloc>().add(LoadAttendance(
      memberId: widget.memberId,
      date: _selectedDate,
    ));
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      context.read<GymBloc>().add(const LoadMoreAttendance());
    }
  }

  void _onSearch(String query) {
    context.read<GymBloc>().add(LoadAttendance(
      search: query.isEmpty ? null : query,
      memberId: widget.memberId,
      date: _selectedDate,
    ));
  }

  void _onDateChanged(DateTime date) {
    setState(() => _selectedDate = date);
    context.read<GymBloc>().add(LoadAttendance(
      memberId: widget.memberId,
      date: date,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: _showDatePicker,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search by member...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onChanged: _onSearch,
                  ),
                ),
              ],
            ),
          ),
          _buildDateSelector(),
          Expanded(
            child: BlocBuilder<GymBloc, GymState>(
              builder: (context, state) {
                if (state.attendanceStatus == GymStatus.loading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.attendanceStatus == GymStatus.failure) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(state.attendanceError ?? 'Failed to load attendance'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadAttendance,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state.attendance.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.event_busy,
                          size: 64,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No attendance records for ${_formatDate(_selectedDate)}',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    _loadAttendance();
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: state.attendance.length +
                        (state.attendanceStatus == GymStatus.loadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index >= state.attendance.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      final attendance = state.attendance[index];
                      return _buildAttendanceCard(attendance);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCheckInDialog,
        icon: const Icon(Icons.login),
        label: const Text('Check In'),
      ),
    );
  }

  Widget _buildDateSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () {
              _onDateChanged(_selectedDate.subtract(const Duration(days: 1)));
            },
          ),
          GestureDetector(
            onTap: _showDatePicker,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.calendar_today, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    _formatDate(_selectedDate),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: _selectedDate.isBefore(DateTime.now())
                ? () {
                    _onDateChanged(_selectedDate.add(const Duration(days: 1)));
                  }
                : null,
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceCard(GymAttendance attendance) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: attendance.isCheckedOut ? Colors.green : Colors.orange,
          child: Icon(
            attendance.isCheckedOut ? Icons.check : Icons.access_time,
            color: Colors.white,
          ),
        ),
        title: Text(attendance.memberName ?? 'Unknown Member'),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Check-in: ${_formatTime(attendance.checkIn)}',
            ),
            if (attendance.checkOut != null)
              Text(
                'Check-out: ${_formatTime(attendance.checkOut!)}',
              ),
            if (attendance.notes != null)
              Text(
                'Note: ${attendance.notes}',
                style: TextStyle(
                  fontStyle: FontStyle.italic,
                  color: Colors.grey[600],
                ),
              ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              attendance.formattedDuration,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            if (!attendance.isCheckedOut)
              TextButton(
                onPressed: () => _checkOut(attendance),
                child: const Text('Check Out'),
              ),
          ],
        ),
        isThreeLine: true,
      ),
    );
  }

  void _showDatePicker() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );

    if (date != null) {
      _onDateChanged(date);
    }
  }

  void _showCheckInDialog() {
    final memberIdController = TextEditingController();
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Member Check-In'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: memberIdController,
              decoration: const InputDecoration(
                labelText: 'Member ID or Phone',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.person),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (memberIdController.text.isNotEmpty) {
                context.read<GymBloc>().add(CheckInMember(
                  memberIdController.text,
                  notes: notesController.text.isNotEmpty
                      ? notesController.text
                      : null,
                ));
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Member checked in successfully')),
                );
              }
            },
            child: const Text('Check In'),
          ),
        ],
      ),
    );
  }

  void _checkOut(GymAttendance attendance) {
    showDialog(
      context: context,
      builder: (context) {
        final notesController = TextEditingController();
        return AlertDialog(
          title: const Text('Check Out'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Check out ${attendance.memberName ?? 'member'}?'),
              const SizedBox(height: 16),
              TextField(
                controller: notesController,
                decoration: const InputDecoration(
                  labelText: 'Notes (optional)',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                context.read<GymBloc>().add(CheckOutMember(
                  attendance.id,
                  notes: notesController.text.isNotEmpty
                      ? notesController.text
                      : null,
                ));
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Member checked out successfully')),
                );
              },
              child: const Text('Check Out'),
            ),
          ],
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    if (date.year == now.year &&
        date.month == now.month &&
        date.day == now.day) {
      return 'Today';
    }
    if (date.year == now.year &&
        date.month == now.month &&
        date.day == now.day - 1) {
      return 'Yesterday';
    }
    return '${date.day}/${date.month}/${date.year}';
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
