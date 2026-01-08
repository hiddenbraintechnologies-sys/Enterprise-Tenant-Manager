import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/furniture_bloc.dart';
import '../bloc/furniture_event.dart';
import '../bloc/furniture_state.dart';
import '../../domain/entities/furniture_product.dart';

class ProductsPage extends StatefulWidget {
  const ProductsPage({super.key});

  @override
  State<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends State<ProductsPage> {
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();
  String? _selectedProductType;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    context.read<FurnitureBloc>().add(const LoadProducts());
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<FurnitureBloc>().add(const LoadMoreProducts());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  void _onSearch(String value) {
    context.read<FurnitureBloc>().add(LoadProducts(
      search: value.isEmpty ? null : value,
      productType: _selectedProductType,
    ));
  }

  void _onProductTypeChanged(String? value) {
    setState(() => _selectedProductType = value);
    context.read<FurnitureBloc>().add(LoadProducts(
      search: _searchController.text.isEmpty ? null : _searchController.text,
      productType: value,
    ));
  }

  void _clearFilters() {
    _searchController.clear();
    setState(() => _selectedProductType = null);
    context.read<FurnitureBloc>().add(const LoadProducts());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => context.read<FurnitureBloc>().add(const LoadProducts()),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: BlocBuilder<FurnitureBloc, FurnitureState>(
              builder: (context, state) {
                if (state.productsStatus == FurnitureStatus.loading && state.products.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state.productsStatus == FurnitureStatus.failure) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Error: ${state.productsError}'),
                        ElevatedButton(
                          onPressed: () => context.read<FurnitureBloc>().add(const LoadProducts()),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                if (state.products.isEmpty) {
                  return const Center(child: Text('No products found'));
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    context.read<FurnitureBloc>().add(const LoadProducts());
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    itemCount: state.hasMoreProducts
                        ? state.products.length + 1
                        : state.products.length,
                    itemBuilder: (context, index) {
                      if (index >= state.products.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(8.0),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }
                      return _ProductCard(product: state.products[index]);
                    },
                  ),
                );
              },
            ),
          ),
          _buildPaginationInfo(),
        ],
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
              hintText: 'Search products...',
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
                  value: _selectedProductType,
                  decoration: const InputDecoration(
                    labelText: 'Product Type',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12),
                  ),
                  items: const [
                    DropdownMenuItem(value: null, child: Text('All')),
                    DropdownMenuItem(value: 'ready_made', child: Text('Ready Made')),
                    DropdownMenuItem(value: 'made_to_order', child: Text('Made to Order')),
                    DropdownMenuItem(value: 'semi_finished', child: Text('Semi Finished')),
                  ],
                  onChanged: _onProductTypeChanged,
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
    return BlocBuilder<FurnitureBloc, FurnitureState>(
      builder: (context, state) {
        if (state.productsPagination == null) return const SizedBox.shrink();
        
        final pagination = state.productsPagination!;
        final start = ((pagination.page - 1) * pagination.limit) + 1;
        final end = start + state.products.length - 1;
        
        return Container(
          padding: const EdgeInsets.all(8.0),
          color: Theme.of(context).colorScheme.surfaceVariant,
          child: Text(
            'Showing $start-$end of ${pagination.total} products',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        );
      },
    );
  }
}

class _ProductCard extends StatelessWidget {
  final FurnitureProduct product;

  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: ListTile(
        title: Text(product.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (product.sku != null) Text('SKU: ${product.sku}'),
            Text('Type: ${product.productType}'),
            Text('Price: \$${product.sellingPrice.toStringAsFixed(2)}'),
          ],
        ),
        trailing: Icon(
          product.isActive ? Icons.check_circle : Icons.cancel,
          color: product.isActive ? Colors.green : Colors.red,
        ),
        onTap: () {
        },
      ),
    );
  }
}
