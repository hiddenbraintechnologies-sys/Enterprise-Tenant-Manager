import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/gym_member.dart';
import '../bloc/gym_bloc.dart';
import '../bloc/gym_event.dart';
import '../bloc/gym_state.dart';

class MemberDetailPage extends StatefulWidget {
  final String memberId;

  const MemberDetailPage({
    super.key,
    required this.memberId,
  });

  @override
  State<MemberDetailPage> createState() => _MemberDetailPageState();
}

class _MemberDetailPageState extends State<MemberDetailPage> {
  @override
  void initState() {
    super.initState();
    context.read<GymBloc>().add(LoadMemberDetail(widget.memberId));
    context.read<GymBloc>().add(LoadAttendance(memberId: widget.memberId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Member Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              Navigator.pushNamed(
                context,
                '/gym/members/${widget.memberId}/edit',
              );
            },
          ),
        ],
      ),
      body: BlocBuilder<GymBloc, GymState>(
        builder: (context, state) {
          if (state.memberDetailStatus == GymStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.memberDetailStatus == GymStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.memberDetailError ?? 'Failed to load member'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<GymBloc>().add(
                            LoadMemberDetail(widget.memberId),
                          );
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final member = state.selectedMember;
          if (member == null) {
            return const Center(child: Text('Member not found'));
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildMemberHeader(member),
                const SizedBox(height: 24),
                _buildMembershipCard(member, state),
                const SizedBox(height: 24),
                _buildContactInfo(member),
                const SizedBox(height: 24),
                _buildAttendanceHistory(state),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildMemberHeader(GymMember member) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: _getStatusColor(member.status),
              backgroundImage:
                  member.photoUrl != null ? NetworkImage(member.photoUrl!) : null,
              child: member.photoUrl == null
                  ? Text(
                      member.name[0].toUpperCase(),
                      style: const TextStyle(
                        fontSize: 32,
                        color: Colors.white,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    member.name,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      _buildStatusChip(member.status),
                      const SizedBox(width: 8),
                      Text(
                        member.membershipType,
                        style: TextStyle(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMembershipCard(GymMember member, GymState state) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Membership',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (member.isActive)
                  TextButton(
                    onPressed: () => _showRenewDialog(member),
                    child: const Text('Renew'),
                  ),
              ],
            ),
            const Divider(),
            _buildInfoRow('Type', member.membershipType),
            _buildInfoRow('Start Date', _formatDate(member.startDate)),
            _buildInfoRow('End Date', _formatDate(member.endDate)),
            _buildInfoRow(
              'Status',
              member.isExpired
                  ? 'Expired'
                  : '${member.daysUntilExpiry} days remaining',
              valueColor: member.isExpired
                  ? Colors.red
                  : member.daysUntilExpiry <= 7
                      ? Colors.orange
                      : Colors.green,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactInfo(GymMember member) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Contact Information',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Divider(),
            _buildInfoRow('Phone', member.phone),
            if (member.email != null) _buildInfoRow('Email', member.email!),
            if (member.address != null) _buildInfoRow('Address', member.address!),
            const SizedBox(height: 16),
            const Text(
              'Emergency Contact',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            if (member.emergencyContact != null)
              _buildInfoRow('Name', member.emergencyContact!),
            if (member.emergencyPhone != null)
              _buildInfoRow('Phone', member.emergencyPhone!),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceHistory(GymState state) {
    final attendance = state.attendance
        .where((a) => a.memberId == widget.memberId)
        .take(10)
        .toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recent Attendance',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      '/gym/attendance',
                      arguments: {'memberId': widget.memberId},
                    );
                  },
                  child: const Text('View All'),
                ),
              ],
            ),
            const Divider(),
            if (state.attendanceStatus == GymStatus.loading)
              const Center(child: CircularProgressIndicator())
            else if (attendance.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: Text('No attendance records')),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: attendance.length,
                itemBuilder: (context, index) {
                  final record = attendance[index];
                  return ListTile(
                    dense: true,
                    leading: Icon(
                      record.isCheckedOut
                          ? Icons.check_circle
                          : Icons.access_time,
                      color: record.isCheckedOut ? Colors.green : Colors.orange,
                    ),
                    title: Text(_formatDate(record.date)),
                    subtitle: Text(
                      'Check-in: ${_formatTime(record.checkIn)}${record.checkOut != null ? ' - Check-out: ${_formatTime(record.checkOut!)}' : ''}',
                    ),
                    trailing: Text(record.formattedDuration),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: Colors.grey[600]),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: _getStatusColor(status).withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: _getStatusColor(status),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return Colors.green;
      case 'expired':
        return Colors.red;
      case 'suspended':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  void _showRenewDialog(GymMember member) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Renew Membership'),
        content: const Text('Select a subscription plan to renew membership.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pushNamed(
                context,
                '/gym/members/${member.id}/renew',
              );
            },
            child: const Text('Select Plan'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
