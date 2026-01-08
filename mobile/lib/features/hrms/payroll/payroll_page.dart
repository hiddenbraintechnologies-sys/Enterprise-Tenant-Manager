import 'package:flutter/material.dart';

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
      body: Column(
        children: [
          _buildMonthSelector(),
          _buildSummaryCard(),
          Expanded(
            child: _buildPayrollList(),
          ),
        ],
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
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildSummaryItem('Total', '0', Colors.blue),
            _buildSummaryItem('Processed', '0', Colors.green),
            _buildSummaryItem('Pending', '0', Colors.orange),
            _buildSummaryItem('Failed', '0', Colors.red),
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

  Widget _buildPayrollList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 0,
      itemBuilder: (context, index) {
        return _buildPayrollCard(index);
      },
    );
  }

  Widget _buildPayrollCard(int index) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: const CircleAvatar(child: Icon(Icons.person)),
        title: const Text('Employee Name'),
        subtitle: const Text('Employee ID'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Text(
              '\$0.00',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            _buildStatusChip('pending'),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildPayrollRow('Basic Salary', '\$0.00'),
                _buildPayrollRow('Allowances', '\$0.00'),
                _buildPayrollRow('Overtime', '\$0.00'),
                const Divider(),
                _buildPayrollRow('Gross Salary', '\$0.00', bold: true),
                _buildPayrollRow('Tax Deductions', '-\$0.00'),
                _buildPayrollRow('Other Deductions', '-\$0.00'),
                const Divider(),
                _buildPayrollRow('Net Salary', '\$0.00', bold: true),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    OutlinedButton(
                      onPressed: () {},
                      child: const Text('View Details'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: () {},
                      child: const Text('Process'),
                    ),
                  ],
                ),
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
                      setState(() => _selectedStatus = 'all');
                      Navigator.pop(context);
                    },
                  ),
                  FilterChip(
                    label: const Text('Pending'),
                    selected: _selectedStatus == 'pending',
                    onSelected: (selected) {
                      setState(() => _selectedStatus = 'pending');
                      Navigator.pop(context);
                    },
                  ),
                  FilterChip(
                    label: const Text('Processed'),
                    selected: _selectedStatus == 'processed',
                    onSelected: (selected) {
                      setState(() => _selectedStatus = 'processed');
                      Navigator.pop(context);
                    },
                  ),
                  FilterChip(
                    label: const Text('Failed'),
                    selected: _selectedStatus == 'failed',
                    onSelected: (selected) {
                      setState(() => _selectedStatus = 'failed');
                      Navigator.pop(context);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
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
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Payroll processing started...')),
                );
              },
              child: const Text('Run'),
            ),
          ],
        );
      },
    );
  }
}
