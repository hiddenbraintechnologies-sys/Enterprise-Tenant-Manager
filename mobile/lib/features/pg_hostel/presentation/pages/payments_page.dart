import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/pg_payment.dart';
import '../bloc/pg_bloc.dart';
import '../bloc/pg_event.dart';
import '../bloc/pg_state.dart';

class PaymentsPage extends StatefulWidget {
  const PaymentsPage({super.key});

  @override
  State<PaymentsPage> createState() => _PaymentsPageState();
}

class _PaymentsPageState extends State<PaymentsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ScrollController _scrollController = ScrollController();
  String? _selectedStatus;
  String? _selectedType;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadPayments();
    context.read<PgBloc>().add(const LoadOverduePayments());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _loadPayments() {
    context.read<PgBloc>().add(LoadPayments(
          status: _selectedStatus,
          type: _selectedType,
        ));
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.9) {
      context.read<PgBloc>().add(const LoadMorePayments());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payments'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'All Payments'),
            Tab(text: 'Overdue'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAllPaymentsTab(),
          _buildOverdueTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreatePaymentDialog,
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildAllPaymentsTab() {
    return BlocBuilder<PgBloc, PgState>(
      builder: (context, state) {
        if (state.paymentsStatus == PgStatus.loading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state.paymentsStatus == PgStatus.failure) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(state.paymentsError ?? 'Error loading payments'),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _loadPayments,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        if (state.payments.isEmpty) {
          return const Center(child: Text('No payments found'));
        }

        return RefreshIndicator(
          onRefresh: () async => _loadPayments(),
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: state.payments.length +
                (state.paymentsStatus == PgStatus.loadingMore ? 1 : 0),
            itemBuilder: (context, index) {
              if (index >= state.payments.length) {
                return const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: CircularProgressIndicator(),
                  ),
                );
              }
              return _buildPaymentCard(state.payments[index]);
            },
          ),
        );
      },
    );
  }

  Widget _buildOverdueTab() {
    return BlocBuilder<PgBloc, PgState>(
      builder: (context, state) {
        final overduePayments = state.overduePayments;

        if (overduePayments.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle, size: 64, color: Colors.green),
                SizedBox(height: 16),
                Text('No overdue payments'),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: overduePayments.length,
          itemBuilder: (context, index) {
            return _buildPaymentCard(overduePayments[index], isOverdue: true);
          },
        );
      },
    );
  }

  Widget _buildPaymentCard(PgPayment payment, {bool isOverdue = false}) {
    final statusColors = {
      PaymentStatus.pending: Colors.orange,
      PaymentStatus.paid: Colors.green,
      PaymentStatus.overdue: Colors.red,
      PaymentStatus.partial: Colors.amber,
    };

    final typeIcons = {
      PaymentType.rent: Icons.home,
      PaymentType.deposit: Icons.account_balance_wallet,
      PaymentType.maintenance: Icons.build,
      PaymentType.advance: Icons.fast_forward,
      PaymentType.refund: Icons.keyboard_return,
    };

    final color = statusColors[payment.status] ?? Colors.grey;
    final icon = typeIcons[payment.type] ?? Icons.payment;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _showPaymentDetails(payment),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: color.withOpacity(0.2),
                child: Icon(icon, color: color),
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
                            payment.residentName ?? 'Unknown',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: color.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            payment.status.name.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: color,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Room ${payment.roomNumber ?? 'N/A'} • ${payment.type.name.toUpperCase()}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _getMonthYear(payment.month, payment.year),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                        Text(
                          '\$${payment.amount.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: color,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (payment.status != PaymentStatus.paid)
                IconButton(
                  icon: const Icon(Icons.payment, color: Colors.green),
                  onPressed: () => _showCollectPaymentDialog(payment),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _getMonthYear(int month, int year) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[month - 1]} $year';
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
                    'Filter Payments',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String?>(
                    value: _selectedStatus,
                    decoration: const InputDecoration(
                      labelText: 'Payment Status',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: 'pending', child: Text('Pending')),
                      DropdownMenuItem(value: 'paid', child: Text('Paid')),
                      DropdownMenuItem(value: 'overdue', child: Text('Overdue')),
                    ],
                    onChanged: (value) {
                      setModalState(() => _selectedStatus = value);
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String?>(
                    value: _selectedType,
                    decoration: const InputDecoration(
                      labelText: 'Payment Type',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: 'rent', child: Text('Rent')),
                      DropdownMenuItem(value: 'deposit', child: Text('Deposit')),
                      DropdownMenuItem(value: 'maintenance', child: Text('Maintenance')),
                    ],
                    onChanged: (value) {
                      setModalState(() => _selectedType = value);
                    },
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            setModalState(() {
                              _selectedStatus = null;
                              _selectedType = null;
                            });
                          },
                          child: const Text('Clear'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            setState(() {});
                            _loadPayments();
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

  void _showCreatePaymentDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Create Payment'),
          content: const Text('Payment creation form would go here'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Create'),
            ),
          ],
        );
      },
    );
  }

  void _showCollectPaymentDialog(PgPayment payment) {
    String selectedMethod = 'cash';
    final transactionIdController = TextEditingController();
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Collect Payment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Amount: \$${payment.amount.toStringAsFixed(2)}'),
              Text('Resident: ${payment.residentName}'),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: selectedMethod,
                decoration: const InputDecoration(
                  labelText: 'Payment Method',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'cash', child: Text('Cash')),
                  DropdownMenuItem(value: 'upi', child: Text('UPI')),
                  DropdownMenuItem(value: 'bank_transfer', child: Text('Bank Transfer')),
                  DropdownMenuItem(value: 'card', child: Text('Card')),
                ],
                onChanged: (v) => selectedMethod = v!,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: transactionIdController,
                decoration: const InputDecoration(
                  labelText: 'Transaction ID (Optional)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesController,
                decoration: const InputDecoration(
                  labelText: 'Notes (Optional)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            BlocBuilder<PgBloc, PgState>(
              builder: (context, state) {
                return ElevatedButton(
                  onPressed: state.isUpdating
                      ? null
                      : () {
                          context.read<PgBloc>().add(CollectPayment(
                                id: payment.id,
                                paymentMethod: selectedMethod,
                                transactionId: transactionIdController.text.isNotEmpty
                                    ? transactionIdController.text
                                    : null,
                                notes: notesController.text.isNotEmpty
                                    ? notesController.text
                                    : null,
                              ));
                          Navigator.pop(context);
                        },
                  child: state.isUpdating
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Collect'),
                );
              },
            ),
          ],
        );
      },
    );
  }

  void _showPaymentDetails(PgPayment payment) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
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
              Text(
                'Payment Details',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              _buildDetailRow('Resident', payment.residentName ?? 'Unknown'),
              _buildDetailRow('Room', payment.roomNumber ?? 'N/A'),
              _buildDetailRow('Amount', '\$${payment.amount.toStringAsFixed(2)}'),
              _buildDetailRow('Type', payment.type.name.toUpperCase()),
              _buildDetailRow('Period', _getMonthYear(payment.month, payment.year)),
              _buildDetailRow('Status', payment.status.name.toUpperCase()),
              if (payment.paidDate != null)
                _buildDetailRow(
                  'Paid On',
                  '${payment.paidDate!.day}/${payment.paidDate!.month}/${payment.paidDate!.year}',
                ),
              if (payment.paymentMethod != null)
                _buildDetailRow('Method', payment.paymentMethod!),
              if (payment.transactionId != null)
                _buildDetailRow('Transaction ID', payment.transactionId!),
            ],
          ),
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
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
