import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/gym_member.dart';
import '../bloc/gym_bloc.dart';
import '../bloc/gym_event.dart';
import '../bloc/gym_state.dart';

class MembersPage extends StatefulWidget {
  const MembersPage({super.key});

  @override
  State<MembersPage> createState() => _MembersPageState();
}

class _MembersPageState extends State<MembersPage> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  String? _selectedStatus;

  @override
  void initState() {
    super.initState();
    context.read<GymBloc>().add(const LoadMembers());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      context.read<GymBloc>().add(const LoadMoreMembers());
    }
  }

  void _onSearch(String query) {
    context.read<GymBloc>().add(LoadMembers(
      search: query.isEmpty ? null : query,
      status: _selectedStatus,
    ));
  }

  void _onStatusFilter(String? status) {
    setState(() => _selectedStatus = status);
    context.read<GymBloc>().add(LoadMembers(
      search: _searchController.text.isEmpty ? null : _searchController.text,
      status: status,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Members'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: _onStatusFilter,
            itemBuilder: (context) => [
              const PopupMenuItem(value: null, child: Text('All')),
              const PopupMenuItem(value: 'active', child: Text('Active')),
              const PopupMenuItem(value: 'expired', child: Text('Expired')),
              const PopupMenuItem(value: 'suspended', child: Text('Suspended')),
            ],
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
                hintText: 'Search members...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _onSearch('');
                        },
                      )
                    : null,
              ),
              onChanged: _onSearch,
            ),
          ),
          if (_selectedStatus != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Chip(
                    label: Text('Status: $_selectedStatus'),
                    onDeleted: () => _onStatusFilter(null),
                  ),
                ],
              ),
            ),
          Expanded(
            child: BlocBuilder<GymBloc, GymState>(
              builder: (context, state) {
                if (state.membersStatus == GymStatus.loading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.membersStatus == GymStatus.failure) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(state.membersError ?? 'Failed to load members'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            context.read<GymBloc>().add(const LoadMembers());
                          },
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state.members.isEmpty) {
                  return const Center(
                    child: Text('No members found'),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<GymBloc>().add(LoadMembers(
                      search: _searchController.text.isEmpty
                          ? null
                          : _searchController.text,
                      status: _selectedStatus,
                    ));
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: state.members.length +
                        (state.membersStatus == GymStatus.loadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index >= state.members.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      final member = state.members[index];
                      return _buildMemberCard(member);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.pushNamed(context, '/gym/members/add');
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildMemberCard(GymMember member) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getStatusColor(member.status),
          child: Text(
            member.name[0].toUpperCase(),
            style: const TextStyle(color: Colors.white),
          ),
        ),
        title: Text(member.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(member.phone),
            const SizedBox(height: 4),
            Row(
              children: [
                _buildStatusChip(member.status),
                const SizedBox(width: 8),
                Text(
                  member.membershipType,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (member.isExpired)
              const Text(
                'Expired',
                style: TextStyle(color: Colors.red, fontSize: 12),
              )
            else
              Text(
                '${member.daysUntilExpiry}d left',
                style: TextStyle(
                  color: member.daysUntilExpiry <= 7
                      ? Colors.orange
                      : Colors.green,
                  fontSize: 12,
                ),
              ),
            const Icon(Icons.chevron_right),
          ],
        ),
        onTap: () {
          Navigator.pushNamed(context, '/gym/members/${member.id}');
        },
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
}
