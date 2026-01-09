import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/real_estate_bloc.dart';
import '../bloc/real_estate_event.dart';
import '../bloc/real_estate_state.dart';
import '../../domain/entities/property.dart';

class PropertiesPage extends StatefulWidget {
  const PropertiesPage({super.key});

  @override
  State<PropertiesPage> createState() => _PropertiesPageState();
}

class _PropertiesPageState extends State<PropertiesPage> {
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();
  PropertyType? _selectedType;
  PropertyPurpose? _selectedPurpose;
  RangeValues _priceRange = const RangeValues(0, 10000000);

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    context.read<RealEstateBloc>().add(const LoadProperties());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<RealEstateBloc>().add(const LoadMoreProperties());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  void _applyFilters() {
    context.read<RealEstateBloc>().add(LoadProperties(
      search: _searchController.text.isEmpty ? null : _searchController.text,
      type: _selectedType,
      purpose: _selectedPurpose,
      minPrice: _priceRange.start > 0 ? _priceRange.start : null,
      maxPrice: _priceRange.end < 10000000 ? _priceRange.end : null,
    ));
  }

  void _clearFilters() {
    _searchController.clear();
    setState(() {
      _selectedType = null;
      _selectedPurpose = null;
      _priceRange = const RangeValues(0, 10000000);
    });
    context.read<RealEstateBloc>().add(const LoadProperties());
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Filters', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              DropdownButtonFormField<PropertyType?>(
                value: _selectedType,
                decoration: const InputDecoration(
                  labelText: 'Property Type',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('All Types')),
                  ...PropertyType.values.map((type) => DropdownMenuItem(
                        value: type,
                        child: Text(type.name.toUpperCase()),
                      )),
                ],
                onChanged: (value) {
                  setModalState(() => _selectedType = value);
                  setState(() {});
                },
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<PropertyPurpose?>(
                value: _selectedPurpose,
                decoration: const InputDecoration(
                  labelText: 'Purpose',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('All')),
                  ...PropertyPurpose.values.map((purpose) => DropdownMenuItem(
                        value: purpose,
                        child: Text(purpose.name.toUpperCase()),
                      )),
                ],
                onChanged: (value) {
                  setModalState(() => _selectedPurpose = value);
                  setState(() {});
                },
              ),
              const SizedBox(height: 16),
              Text('Price Range: \$${_priceRange.start.toInt()} - \$${_priceRange.end.toInt()}'),
              RangeSlider(
                values: _priceRange,
                min: 0,
                max: 10000000,
                divisions: 100,
                labels: RangeLabels(
                  '\$${_priceRange.start.toInt()}',
                  '\$${_priceRange.end.toInt()}',
                ),
                onChanged: (values) {
                  setModalState(() => _priceRange = values);
                  setState(() {});
                },
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _clearFilters();
                      },
                      child: const Text('Clear'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _applyFilters();
                      },
                      child: const Text('Apply'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Properties'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterSheet,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<RealEstateBloc>().add(const LoadProperties()),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search properties...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _applyFilters();
                        },
                      )
                    : null,
                border: const OutlineInputBorder(),
              ),
              onChanged: (_) => _applyFilters(),
            ),
          ),
          Expanded(
            child: BlocBuilder<RealEstateBloc, RealEstateState>(
              builder: (context, state) {
                if (state.propertiesStatus == RealEstateStatus.loading && state.properties.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.propertiesStatus == RealEstateStatus.failure) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Error: ${state.propertiesError}'),
                        ElevatedButton(
                          onPressed: () => context.read<RealEstateBloc>().add(const LoadProperties()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state.properties.isEmpty) {
                  return const Center(child: Text('No properties found'));
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<RealEstateBloc>().add(const LoadProperties());
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    itemCount: state.hasMoreProperties
                        ? state.properties.length + 1
                        : state.properties.length,
                    itemBuilder: (context, index) {
                      if (index >= state.properties.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(8.0),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }
                      return _PropertyCard(property: state.properties[index]);
                    },
                  ),
                );
              },
            ),
          ),
          _buildPaginationInfo(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildPaginationInfo() {
    return BlocBuilder<RealEstateBloc, RealEstateState>(
      builder: (context, state) {
        if (state.propertiesPagination == null) return const SizedBox.shrink();

        final pagination = state.propertiesPagination!;
        final start = ((pagination.page - 1) * pagination.limit) + 1;
        final end = start + state.properties.length - 1;

        return Container(
          padding: const EdgeInsets.all(8.0),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Text(
            'Showing $start-$end of ${pagination.total} properties',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        );
      },
    );
  }
}

class _PropertyCard extends StatelessWidget {
  final Property property;

  const _PropertyCard({required this.property});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: InkWell(
        onTap: () {
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      property.title,
                      style: Theme.of(context).textTheme.titleMedium,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _buildStatusChip(property.status.name),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      property.address,
                      style: Theme.of(context).textTheme.bodySmall,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      _PropertyFeature(
                        icon: Icons.category,
                        value: property.type.name,
                      ),
                      const SizedBox(width: 12),
                      if (property.bedrooms != null)
                        _PropertyFeature(
                          icon: Icons.bed,
                          value: '${property.bedrooms}',
                        ),
                      if (property.bathrooms != null) ...[
                        const SizedBox(width: 12),
                        _PropertyFeature(
                          icon: Icons.bathtub,
                          value: '${property.bathrooms}',
                        ),
                      ],
                      const SizedBox(width: 12),
                      _PropertyFeature(
                        icon: Icons.square_foot,
                        value: '${property.area.toInt()} sqft',
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '\$${property.price.toStringAsFixed(0)}',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  Chip(
                    label: Text(
                      property.purpose.name.toUpperCase(),
                      style: const TextStyle(fontSize: 10),
                    ),
                    side: BorderSide.none,
                    padding: EdgeInsets.zero,
                    backgroundColor: property.purpose == PropertyPurpose.sale
                        ? Colors.blue.withOpacity(0.2)
                        : Colors.green.withOpacity(0.2),
                  ),
                ],
              ),
            ],
          ),
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
      padding: EdgeInsets.zero,
    );
  }
}

class _PropertyFeature extends StatelessWidget {
  final IconData icon;
  final String value;

  const _PropertyFeature({required this.icon, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: Colors.grey[600]),
        const SizedBox(width: 2),
        Text(
          value,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
