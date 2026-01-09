import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/tourism_bloc.dart';
import '../bloc/tourism_event.dart';
import '../bloc/tourism_state.dart';
import '../../domain/entities/tour_package.dart';

class PackagesPage extends StatefulWidget {
  const PackagesPage({super.key});

  @override
  State<PackagesPage> createState() => _PackagesPageState();
}

class _PackagesPageState extends State<PackagesPage> {
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    context.read<TourismBloc>().add(const LoadPackages());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<TourismBloc>().add(const LoadMorePackages());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  void _onSearch(String value) {
    context.read<TourismBloc>().add(LoadPackages(
          search: value.isEmpty ? null : value,
          category: _selectedCategory,
        ));
  }

  void _onCategoryChanged(String? value) {
    setState(() => _selectedCategory = value);
    context.read<TourismBloc>().add(LoadPackages(
          search:
              _searchController.text.isEmpty ? null : _searchController.text,
          category: value,
        ));
  }

  void _clearFilters() {
    _searchController.clear();
    setState(() => _selectedCategory = null);
    context.read<TourismBloc>().add(const LoadPackages());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tour Packages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                context.read<TourismBloc>().add(const LoadPackages()),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: BlocBuilder<TourismBloc, TourismState>(
              builder: (context, state) {
                if (state.packagesStatus == TourismStatus.loading &&
                    state.packages.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.packagesStatus == TourismStatus.failure) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Error: ${state.packagesError}'),
                        ElevatedButton(
                          onPressed: () => context
                              .read<TourismBloc>()
                              .add(const LoadPackages()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state.packages.isEmpty) {
                  return const Center(child: Text('No packages found'));
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<TourismBloc>().add(const LoadPackages());
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    itemCount: state.hasMorePackages
                        ? state.packages.length + 1
                        : state.packages.length,
                    itemBuilder: (context, index) {
                      if (index >= state.packages.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(8.0),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }
                      return _PackageCard(
                        package: state.packages[index],
                        onTap: () {
                          context.read<TourismBloc>().add(
                                LoadPackageDetail(state.packages[index].id),
                              );
                        },
                      );
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

  Widget _buildFilters() {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search packages...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        _onSearch('');
                      },
                    )
                  : null,
              border: const OutlineInputBorder(),
            ),
            onChanged: _onSearch,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedCategory,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12),
                  ),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('All')),
                    DropdownMenuItem(value: 'adventure', child: Text('Adventure')),
                    DropdownMenuItem(value: 'cultural', child: Text('Cultural')),
                    DropdownMenuItem(value: 'beach', child: Text('Beach')),
                    DropdownMenuItem(value: 'mountain', child: Text('Mountain')),
                    DropdownMenuItem(value: 'city', child: Text('City Tour')),
                    DropdownMenuItem(value: 'wildlife', child: Text('Wildlife')),
                  ],
                  onChanged: _onCategoryChanged,
                ),
              ),
              const SizedBox(width: 8),
              TextButton.icon(
                onPressed: _clearFilters,
                icon: const Icon(Icons.clear_all),
                label: const Text('Clear'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPaginationInfo() {
    return BlocBuilder<TourismBloc, TourismState>(
      builder: (context, state) {
        if (state.packagesPagination == null) return const SizedBox.shrink();

        final pagination = state.packagesPagination!;
        final start = ((pagination.page - 1) * pagination.limit) + 1;
        final end = start + state.packages.length - 1;

        return Container(
          padding: const EdgeInsets.all(8.0),
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          child: Text(
            'Showing $start-$end of ${pagination.total} packages',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        );
      },
    );
  }
}

class _PackageCard extends StatelessWidget {
  final TourPackage package;
  final VoidCallback? onTap;

  const _PackageCard({required this.package, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.blue.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: package.images.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          package.images.first,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Icon(
                            Icons.landscape,
                            size: 40,
                            color: Colors.blue.shade700,
                          ),
                        ),
                      )
                    : Icon(
                        Icons.landscape,
                        size: 40,
                        color: Colors.blue.shade700,
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      package.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 14, color: Colors.grey),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            package.destination,
                            style: Theme.of(context).textTheme.bodySmall,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.access_time, size: 14, color: Colors.grey),
                        const SizedBox(width: 4),
                        Text(
                          '${package.durationDays} Days / ${package.durationNights} Nights',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (package.category != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.blue.shade50,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              package.category!,
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.blue.shade700,
                              ),
                            ),
                          ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            if (package.discountPrice != null) ...[
                              Text(
                                '\$${package.price.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  decoration: TextDecoration.lineThrough,
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                              Text(
                                '\$${package.discountPrice!.toStringAsFixed(0)}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ] else
                              Text(
                                '\$${package.price.toStringAsFixed(0)}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(
                package.isActive ? Icons.check_circle : Icons.cancel,
                color: package.isActive ? Colors.green : Colors.red,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
