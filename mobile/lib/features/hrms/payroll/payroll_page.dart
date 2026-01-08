import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/payroll_bloc.dart';
import '../data/models/hr_models.dart';

class PayrollPage extends StatefulWidget {
  const PayrollPage({super.key});

  @override
  State<PayrollPage> createState() => _PayrollPageState();
}

class _PayrollPageState extends State<PayrollPage> {
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;
  String _selectedStatus = 'all';

  final List<String> _months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  @override
  void initState() {
    super.initState();
    _loadPayroll();
  }

  void _loadPayroll() {
    context.read<PayrollBloc>().add(LoadPayroll(
      month: _selectedMonth,
      year: _selectedYear,
      status: _selectedStatus == 'all' ? null : _selectedStatus,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payroll'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: BlocConsumer<PayrollBloc, PayrollState>(
        listener: (context, state) {
          if (state is PayrollActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message)),
            );
          } else if (state is PayrollError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
        },
        builder: (context, state) {
          return Column(
            children: [
              _buildMonthSelector(),
              if (state is PayrollLoaded) _buildSummaryCard(state),
              Expanded(
                child: _buildContent(state),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showRunPayrollDialog,
        icon: const Icon(Icons.play_arrow),
        label: const Text('Run Payroll'),
      ),
    );
  }

  Widget _buildMonthSelector() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () {
              setState(() {
                if (_selectedMonth == 1) {
                  _selectedMonth = 12;
                  _selectedYear--;
                } else {
                  _selectedMonth--;
                }
              });
              _loadPayroll();
            },
          ),
          InkWell(
            onTap: _showMonthPicker,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                border: Border.all(color: Theme.of(context).dividerColor),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${_months[_selectedMonth - 1]} $_selectedYear',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () {
              setState(() {
                if (_selectedMonth == 12) {
                  _selectedMonth = 1;
                  _selectedYear++;
                } else {
                  _selectedMonth++;
                }
              });
              _loadPayroll();
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(PayrollLoaded state) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildSummaryItem('Total', '${state.total}', Colors.blue),
            _buildSummaryItem('Processed', '${state.processedCount}', Colors.green),
            _buildSummaryItem('Pending', '${state.pendingCount}', Colors.orange),
            _buildSummaryItem('Failed', '${state.failedCount}', Colors.red),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _buildContent(PayrollState state) {
    if (state is PayrollLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state is PayrollError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: 16),
            Text(state.message),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loadPayroll,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state is PayrollLoaded) {
      if (state.records.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.payments, size: 64, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(height: 16),
              Text(
                'No payroll records',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Run payroll to generate records',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        );
      }

      return RefreshIndicator(
        onRefresh: () async => _loadPayroll(),
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: state.records.length,
          itemBuilder: (context, index) {
            return _buildPayrollCard(state.records[index]);
          },
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildPayrollCard(HrPayroll payroll) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: const CircleAvatar(child: Icon(Icons.person)),
        title: Text(payroll.employeeName ?? 'Employee'),
        subtitle: Text('ID: ${payroll.employeeId.substring(0, 8)}...'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '\$${payroll.netPay.toStringAsFixed(2)}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            _buildStatusChip(payroll.status),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildPayrollRow('Basic Salary', '\$${payroll.basicSalary.toStringAsFixed(2)}'),
                _buildPayrollRow('Allowances', '\$${payroll.allowances.toStringAsFixed(2)}'),
                const Divider(),
                _buildPayrollRow('Gross Salary', '\$${payroll.grossSalary.toStringAsFixed(2)}', bold: true),
                _buildPayrollRow('Deductions', '-\$${payroll.deductions.toStringAsFixed(2)}'),
                const Divider(),
                _buildPayrollRow('Net Salary', '\$${payroll.netPay.toStringAsFixed(2)}', bold: true),
                if (payroll.status == 'pending') ...[
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      FilledButton(
                        onPressed: () {
                          context.read<PayrollBloc>().add(ProcessPayroll(payroll.id));
                        },
                        child: const Text('Process'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPayrollRow(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value,
            style: bold ? const TextStyle(fontWeight: FontWeight.bold) : null,
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'processed':
        color = Colors.green;
        break;
      case 'failed':
        color = Colors.red;
        break;
      case 'pending':
      case 'draft':
        color = Colors.orange;
        break;
      default:
        color = Colors.grey;
    }

    return Chip(
      label: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10),
      ),
      backgroundColor: color.withOpacity(0.1),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }

  void _showMonthPicker() {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SizedBox(
          height: 300,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Select Month',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              Expanded(
                child: GridView.count(
                  crossAxisCount: 3,
                  padding: const EdgeInsets.all(16),
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 2,
                  children: List.generate(12, (index) {
                    final month = index + 1;
                    return OutlinedButton(
                      onPressed: () {
                        setState(() => _selectedMonth = month);
                        Navigator.pop(context);
                        _loadPayroll();
                      },
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _selectedMonth == month
                            ? Theme.of(context).colorScheme.primaryContainer
                            : null,
                      ),
                      child: Text(_months[index].substring(0, 3)),
                    );
                  }),
                ),
              ),
            ],
          ),
        );
      },
    );
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
                  Text(
                    'Filter by Status',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    children: [
                      FilterChip(
                        label: const Text('All'),
                        selected: _selectedStatus == 'all',
                        onSelected: (selected) {
                          setModalState(() => _selectedStatus = 'all');
                          setState(() {});
                        },
                      ),
                      FilterChip(
                        label: const Text('Pending'),
                        selected: _selectedStatus == 'pending',
                        onSelected: (selected) {
                          setModalState(() => _selectedStatus = 'pending');
                          setState(() {});
                        },
                      ),
                      FilterChip(
                        label: const Text('Processed'),
                        selected: _selectedStatus == 'processed',
                        onSelected: (selected) {
                          setModalState(() => _selectedStatus = 'processed');
                          setState(() {});
                        },
                      ),
                      FilterChip(
                        label: const Text('Failed'),
                        selected: _selectedStatus == 'failed',
                        onSelected: (selected) {
                          setModalState(() => _selectedStatus = 'failed');
                          setState(() {});
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        Navigator.pop(context);
                        _loadPayroll();
                      },
                      child: const Text('Apply Filter'),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showRunPayrollDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Run Payroll'),
          content: Text(
            'Run payroll for ${_months[_selectedMonth - 1]} $_selectedYear?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                context.read<PayrollBloc>().add(RunPayroll(
                  month: _selectedMonth,
                  year: _selectedYear,
                ));
              },
              child: const Text('Run'),
            ),
          ],
        );
      },
    );
  }
}
