import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/pg_resident.dart';
import '../bloc/pg_bloc.dart';
import '../bloc/pg_event.dart';
import '../bloc/pg_state.dart';

class ResidentsPage extends StatefulWidget {
  const ResidentsPage({super.key});

  @override
  State<ResidentsPage> createState() => _ResidentsPageState();
}

class _ResidentsPageState extends State<ResidentsPage> {
  final ScrollController _scrollController = ScrollController();
  String? _selectedStatus;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadResidents();
    context.read<PgBloc>().add(const LoadAvailableRooms());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _loadResidents() {
    context.read<PgBloc>().add(LoadResidents(
          status: _selectedStatus,
          search: _searchController.text.isNotEmpty ? _searchController.text : null,
        ));
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.9) {
      context.read<PgBloc>().add(const LoadMoreResidents());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Residents'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search residents...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _loadResidents();
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                filled: true,
                fillColor: Theme.of(context).cardColor,
              ),
              onSubmitted: (_) => _loadResidents(),
            ),
          ),
        ),
        actions: [
          PopupMenuButton<String?>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() => _selectedStatus = value);
              _loadResidents();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: null, child: Text('All')),
              const PopupMenuItem(value: 'active', child: Text('Active')),
              const PopupMenuItem(value: 'vacated', child: Text('Vacated')),
            ],
          ),
        ],
      ),
      body: BlocBuilder<PgBloc, PgState>(
        builder: (context, state) {
          if (state.residentsStatus == PgStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.residentsStatus == PgStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.residentsError ?? 'Error loading residents'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadResidents,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state.residents.isEmpty) {
            return const Center(child: Text('No residents found'));
          }

          return RefreshIndicator(
            onRefresh: () async => _loadResidents(),
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: state.residents.length +
                  (state.residentsStatus == PgStatus.loadingMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index >= state.residents.length) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }
                return _buildResidentCard(state.residents[index]);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddResidentDialog,
        child: const Icon(Icons.person_add),
      ),
    );
  }

  Widget _buildResidentCard(PgResident resident) {
    final isActive = resident.status == ResidentStatus.active;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showResidentDetails(resident),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: isActive ? Colors.green[100] : Colors.grey[200],
                child: Text(
                  resident.name.isNotEmpty ? resident.name[0].toUpperCase() : '?',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: isActive ? Colors.green : Colors.grey,
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
                            resident.name,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: isActive ? Colors.green[100] : Colors.grey[200],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            resident.status.name.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isActive ? Colors.green : Colors.grey,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      resident.phone,
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.meeting_room, size: 14, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          'Room ${resident.roomNumber ?? 'N/A'}',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                        const SizedBox(width: 16),
                        Icon(Icons.calendar_today, size: 14, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          'Since ${_formatDate(resident.checkInDate)}',
                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (isActive)
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'checkout') {
                      _confirmCheckout(resident);
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'checkout',
                      child: Row(
                        children: [
                          Icon(Icons.logout, size: 18),
                          SizedBox(width: 8),
                          Text('Check Out'),
                        ],
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _showAddResidentDialog() {
    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final emailController = TextEditingController();
    final occupationController = TextEditingController();
    String? selectedRoomId;

    showDialog(
      context: context,
      builder: (context) {
        return BlocBuilder<PgBloc, PgState>(
          builder: (context, state) {
            return AlertDialog(
              title: const Text('Add Resident'),
              content: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: nameController,
                        decoration: const InputDecoration(labelText: 'Name'),
                        validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: phoneController,
                        decoration: const InputDecoration(labelText: 'Phone'),
                        keyboardType: TextInputType.phone,
                        validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: emailController,
                        decoration: const InputDecoration(labelText: 'Email (Optional)'),
                        keyboardType: TextInputType.emailAddress,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: occupationController,
                        decoration: const InputDecoration(labelText: 'Occupation (Optional)'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedRoomId,
                        decoration: const InputDecoration(labelText: 'Select Room'),
                        validator: (v) => v == null ? 'Required' : null,
                        items: state.availableRooms
                            .map((room) => DropdownMenuItem(
                                  value: room.id,
                                  child: Text(
                                    'Room ${room.roomNumber} (${room.type.name})',
                                  ),
                                ))
                            .toList(),
                        onChanged: (v) => selectedRoomId = v,
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
                            context.read<PgBloc>().add(CreateResident({
                                  'name': nameController.text,
                                  'phone': phoneController.text,
                                  'email': emailController.text.isNotEmpty
                                      ? emailController.text
                                      : null,
                                  'occupation': occupationController.text.isNotEmpty
                                      ? occupationController.text
                                      : null,
                                  'roomId': selectedRoomId,
                                  'checkInDate': DateTime.now().toIso8601String(),
                                  'status': 'active',
                                  'rentDueDate': 1,
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
                      : const Text('Add'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showResidentDetails(PgResident resident) {
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
                  Center(
                    child: CircleAvatar(
                      radius: 40,
                      backgroundColor: resident.status == ResidentStatus.active
                          ? Colors.green[100]
                          : Colors.grey[200],
                      child: Text(
                        resident.name.isNotEmpty
                            ? resident.name[0].toUpperCase()
                            : '?',
                        style: const TextStyle(fontSize: 32),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: Text(
                      resident.name,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildDetailRow('Phone', resident.phone),
                  if (resident.email != null)
                    _buildDetailRow('Email', resident.email!),
                  if (resident.occupation != null)
                    _buildDetailRow('Occupation', resident.occupation!),
                  if (resident.employer != null)
                    _buildDetailRow('Employer', resident.employer!),
                  _buildDetailRow('Room', resident.roomNumber ?? 'N/A'),
                  _buildDetailRow('Check-in', _formatDate(resident.checkInDate)),
                  if (resident.checkOutDate != null)
                    _buildDetailRow('Check-out', _formatDate(resident.checkOutDate!)),
                  _buildDetailRow('Status', resident.status.name.toUpperCase()),
                  _buildDetailRow('Rent Due Date', '${resident.rentDueDate}th of month'),
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

  void _confirmCheckout(PgResident resident) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Confirm Check Out'),
          content: Text('Are you sure you want to check out ${resident.name}?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () {
                context.read<PgBloc>().add(CheckOutResident(resident.id));
                Navigator.pop(context);
              },
              child: const Text('Check Out'),
            ),
          ],
        );
      },
    );
  }
}
