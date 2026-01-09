import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/gym_subscription.dart';
import '../bloc/gym_bloc.dart';
import '../bloc/gym_event.dart';
import '../bloc/gym_state.dart';

class SubscriptionsPage extends StatefulWidget {
  const SubscriptionsPage({super.key});

  @override
  State<SubscriptionsPage> createState() => _SubscriptionsPageState();
}

class _SubscriptionsPageState extends State<SubscriptionsPage> {
  final _searchController = TextEditingController();
  bool? _activeFilter;

  @override
  void initState() {
    super.initState();
    context.read<GymBloc>().add(const LoadSubscriptions());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String query) {
    context.read<GymBloc>().add(LoadSubscriptions(
      search: query.isEmpty ? null : query,
      isActive: _activeFilter,
    ));
  }

  void _onActiveFilter(bool? isActive) {
    setState(() => _activeFilter = isActive);
    context.read<GymBloc>().add(LoadSubscriptions(
      search: _searchController.text.isEmpty ? null : _searchController.text,
      isActive: isActive,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Subscription Plans'),
        actions: [
          PopupMenuButton<bool?>(
            icon: const Icon(Icons.filter_list),
            onSelected: _onActiveFilter,
            itemBuilder: (context) => [
              const PopupMenuItem(value: null, child: Text('All')),
              const PopupMenuItem(value: true, child: Text('Active')),
              const PopupMenuItem(value: false, child: Text('Inactive')),
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
                hintText: 'Search plans...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onChanged: _onSearch,
            ),
          ),
          Expanded(
            child: BlocBuilder<GymBloc, GymState>(
              builder: (context, state) {
                if (state.subscriptionsStatus == GymStatus.loading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.subscriptionsStatus == GymStatus.failure) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(state.subscriptionsError ?? 'Failed to load plans'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            context.read<GymBloc>().add(const LoadSubscriptions());
                          },
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state.subscriptions.isEmpty) {
                  return const Center(
                    child: Text('No subscription plans found'),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<GymBloc>().add(const LoadSubscriptions());
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: state.subscriptions.length,
                    itemBuilder: (context, index) {
                      final subscription = state.subscriptions[index];
                      return _buildSubscriptionCard(subscription);
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

  Widget _buildSubscriptionCard(GymSubscription subscription) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        subscription.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subscription.formattedDuration,
                        style: TextStyle(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '\$${subscription.price.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                    _buildActiveChip(subscription.isActive),
                  ],
                ),
              ],
            ),
            if (subscription.description != null) ...[
              const SizedBox(height: 12),
              Text(
                subscription.description!,
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
            if (subscription.features.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              const Text(
                'Features:',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: subscription.features
                    .map((feature) => Chip(
                          label: Text(
                            feature,
                            style: const TextStyle(fontSize: 12),
                          ),
                          backgroundColor: Colors.blue[50],
                        ))
                    .toList(),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  icon: const Icon(Icons.edit, size: 18),
                  label: const Text('Edit'),
                  onPressed: () => _showAddEditDialog(subscription),
                ),
                const SizedBox(width: 8),
                TextButton.icon(
                  icon: Icon(
                    subscription.isActive ? Icons.pause : Icons.play_arrow,
                    size: 18,
                  ),
                  label: Text(subscription.isActive ? 'Deactivate' : 'Activate'),
                  onPressed: () => _toggleActive(subscription),
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
      margin: const EdgeInsets.only(top: 4),
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

  void _showAddEditDialog(GymSubscription? subscription) {
    final nameController = TextEditingController(text: subscription?.name);
    final durationController =
        TextEditingController(text: subscription?.duration.toString() ?? '1');
    final priceController =
        TextEditingController(text: subscription?.price.toString() ?? '');
    final descriptionController =
        TextEditingController(text: subscription?.description);
    bool isActive = subscription?.isActive ?? true;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(subscription == null ? 'Add Plan' : 'Edit Plan'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Plan Name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: durationController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Duration (months)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextField(
                        controller: priceController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Price',
                          border: OutlineInputBorder(),
                          prefixText: '\$ ',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: descriptionController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Description',
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
                  'duration': int.tryParse(durationController.text) ?? 1,
                  'durationUnit': 'months',
                  'price': double.tryParse(priceController.text) ?? 0,
                  'description': descriptionController.text,
                  'isActive': isActive,
                };

                if (subscription == null) {
                  context.read<GymBloc>().add(CreateSubscription(data));
                } else {
                  context.read<GymBloc>().add(
                        UpdateSubscription(subscription.id, data),
                      );
                }

                Navigator.pop(context);
              },
              child: Text(subscription == null ? 'Add' : 'Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _toggleActive(GymSubscription subscription) {
    context.read<GymBloc>().add(UpdateSubscription(
      subscription.id,
      {'isActive': !subscription.isActive},
    ));
  }
}
