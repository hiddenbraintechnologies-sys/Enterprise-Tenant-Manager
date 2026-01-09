import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/logistics_bloc.dart';
import '../bloc/logistics_event.dart';
import '../bloc/logistics_state.dart';
import '../../domain/entities/logistics_order.dart';
import '../../domain/entities/logistics_tracking.dart';

class OrderDetailPage extends StatefulWidget {
  final String orderId;

  const OrderDetailPage({super.key, required this.orderId});

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  @override
  void initState() {
    super.initState();
    context.read<LogisticsBloc>().add(LoadOrder(widget.orderId));
    context.read<LogisticsBloc>().add(LoadOrderTracking(widget.orderId));
    context.read<LogisticsBloc>().add(const LoadAvailableDrivers());
    context.read<LogisticsBloc>().add(const LoadAvailableVehicles());
  }

  @override
  void dispose() {
    context.read<LogisticsBloc>().add(const ClearSelectedOrder());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<LogisticsBloc, LogisticsState>(
      listener: (context, state) {
        if (state.operationSuccess != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.operationSuccess!),
              backgroundColor: Colors.green,
            ),
          );
          context.read<LogisticsBloc>().add(const ClearError());
        }
        if (state.operationError != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.operationError!),
              backgroundColor: Colors.red,
            ),
          );
          context.read<LogisticsBloc>().add(const ClearError());
        }
      },
      builder: (context, state) {
        if (state.selectedOrderStatus == LogisticsStatus.loading) {
          return Scaffold(
            appBar: AppBar(title: const Text('Order Details')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        final order = state.selectedOrder;
        if (order == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Order Details')),
            body: const Center(child: Text('Order not found')),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(order.orderNumber),
            actions: [
              if (order.status != LogisticsOrderStatus.delivered &&
                  order.status != LogisticsOrderStatus.cancelled)
                PopupMenuButton<String>(
                  onSelected: (value) => _handleAction(value, order, state),
                  itemBuilder: (context) => [
                    if (order.driverId == null)
                      const PopupMenuItem(
                        value: 'assign_driver',
                        child: Text('Assign Driver'),
                      ),
                    if (order.status == LogisticsOrderStatus.pending)
                      const PopupMenuItem(
                        value: 'picked_up',
                        child: Text('Mark as Picked Up'),
                      ),
                    if (order.status == LogisticsOrderStatus.pickedUp)
                      const PopupMenuItem(
                        value: 'in_transit',
                        child: Text('Mark as In Transit'),
                      ),
                    if (order.status == LogisticsOrderStatus.inTransit)
                      const PopupMenuItem(
                        value: 'delivered',
                        child: Text('Mark as Delivered'),
                      ),
                    const PopupMenuItem(
                      value: 'cancelled',
                      child: Text('Cancel Order'),
                    ),
                  ],
                ),
            ],
          ),
          body: RefreshIndicator(
            onRefresh: () async {
              context.read<LogisticsBloc>().add(LoadOrder(widget.orderId));
              context.read<LogisticsBloc>().add(LoadOrderTracking(widget.orderId));
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatusCard(order),
                  const SizedBox(height: 16),
                  _buildAddressCard(order),
                  const SizedBox(height: 16),
                  _buildDetailsCard(order),
                  const SizedBox(height: 16),
                  if (order.driverId != null) ...[
                    _buildDriverCard(order),
                    const SizedBox(height: 16),
                  ],
                  _buildItemsCard(order),
                  const SizedBox(height: 16),
                  _buildTrackingTimeline(state.trackingHistory),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatusCard(LogisticsOrder order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: _getStatusColor(order.status),
              child: Icon(
                _getStatusIcon(order.status),
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.statusDisplayName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (order.estimatedDelivery != null)
                    Text(
                      'ETA: ${_formatDate(order.estimatedDelivery!)}',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressCard(LogisticsOrder order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Addresses',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.location_on, color: Colors.green, size: 20),
                    ),
                    Container(
                      width: 2,
                      height: 40,
                      color: Colors.grey[300],
                    ),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.flag, color: Colors.red, size: 20),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Pickup',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        order.pickupAddress,
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Delivery',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      Text(
                        order.deliveryAddress,
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailsCard(LogisticsOrder order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Order Details',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildDetailRow('Order Number', order.orderNumber),
            _buildDetailRow('Total Weight', '${order.weight} kg'),
            _buildDetailRow('Items Count', '${order.items.length}'),
            if (order.customerName != null)
              _buildDetailRow('Customer', order.customerName!),
            _buildDetailRow('Created', _formatDate(order.createdAt)),
            if (order.actualDelivery != null)
              _buildDetailRow('Delivered', _formatDate(order.actualDelivery!)),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildDriverCard(LogisticsOrder order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Assigned Driver',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                CircleAvatar(
                  child: Text(order.driverName?[0] ?? 'D'),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.driverName ?? 'Unknown Driver',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      if (order.vehicleNumber != null)
                        Text(
                          order.vehicleNumber!,
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildItemsCard(LogisticsOrder order) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Items',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (order.items.isEmpty)
              const Text('No items listed')
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: order.items.length,
                separatorBuilder: (_, __) => const Divider(),
                itemBuilder: (context, index) {
                  final item = order.items[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.name),
                    subtitle: item.description != null
                        ? Text(item.description!)
                        : null,
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('Qty: ${item.quantity}'),
                        Text('${item.weight} kg'),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrackingTimeline(List<LogisticsTracking> tracking) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tracking History',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            if (tracking.isEmpty)
              const Text('No tracking updates yet')
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: tracking.length,
                itemBuilder: (context, index) {
                  final item = tracking[index];
                  final isFirst = index == 0;
                  final isLast = index == tracking.length - 1;

                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: isFirst ? Colors.blue : Colors.grey[400],
                              shape: BoxShape.circle,
                            ),
                          ),
                          if (!isLast)
                            Container(
                              width: 2,
                              height: 60,
                              color: Colors.grey[300],
                            ),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.statusDisplayName,
                                style: const TextStyle(fontWeight: FontWeight.w500),
                              ),
                              Text(
                                _formatDate(item.timestamp),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                              ),
                              if (item.notes != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(
                                    item.notes!,
                                    style: TextStyle(color: Colors.grey[600]),
                                  ),
                                ),
                              if (item.location.address != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Row(
                                    children: [
                                      Icon(Icons.location_on,
                                          size: 14, color: Colors.grey[500]),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          item.location.address!,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey[500],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  void _handleAction(String action, LogisticsOrder order, LogisticsState state) {
    if (action == 'assign_driver') {
      _showAssignDriverDialog(order, state);
    } else {
      context.read<LogisticsBloc>().add(UpdateOrderStatus(
            orderId: order.id,
            status: action,
          ));
    }
  }

  void _showAssignDriverDialog(LogisticsOrder order, LogisticsState state) {
    String? selectedDriverId;
    String? selectedVehicleId;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Assign Driver'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: selectedDriverId,
                decoration: const InputDecoration(
                  labelText: 'Select Driver',
                  border: OutlineInputBorder(),
                ),
                items: state.availableDrivers
                    .map((d) => DropdownMenuItem(
                          value: d.id,
                          child: Text(d.name),
                        ))
                    .toList(),
                onChanged: (value) {
                  setDialogState(() => selectedDriverId = value);
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: selectedVehicleId,
                decoration: const InputDecoration(
                  labelText: 'Select Vehicle (Optional)',
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('None')),
                  ...state.availableVehicles.map((v) => DropdownMenuItem(
                        value: v.id,
                        child: Text('${v.registrationNumber} (${v.typeDisplayName})'),
                      )),
                ],
                onChanged: (value) {
                  setDialogState(() => selectedVehicleId = value);
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
              onPressed: selectedDriverId != null
                  ? () {
                      context.read<LogisticsBloc>().add(AssignDriver(
                            orderId: order.id,
                            driverId: selectedDriverId!,
                            vehicleId: selectedVehicleId,
                          ));
                      Navigator.pop(context);
                    }
                  : null,
              child: const Text('Assign'),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(LogisticsOrderStatus status) {
    switch (status) {
      case LogisticsOrderStatus.pending:
        return Colors.orange;
      case LogisticsOrderStatus.pickedUp:
        return Colors.blue;
      case LogisticsOrderStatus.inTransit:
        return Colors.indigo;
      case LogisticsOrderStatus.delivered:
        return Colors.green;
      case LogisticsOrderStatus.cancelled:
        return Colors.red;
    }
  }

  IconData _getStatusIcon(LogisticsOrderStatus status) {
    switch (status) {
      case LogisticsOrderStatus.pending:
        return Icons.pending_actions;
      case LogisticsOrderStatus.pickedUp:
        return Icons.inventory;
      case LogisticsOrderStatus.inTransit:
        return Icons.local_shipping;
      case LogisticsOrderStatus.delivered:
        return Icons.check_circle;
      case LogisticsOrderStatus.cancelled:
        return Icons.cancel;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}
