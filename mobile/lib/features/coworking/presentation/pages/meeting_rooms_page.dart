import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/coworking_meeting_room.dart';
import '../bloc/coworking_bloc.dart';
import '../bloc/coworking_event.dart';
import '../bloc/coworking_state.dart';

class MeetingRoomsPage extends StatefulWidget {
  const MeetingRoomsPage({super.key});

  @override
  State<MeetingRoomsPage> createState() => _MeetingRoomsPageState();
}

class _MeetingRoomsPageState extends State<MeetingRoomsPage> {
  final ScrollController _scrollController = ScrollController();
  int? _minCapacity;
  bool? _showAvailableOnly;

  @override
  void initState() {
    super.initState();
    context.read<CoworkingBloc>().add(const LoadMeetingRooms());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      context.read<CoworkingBloc>().add(const LoadMoreMeetingRooms());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Meeting Rooms'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: BlocBuilder<CoworkingBloc, CoworkingState>(
        builder: (context, state) {
          if (state.meetingRoomsStatus == CoworkingStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.meetingRoomsStatus == CoworkingStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${state.meetingRoomsError}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<CoworkingBloc>().add(const LoadMeetingRooms());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state.meetingRooms.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.meeting_room, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No meeting rooms found',
                    style: TextStyle(color: Colors.grey[600], fontSize: 18),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<CoworkingBloc>().add(const LoadMeetingRooms());
            },
            child: GridView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.8,
              ),
              itemCount: state.meetingRooms.length +
                  (state.meetingRoomsStatus == CoworkingStatus.loadingMore
                      ? 1
                      : 0),
              itemBuilder: (context, index) {
                if (index == state.meetingRooms.length) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }
                return _buildMeetingRoomCard(state.meetingRooms[index]);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddRoomDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildMeetingRoomCard(CoworkingMeetingRoom room) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showRoomDetails(room),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              height: 80,
              width: double.infinity,
              color: _getCapacityColor(room.capacity),
              child: Center(
                child: Icon(
                  Icons.meeting_room,
                  size: 40,
                  color: Colors.white.withOpacity(0.9),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            room.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (room.isAvailable)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.people, size: 14, color: Colors.grey[600]),
                        const SizedBox(width: 4),
                        Text(
                          '${room.capacity} people',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    Text(
                      '\$${room.pricePerHour.toStringAsFixed(0)}/hr',
                      style: TextStyle(
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getCapacityColor(int capacity) {
    if (capacity <= 4) return Colors.green;
    if (capacity <= 8) return Colors.blue;
    if (capacity <= 16) return Colors.orange;
    return Colors.purple;
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
                    'Filter Meeting Rooms',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<int>(
                    decoration: const InputDecoration(
                      labelText: 'Minimum Capacity',
                      border: OutlineInputBorder(),
                    ),
                    value: _minCapacity,
                    items: const [
                      DropdownMenuItem(value: null, child: Text('Any')),
                      DropdownMenuItem(value: 2, child: Text('2+ people')),
                      DropdownMenuItem(value: 4, child: Text('4+ people')),
                      DropdownMenuItem(value: 8, child: Text('8+ people')),
                      DropdownMenuItem(value: 16, child: Text('16+ people')),
                    ],
                    onChanged: (value) {
                      setModalState(() => _minCapacity = value);
                    },
                  ),
                  const SizedBox(height: 16),
                  CheckboxListTile(
                    title: const Text('Show Available Only'),
                    value: _showAvailableOnly ?? false,
                    onChanged: (value) {
                      setModalState(() => _showAvailableOnly = value);
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setState(() {
                              _minCapacity = null;
                              _showAvailableOnly = null;
                            });
                            Navigator.pop(context);
                            context.read<CoworkingBloc>().add(const LoadMeetingRooms());
                          },
                          child: const Text('Clear'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            setState(() {});
                            Navigator.pop(context);
                            context.read<CoworkingBloc>().add(LoadMeetingRooms(
                                  minCapacity: _minCapacity,
                                  isAvailable: _showAvailableOnly,
                                ));
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

  void _showRoomDetails(CoworkingMeetingRoom room) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          minChildSize: 0.3,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 150,
                    width: double.infinity,
                    color: _getCapacityColor(room.capacity),
                    child: Center(
                      child: Icon(
                        Icons.meeting_room,
                        size: 64,
                        color: Colors.white.withOpacity(0.9),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                room.name,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            _buildAvailabilityBadge(room.isAvailable),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (room.description != null) ...[
                          Text(
                            room.description!,
                            style: TextStyle(color: Colors.grey[700]),
                          ),
                          const SizedBox(height: 16),
                        ],
                        _buildDetailRow('Capacity', '${room.capacity} people'),
                        _buildDetailRow('Price', '\$${room.pricePerHour.toStringAsFixed(2)}/hour'),
                        if (room.floor != null) _buildDetailRow('Floor', room.floor!),
                        const SizedBox(height: 16),
                        const Text(
                          'Amenities',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (room.amenities.isEmpty)
                          Text(
                            'No amenities listed',
                            style: TextStyle(color: Colors.grey[600]),
                          )
                        else
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: room.amenities.map((amenity) {
                              return Chip(
                                label: Text(amenity),
                                backgroundColor: Colors.grey[200],
                              );
                            }).toList(),
                          ),
                        const SizedBox(height: 24),
                        if (room.isAvailable)
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: () {
                                Navigator.pop(context);
                                _showBookingDialog(room);
                              },
                              child: const Text('Book Now'),
                            ),
                          ),
                      ],
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

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildAvailabilityBadge(bool isAvailable) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isAvailable ? Colors.green[100] : Colors.red[100],
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        isAvailable ? 'Available' : 'Occupied',
        style: TextStyle(
          color: isAvailable ? Colors.green[800] : Colors.red[800],
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  void _showBookingDialog(CoworkingMeetingRoom room) {
    DateTime selectedDate = DateTime.now();
    TimeOfDay startTime = TimeOfDay.now();
    int duration = 1;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Book ${room.name}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    leading: const Icon(Icons.calendar_today),
                    title: const Text('Date'),
                    subtitle: Text(
                      '${selectedDate.day}/${selectedDate.month}/${selectedDate.year}',
                    ),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: selectedDate,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 90)),
                      );
                      if (picked != null) {
                        setModalState(() => selectedDate = picked);
                      }
                    },
                  ),
                  ListTile(
                    leading: const Icon(Icons.schedule),
                    title: const Text('Start Time'),
                    subtitle: Text(startTime.format(context)),
                    onTap: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: startTime,
                      );
                      if (picked != null) {
                        setModalState(() => startTime = picked);
                      }
                    },
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        const Text('Duration: '),
                        IconButton(
                          icon: const Icon(Icons.remove),
                          onPressed: duration > 1
                              ? () => setModalState(() => duration--)
                              : null,
                        ),
                        Text(
                          '$duration hour${duration > 1 ? 's' : ''}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(Icons.add),
                          onPressed: duration < 8
                              ? () => setModalState(() => duration++)
                              : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total:'),
                        Text(
                          '\$${(room.pricePerHour * duration).toStringAsFixed(2)}',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).primaryColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        final startDateTime = DateTime(
                          selectedDate.year,
                          selectedDate.month,
                          selectedDate.day,
                          startTime.hour,
                          startTime.minute,
                        );
                        final endDateTime =
                            startDateTime.add(Duration(hours: duration));

                        context.read<CoworkingBloc>().add(BookMeetingRoom({
                              'meetingRoomId': room.id,
                              'startDate': startDateTime.toIso8601String(),
                              'endDate': endDateTime.toIso8601String(),
                              'bookingType': 'hourly',
                              'totalAmount': room.pricePerHour * duration,
                            }));
                        Navigator.pop(context);
                      },
                      child: const Text('Confirm Booking'),
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

  void _showAddRoomDialog(BuildContext context) {
    final nameController = TextEditingController();
    int capacity = 4;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Add Meeting Room'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Room Name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Text('Capacity: '),
                      IconButton(
                        icon: const Icon(Icons.remove),
                        onPressed: capacity > 2
                            ? () => setDialogState(() => capacity--)
                            : null,
                      ),
                      Text(
                        '$capacity',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add),
                        onPressed: capacity < 50
                            ? () => setDialogState(() => capacity++)
                            : null,
                      ),
                    ],
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
                    if (nameController.text.isNotEmpty) {
                      context.read<CoworkingBloc>().add(CreateDesk({
                            'name': nameController.text,
                            'capacity': capacity,
                            'pricePerHour': 25.0,
                            'amenities': [],
                            'isAvailable': true,
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
      },
    );
  }
}
