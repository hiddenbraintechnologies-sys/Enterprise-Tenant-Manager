import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/gym_trainer.dart';
import '../bloc/gym_bloc.dart';
import '../bloc/gym_event.dart';
import '../bloc/gym_state.dart';

class TrainersPage extends StatefulWidget {
  const TrainersPage({super.key});

  @override
  State<TrainersPage> createState() => _TrainersPageState();
}

class _TrainersPageState extends State<TrainersPage> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();
  String? _selectedSpecialization;

  @override
  void initState() {
    super.initState();
    context.read<GymBloc>().add(const LoadTrainers());
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
      context.read<GymBloc>().add(const LoadMoreTrainers());
    }
  }

  void _onSearch(String query) {
    context.read<GymBloc>().add(LoadTrainers(
      search: query.isEmpty ? null : query,
      specialization: _selectedSpecialization,
    ));
  }

  void _onSpecializationFilter(String? specialization) {
    setState(() => _selectedSpecialization = specialization);
    context.read<GymBloc>().add(LoadTrainers(
      search: _searchController.text.isEmpty ? null : _searchController.text,
      specialization: specialization,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trainers'),
        actions: [
          PopupMenuButton<String?>(
            icon: const Icon(Icons.filter_list),
            onSelected: _onSpecializationFilter,
            itemBuilder: (context) => [
              const PopupMenuItem(value: null, child: Text('All')),
              const PopupMenuItem(value: 'weight_training', child: Text('Weight Training')),
              const PopupMenuItem(value: 'cardio', child: Text('Cardio')),
              const PopupMenuItem(value: 'yoga', child: Text('Yoga')),
              const PopupMenuItem(value: 'crossfit', child: Text('CrossFit')),
              const PopupMenuItem(value: 'personal_training', child: Text('Personal Training')),
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
                hintText: 'Search trainers...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onChanged: _onSearch,
            ),
          ),
          if (_selectedSpecialization != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Chip(
                    label: Text('Specialization: $_selectedSpecialization'),
                    onDeleted: () => _onSpecializationFilter(null),
                  ),
                ],
              ),
            ),
          Expanded(
            child: BlocBuilder<GymBloc, GymState>(
              builder: (context, state) {
                if (state.trainersStatus == GymStatus.loading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.trainersStatus == GymStatus.failure) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(state.trainersError ?? 'Failed to load trainers'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            context.read<GymBloc>().add(const LoadTrainers());
                          },
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state.trainers.isEmpty) {
                  return const Center(
                    child: Text('No trainers found'),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<GymBloc>().add(const LoadTrainers());
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: state.trainers.length +
                        (state.trainersStatus == GymStatus.loadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index >= state.trainers.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      final trainer = state.trainers[index];
                      return _buildTrainerCard(trainer);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddEditDialog(null),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildTrainerCard(GymTrainer trainer) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.blue,
                  backgroundImage:
                      trainer.photoUrl != null ? NetworkImage(trainer.photoUrl!) : null,
                  child: trainer.photoUrl == null
                      ? Text(
                          trainer.name[0].toUpperCase(),
                          style: const TextStyle(
                            fontSize: 24,
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
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              trainer.name,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          _buildActiveChip(trainer.isActive),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        trainer.specialization,
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '\$${trainer.hourlyRate.toStringAsFixed(2)}/hour',
                        style: const TextStyle(
                          color: Colors.green,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (trainer.bio != null) ...[
              const SizedBox(height: 12),
              Text(
                trainer.bio!,
                style: TextStyle(color: Colors.grey[600]),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (trainer.certifications.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: trainer.certifications
                    .take(3)
                    .map((cert) => Chip(
                          label: Text(cert, style: const TextStyle(fontSize: 11)),
                          backgroundColor: Colors.orange[50],
                          padding: EdgeInsets.zero,
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.phone, size: 16),
                    label: const Text('Call'),
                    onPressed: () {
                      // Call trainer
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.schedule, size: 16),
                    label: const Text('Schedule'),
                    onPressed: () {
                      _showScheduleDialog(trainer);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () => _showAddEditDialog(trainer),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveChip(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: isActive ? Colors.green[100] : Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        isActive ? 'Active' : 'Inactive',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: isActive ? Colors.green[700] : Colors.grey[600],
        ),
      ),
    );
  }

  void _showAddEditDialog(GymTrainer? trainer) {
    final nameController = TextEditingController(text: trainer?.name);
    final phoneController = TextEditingController(text: trainer?.phone);
    final emailController = TextEditingController(text: trainer?.email);
    final specializationController =
        TextEditingController(text: trainer?.specialization);
    final hourlyRateController =
        TextEditingController(text: trainer?.hourlyRate.toString() ?? '');
    final bioController = TextEditingController(text: trainer?.bio);
    bool isActive = trainer?.isActive ?? true;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(trainer == null ? 'Add Trainer' : 'Edit Trainer'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: specializationController,
                  decoration: const InputDecoration(
                    labelText: 'Specialization',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: hourlyRateController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Hourly Rate',
                    border: OutlineInputBorder(),
                    prefixText: '\$ ',
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: bioController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Bio',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Active'),
                  value: isActive,
                  onChanged: (value) => setDialogState(() => isActive = value),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                final data = {
                  'name': nameController.text,
                  'phone': phoneController.text,
                  'email': emailController.text,
                  'specialization': specializationController.text,
                  'hourlyRate': double.tryParse(hourlyRateController.text) ?? 0,
                  'bio': bioController.text,
                  'isActive': isActive,
                };

                if (trainer == null) {
                  context.read<GymBloc>().add(CreateTrainer(data));
                } else {
                  context.read<GymBloc>().add(UpdateTrainer(trainer.id, data));
                }

                Navigator.pop(context);
              },
              child: Text(trainer == null ? 'Add' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _showScheduleDialog(GymTrainer trainer) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${trainer.name}\'s Schedule'),
        content: SizedBox(
          width: double.maxFinite,
          child: trainer.schedule != null && trainer.schedule!.isNotEmpty
              ? ListView.builder(
                  shrinkWrap: true,
                  itemCount: trainer.schedule!.length,
                  itemBuilder: (context, index) {
                    final day = trainer.schedule!.keys.elementAt(index);
                    final times = trainer.schedule![day];
                    return ListTile(
                      title: Text(day),
                      subtitle: Text(times.toString()),
                    );
                  },
                )
              : const Center(child: Text('No schedule available')),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
