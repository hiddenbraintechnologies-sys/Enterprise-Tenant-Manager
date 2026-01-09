import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/tourism_bloc.dart';
import '../bloc/tourism_event.dart';
import '../bloc/tourism_state.dart';

class PackageDetailPage extends StatefulWidget {
  final String packageId;

  const PackageDetailPage({super.key, required this.packageId});

  @override
  State<PackageDetailPage> createState() => _PackageDetailPageState();
}

class _PackageDetailPageState extends State<PackageDetailPage> {
  @override
  void initState() {
    super.initState();
    context.read<TourismBloc>().add(LoadPackageDetail(widget.packageId));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocBuilder<TourismBloc, TourismState>(
        builder: (context, state) {
          if (state.selectedPackageStatus == TourismStatus.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.selectedPackageStatus == TourismStatus.failure) {
            return Scaffold(
              appBar: AppBar(),
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Error: ${state.selectedPackageError}'),
                    ElevatedButton(
                      onPressed: () => context
                          .read<TourismBloc>()
                          .add(LoadPackageDetail(widget.packageId)),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final package = state.selectedPackage;
          if (package == null) {
            return Scaffold(
              appBar: AppBar(),
              body: const Center(child: Text('Package not found')),
            );
          }

          return CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 200,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  title: Text(
                    package.name,
                    style: const TextStyle(
                      shadows: [Shadow(blurRadius: 4, color: Colors.black54)],
                    ),
                  ),
                  background: package.images.isNotEmpty
                      ? Image.network(
                          package.images.first,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: Colors.blue.shade200,
                            child: const Icon(Icons.landscape,
                                size: 80, color: Colors.white),
                          ),
                        )
                      : Container(
                          color: Colors.blue.shade200,
                          child: const Icon(Icons.landscape,
                              size: 80, color: Colors.white),
                        ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _InfoChip(
                              icon: Icons.location_on,
                              label: package.destination,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _InfoChip(
                            icon: Icons.access_time,
                            label:
                                '${package.durationDays}D/${package.durationNights}N',
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _InfoChip(
                            icon: Icons.group,
                            label: 'Max ${package.maxGroupSize} people',
                          ),
                          const SizedBox(width: 8),
                          if (package.category != null)
                            _InfoChip(
                              icon: Icons.category,
                              label: package.category!,
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Price per person',
                                style: TextStyle(fontSize: 16),
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
                                      ),
                                    ),
                                    Text(
                                      '\$${package.discountPrice!.toStringAsFixed(0)}',
                                      style: TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color:
                                            Theme.of(context).colorScheme.primary,
                                      ),
                                    ),
                                  ] else
                                    Text(
                                      '\$${package.price.toStringAsFixed(0)}',
                                      style: TextStyle(
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                        color:
                                            Theme.of(context).colorScheme.primary,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (package.description != null) ...[
                        Text(
                          'Description',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        Text(package.description!),
                        const SizedBox(height: 16),
                      ],
                      if (package.inclusions.isNotEmpty) ...[
                        Text(
                          'Inclusions',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        ...package.inclusions.map((item) => Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle,
                                      color: Colors.green, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(item)),
                                ],
                              ),
                            )),
                        const SizedBox(height: 16),
                      ],
                      if (package.exclusions.isNotEmpty) ...[
                        Text(
                          'Exclusions',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        ...package.exclusions.map((item) => Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.cancel,
                                      color: Colors.red, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(item)),
                                ],
                              ),
                            )),
                        const SizedBox(height: 16),
                      ],
                      Text(
                        'Itinerary',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      if (state.itinerariesStatus == TourismStatus.loading)
                        const Center(child: CircularProgressIndicator())
                      else if (state.itineraries.isEmpty)
                        const Card(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Text('No itinerary available'),
                          ),
                        )
                      else
                        ...state.itineraries.map((itinerary) => Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ExpansionTile(
                                leading: CircleAvatar(
                                  child: Text('D${itinerary.dayNumber}'),
                                ),
                                title: Text(itinerary.title),
                                subtitle: itinerary.accommodation != null
                                    ? Row(
                                        children: [
                                          const Icon(Icons.hotel, size: 14),
                                          const SizedBox(width: 4),
                                          Expanded(
                                            child: Text(
                                              itinerary.accommodation!,
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodySmall,
                                            ),
                                          ),
                                        ],
                                      )
                                    : null,
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        if (itinerary.description != null) ...[
                                          Text(itinerary.description!),
                                          const SizedBox(height: 12),
                                        ],
                                        if (itinerary.activities.isNotEmpty) ...[
                                          const Text(
                                            'Activities',
                                            style:
                                                TextStyle(fontWeight: FontWeight.bold),
                                          ),
                                          const SizedBox(height: 4),
                                          ...itinerary.activities.map((a) => Row(
                                                children: [
                                                  const Icon(Icons.arrow_right,
                                                      size: 16),
                                                  Expanded(child: Text(a)),
                                                ],
                                              )),
                                          const SizedBox(height: 8),
                                        ],
                                        if (itinerary.meals.isNotEmpty) ...[
                                          const Text(
                                            'Meals',
                                            style:
                                                TextStyle(fontWeight: FontWeight.bold),
                                          ),
                                          const SizedBox(height: 4),
                                          Wrap(
                                            spacing: 8,
                                            children: itinerary.meals
                                                .map((m) => Chip(
                                                      label: Text(m),
                                                      visualDensity:
                                                          VisualDensity.compact,
                                                    ))
                                                .toList(),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            )),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: BlocBuilder<TourismBloc, TourismState>(
        builder: (context, state) {
          if (state.selectedPackage == null) return const SizedBox.shrink();
          return FloatingActionButton.extended(
            onPressed: () {
            },
            icon: const Icon(Icons.book_online),
            label: const Text('Book Now'),
          );
        },
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
