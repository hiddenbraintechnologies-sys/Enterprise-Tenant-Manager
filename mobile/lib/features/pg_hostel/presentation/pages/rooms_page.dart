import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/pg_room.dart';
import '../bloc/pg_bloc.dart';
import '../bloc/pg_event.dart';
import '../bloc/pg_state.dart';

class RoomsPage extends StatefulWidget {
  const RoomsPage({super.key});

  @override
  State<RoomsPage> createState() => _RoomsPageState();
}

class _RoomsPageState extends State<RoomsPage> {
  final ScrollController _scrollController = ScrollController();
  String? _selectedType;
  bool? _isOccupied;

  @override
  void initState() {
    super.initState();
    _loadRooms();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _loadRooms() {
    context.read<PgBloc>().add(LoadRooms(
          type: _selectedType,
          isOccupied: _isOccupied,
        ));
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.9) {
      context.read<PgBloc>().add(const LoadMoreRooms());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rooms'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: BlocBuilder<PgBloc, PgState>(
        builder: (context, state) {
          if (state.roomsStatus == PgStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.roomsStatus == PgStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.roomsError ?? 'Error loading rooms'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadRooms,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state.rooms.isEmpty) {
            return const Center(child: Text('No rooms found'));
          }

          return RefreshIndicator(
            onRefresh: () async => _loadRooms(),
            child: GridView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.85,
              ),
              itemCount: state.rooms.length +
                  (state.roomsStatus == PgStatus.loadingMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index >= state.rooms.length) {
                  return const Center(child: CircularProgressIndicator());
                }
                return _buildRoomCard(state.rooms[index]);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddRoomDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildRoomCard(PgRoom room) {
    final typeColors = {
      RoomType.single: Colors.blue,
      RoomType.double: Colors.green,
      RoomType.triple: Colors.orange,
      RoomType.dormitory: Colors.purple,
    };

    final color = typeColors[room.type] ?? Colors.grey;

    return Card(
      elevation: 2,
      child: InkWell(
        onTap: () => _showRoomDetails(room),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CircleAvatar(
                    backgroundColor: color.withOpacity(0.2),
                    child: Icon(Icons.meeting_room, color: color),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: room.isOccupied ? Colors.red[100] : Colors.green[100],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      room.isOccupied ? 'Occupied' : 'Available',
                      style: TextStyle(
                        fontSize: 10,
                        color: room.isOccupied ? Colors.red : Colors.green,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Text(
                'Room ${room.roomNumber}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Floor ${room.floor} • ${room.type.name.toUpperCase()}',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.bed, size: 14, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '${room.currentOccupancy ?? 0}/${room.beds} beds',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '\$${room.rent.toStringAsFixed(0)}/month',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
                    'Filter Rooms',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String?>(
                    value: _selectedType,
                    decoration: const InputDecoration(
                      labelText: 'Room Type',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All Types')),
                      DropdownMenuItem(value: 'single', child: Text('Single')),
                      DropdownMenuItem(value: 'double', child: Text('Double')),
                      DropdownMenuItem(value: 'triple', child: Text('Triple')),
                      DropdownMenuItem(value: 'dormitory', child: Text('Dormitory')),
                    ],
                    onChanged: (value) {
                      setModalState(() => _selectedType = value);
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<bool?>(
                    value: _isOccupied,
                    decoration: const InputDecoration(
                      labelText: 'Occupancy Status',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: true, child: Text('Occupied')),
                      DropdownMenuItem(value: false, child: Text('Available')),
                    ],
                    onChanged: (value) {
                      setModalState(() => _isOccupied = value);
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setModalState(() {
                              _selectedType = null;
                              _isOccupied = null;
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
                            _loadRooms();
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

  void _showAddRoomDialog() {
    final formKey = GlobalKey<FormState>();
    final roomNumberController = TextEditingController();
    final floorController = TextEditingController();
    final rentController = TextEditingController();
    final depositController = TextEditingController();
    final bedsController = TextEditingController();
    String selectedType = 'single';

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Add Room'),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: roomNumberController,
                    decoration: const InputDecoration(labelText: 'Room Number'),
                    validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: floorController,
                    decoration: const InputDecoration(labelText: 'Floor'),
                    keyboardType: TextInputType.number,
                    validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: selectedType,
                    decoration: const InputDecoration(labelText: 'Room Type'),
                    items: const [
                      DropdownMenuItem(value: 'single', child: Text('Single')),
                      DropdownMenuItem(value: 'double', child: Text('Double')),
                      DropdownMenuItem(value: 'triple', child: Text('Triple')),
                      DropdownMenuItem(value: 'dormitory', child: Text('Dormitory')),
                    ],
                    onChanged: (v) => selectedType = v!,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: bedsController,
                    decoration: const InputDecoration(labelText: 'Number of Beds'),
                    keyboardType: TextInputType.number,
                    validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: rentController,
                    decoration: const InputDecoration(labelText: 'Monthly Rent'),
                    keyboardType: TextInputType.number,
                    validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: depositController,
                    decoration: const InputDecoration(labelText: 'Deposit'),
                    keyboardType: TextInputType.number,
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
              onPressed: () {
                if (formKey.currentState!.validate()) {
                  context.read<PgBloc>().add(CreateRoom({
                        'roomNumber': roomNumberController.text,
                        'floor': int.parse(floorController.text),
                        'type': selectedType,
                        'beds': int.parse(bedsController.text),
                        'capacity': int.parse(bedsController.text),
                        'rent': double.parse(rentController.text),
                        'deposit': double.parse(depositController.text),
                        'amenities': [],
                      }));
                  Navigator.pop(context);
                }
              },
              child: const Text('Add'),
            ),
          ],
        );
      },
    );
  }

  void _showRoomDetails(PgRoom room) {
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
                    'Room ${room.roomNumber}',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildDetailRow('Floor', '${room.floor}'),
                  _buildDetailRow('Type', room.type.name.toUpperCase()),
                  _buildDetailRow('Beds', '${room.beds}'),
                  _buildDetailRow(
                    'Occupancy',
                    '${room.currentOccupancy ?? 0}/${room.capacity}',
                  ),
                  _buildDetailRow(
                    'Status',
                    room.isOccupied ? 'Occupied' : 'Available',
                  ),
                  _buildDetailRow('Rent', '\$${room.rent.toStringAsFixed(2)}/month'),
                  _buildDetailRow('Deposit', '\$${room.deposit.toStringAsFixed(2)}'),
                  const SizedBox(height: 16),
                  if (room.amenities.isNotEmpty) ...[
                    const Text(
                      'Amenities',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: room.amenities
                          .map((a) => Chip(label: Text(a)))
                          .toList(),
                    ),
                  ],
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
