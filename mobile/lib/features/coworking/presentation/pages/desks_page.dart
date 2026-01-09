import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/coworking_desk.dart';
import '../bloc/coworking_bloc.dart';
import '../bloc/coworking_event.dart';
import '../bloc/coworking_state.dart';

class DesksPage extends StatefulWidget {
  const DesksPage({super.key});

  @override
  State<DesksPage> createState() => _DesksPageState();
}

class _DesksPageState extends State<DesksPage> {
  final ScrollController _scrollController = ScrollController();
  String? _selectedType;
  String? _selectedFloor;
  bool? _showAvailableOnly;

  @override
  void initState() {
    super.initState();
    context.read<CoworkingBloc>().add(const LoadDesks());
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
      context.read<CoworkingBloc>().add(const LoadMoreDesks());
    }
  }

  void _applyFilters() {
    context.read<CoworkingBloc>().add(LoadDesks(
          type: _selectedType,
          floor: _selectedFloor,
          isAvailable: _showAvailableOnly,
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Desks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: BlocBuilder<CoworkingBloc, CoworkingState>(
        builder: (context, state) {
          if (state.desksStatus == CoworkingStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.desksStatus == CoworkingStatus.failure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Error: ${state.desksError}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<CoworkingBloc>().add(const LoadDesks());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state.desks.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.desk, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No desks found',
                    style: TextStyle(color: Colors.grey[600], fontSize: 18),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              context.read<CoworkingBloc>().add(const LoadDesks());
            },
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: state.desks.length +
                  (state.desksStatus == CoworkingStatus.loadingMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == state.desks.length) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }
                return _buildDeskCard(state.desks[index]);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddDeskDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildDeskCard(CoworkingDesk desk) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showDeskDetails(desk),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: _getDeskTypeColor(desk.type).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _getDeskTypeIcon(desk.type),
                      color: _getDeskTypeColor(desk.type),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          desk.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${desk.type.toUpperCase()} DESK${desk.floor != null ? ' - Floor ${desk.floor}' : ''}',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildAvailabilityBadge(desk.isAvailable),
                ],
              ),
              const Divider(height: 24),
              Row(
                children: [
                  Expanded(
                    child: _buildPriceInfo(
                      'Per Day',
                      '\$${desk.pricePerDay.toStringAsFixed(0)}',
                    ),
                  ),
                  Expanded(
                    child: _buildPriceInfo(
                      'Per Month',
                      '\$${desk.pricePerMonth.toStringAsFixed(0)}',
                    ),
                  ),
                  Expanded(
                    child: _buildAmenitiesInfo(desk.amenities),
                  ),
                ],
              ),
            ],
          ),
        ),
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

  Widget _buildPriceInfo(String label, String price) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.grey[600], fontSize: 12),
        ),
        Text(
          price,
          style: TextStyle(
            color: Theme.of(context).primaryColor,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  Widget _buildAmenitiesInfo(List<String> amenities) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Amenities',
          style: TextStyle(color: Colors.grey[600], fontSize: 12),
        ),
        Text(
          amenities.isEmpty ? 'None' : amenities.take(3).join(', '),
          style: const TextStyle(fontSize: 12),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Color _getDeskTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'hot':
        return Colors.orange;
      case 'dedicated':
        return Colors.blue;
      case 'private':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  IconData _getDeskTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'hot':
        return Icons.local_fire_department;
      case 'dedicated':
        return Icons.person;
      case 'private':
        return Icons.lock;
      default:
        return Icons.desk;
    }
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
                    'Filter Desks',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Desk Type',
                      border: OutlineInputBorder(),
                    ),
                    value: _selectedType,
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All Types')),
                      DropdownMenuItem(value: 'hot', child: Text('Hot Desk')),
                      DropdownMenuItem(value: 'dedicated', child: Text('Dedicated')),
                      DropdownMenuItem(value: 'private', child: Text('Private')),
                    ],
                    onChanged: (value) {
                      setModalState(() => _selectedType = value);
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
                              _selectedType = null;
                              _selectedFloor = null;
                              _showAvailableOnly = null;
                            });
                            Navigator.pop(context);
                            context.read<CoworkingBloc>().add(const LoadDesks());
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
                            _applyFilters();
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

  void _showDeskDetails(CoworkingDesk desk) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.3,
          maxChildSize: 0.9,
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
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: _getDeskTypeColor(desk.type).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(
                          _getDeskTypeIcon(desk.type),
                          color: _getDeskTypeColor(desk.type),
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              desk.name,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '${desk.type.toUpperCase()} DESK',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ),
                      _buildAvailabilityBadge(desk.isAvailable),
                    ],
                  ),
                  const SizedBox(height: 24),
                  if (desk.description != null) ...[
                    Text(
                      desk.description!,
                      style: TextStyle(color: Colors.grey[700], fontSize: 16),
                    ),
                    const SizedBox(height: 24),
                  ],
                  _buildDetailSection('Location', 'Floor ${desk.floor ?? 'N/A'}'),
                  _buildDetailSection('Daily Rate', '\$${desk.pricePerDay.toStringAsFixed(2)}'),
                  _buildDetailSection('Monthly Rate', '\$${desk.pricePerMonth.toStringAsFixed(2)}'),
                  const SizedBox(height: 16),
                  const Text(
                    'Amenities',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: desk.amenities.map((amenity) {
                      return Chip(
                        label: Text(amenity),
                        backgroundColor: Colors.grey[200],
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  if (desk.isAvailable)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          Navigator.pushNamed(
                            context,
                            '/coworking/bookings',
                            arguments: {'deskId': desk.id},
                          );
                        },
                        child: const Text('Book This Desk'),
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

  Widget _buildDetailSection(String label, String value) {
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

  void _showAddDeskDialog(BuildContext context) {
    final nameController = TextEditingController();
    String selectedType = 'hot';

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Add New Desk'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Desk Name',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'Desk Type',
                  border: OutlineInputBorder(),
                ),
                value: selectedType,
                items: const [
                  DropdownMenuItem(value: 'hot', child: Text('Hot Desk')),
                  DropdownMenuItem(value: 'dedicated', child: Text('Dedicated')),
                  DropdownMenuItem(value: 'private', child: Text('Private')),
                ],
                onChanged: (value) {
                  selectedType = value!;
                },
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
                        'type': selectedType,
                        'pricePerDay': 50.0,
                        'pricePerMonth': 800.0,
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
  }
}
