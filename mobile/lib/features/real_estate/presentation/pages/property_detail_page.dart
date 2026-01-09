import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/real_estate_bloc.dart';
import '../bloc/real_estate_event.dart';
import '../bloc/real_estate_state.dart';
import '../../domain/entities/property.dart';

class PropertyDetailPage extends StatefulWidget {
  final String propertyId;
  final Property? initialProperty;

  const PropertyDetailPage({
    super.key,
    required this.propertyId,
    this.initialProperty,
  });

  @override
  State<PropertyDetailPage> createState() => _PropertyDetailPageState();
}

class _PropertyDetailPageState extends State<PropertyDetailPage> {
  late Property? _property;

  @override
  void initState() {
    super.initState();
    _property = widget.initialProperty;
    if (_property == null) {
      context.read<RealEstateBloc>().add(LoadProperty(widget.propertyId));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocConsumer<RealEstateBloc, RealEstateState>(
        listener: (context, state) {
          if (state.selectedProperty != null && state.selectedProperty!.id == widget.propertyId) {
            setState(() {
              _property = state.selectedProperty;
            });
          }
        },
        builder: (context, state) {
          if (_property == null && state.operationStatus == RealEstateStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (_property == null) {
            return Scaffold(
              appBar: AppBar(),
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Property not found'),
                    ElevatedButton(
                      onPressed: () => context.read<RealEstateBloc>().add(LoadProperty(widget.propertyId)),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final property = _property!;

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 250,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  title: Text(
                    property.title,
                    style: const TextStyle(
                      color: Colors.white,
                      shadows: [Shadow(color: Colors.black54, blurRadius: 4)],
                    ),
                  ),
                  background: property.images.isNotEmpty
                      ? Image.network(
                          property.images.first,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _buildPlaceholderImage(),
                        )
                      : _buildPlaceholderImage(),
                ),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.share),
                    onPressed: () {},
                  ),
                  PopupMenuButton(
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'edit', child: Text('Edit')),
                      const PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                    onSelected: (value) {
                      if (value == 'delete') {
                        _showDeleteConfirmation(context, property);
                      }
                    },
                  ),
                ],
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildPriceSection(property),
                      const SizedBox(height: 16),
                      _buildLocationSection(property),
                      const SizedBox(height: 16),
                      _buildFeaturesSection(property),
                      const SizedBox(height: 16),
                      _buildDescriptionSection(property),
                      const SizedBox(height: 16),
                      _buildAmenitiesSection(property),
                      const SizedBox(height: 16),
                      _buildOwnerSection(property),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: _property != null
          ? FloatingActionButton.extended(
              onPressed: () {
              },
              icon: const Icon(Icons.calendar_today),
              label: const Text('Schedule Visit'),
            )
          : null,
    );
  }

  Widget _buildPlaceholderImage() {
    return Container(
      color: Colors.grey[300],
      child: const Center(
        child: Icon(Icons.home, size: 64, color: Colors.grey),
      ),
    );
  }

  Widget _buildPriceSection(Property property) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '\$${property.price.toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Text(
                  property.purpose == PropertyPurpose.rent ? 'per month' : 'for sale',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            Row(
              children: [
                _buildStatusChip(property.status.name),
                const SizedBox(width: 8),
                Chip(
                  label: Text(
                    property.purpose.name.toUpperCase(),
                    style: const TextStyle(fontSize: 10),
                  ),
                  side: BorderSide.none,
                  backgroundColor: property.purpose == PropertyPurpose.sale
                      ? Colors.blue.withOpacity(0.2)
                      : Colors.green.withOpacity(0.2),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationSection(Property property) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.location_on),
                const SizedBox(width: 8),
                Text('Location', style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 12),
            Text(property.address),
            const SizedBox(height: 4),
            Text(
              property.location,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeaturesSection(Property property) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Features', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _FeatureItem(
                  icon: Icons.category,
                  label: 'Type',
                  value: property.type.name,
                ),
                _FeatureItem(
                  icon: Icons.square_foot,
                  label: 'Area',
                  value: '${property.area.toInt()} sqft',
                ),
                if (property.bedrooms != null)
                  _FeatureItem(
                    icon: Icons.bed,
                    label: 'Bedrooms',
                    value: '${property.bedrooms}',
                  ),
                if (property.bathrooms != null)
                  _FeatureItem(
                    icon: Icons.bathtub,
                    label: 'Bathrooms',
                    value: '${property.bathrooms}',
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDescriptionSection(Property property) {
    if (property.description == null || property.description!.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Description', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Text(property.description!),
          ],
        ),
      ),
    );
  }

  Widget _buildAmenitiesSection(Property property) {
    if (property.amenities.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Amenities', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: property.amenities.map((amenity) {
                return Chip(
                  label: Text(amenity),
                  side: BorderSide.none,
                  backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOwnerSection(Property property) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Contact', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person)),
              title: Text(property.ownerId != null ? 'Property Owner' : 'Contact Agent'),
              subtitle: const Text('Tap to view contact details'),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.phone),
                    onPressed: () {},
                  ),
                  IconButton(
                    icon: const Icon(Icons.email),
                    onPressed: () {},
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'available':
        color = Colors.green;
        break;
      case 'sold':
        color = Colors.red;
        break;
      case 'rented':
        color = Colors.orange;
        break;
      default:
        color = Colors.grey;
    }
    return Chip(
      label: Text(status.toUpperCase(), style: const TextStyle(fontSize: 10)),
      backgroundColor: color.withOpacity(0.2),
      side: BorderSide.none,
    );
  }

  void _showDeleteConfirmation(BuildContext context, Property property) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Property'),
        content: Text('Are you sure you want to delete "${property.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<RealEstateBloc>().add(DeleteProperty(property.id));
              Navigator.pop(context);
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

class _FeatureItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _FeatureItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 28, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
        ),
      ],
    );
  }
}
