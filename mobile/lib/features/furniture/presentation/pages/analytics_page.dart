import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../domain/entities/analytics_overview.dart';
import '../../domain/entities/ai_insight.dart';
import '../../domain/repositories/furniture_repository.dart';

class FurnitureAnalyticsPage extends StatefulWidget {
  const FurnitureAnalyticsPage({super.key});

  @override
  State<FurnitureAnalyticsPage> createState() => _FurnitureAnalyticsPageState();
}

class _FurnitureAnalyticsPageState extends State<FurnitureAnalyticsPage> with SingleTickerProviderStateMixin {
  late final FurnitureRepository _repository;
  late final TabController _tabController;
  
  AnalyticsOverview? _analytics;
  List<AiInsight> _insights = [];
  bool _isLoading = true;
  bool _isGenerating = false;
  String? _error;
  String _period = '30d';

  @override
  void initState() {
    super.initState();
    _repository = GetIt.instance<FurnitureRepository>();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _repository.getAnalyticsOverview(period: _period),
        _repository.getInsights(),
      ]);

      setState(() {
        _analytics = results[0] as AnalyticsOverview;
        _insights = results[1] as List<AiInsight>;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _generateInsights() async {
    setState(() => _isGenerating = true);

    try {
      await _repository.generateInsights();
      final insights = await _repository.getInsights();
      setState(() {
        _insights = insights;
        _isGenerating = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Insights generated successfully')),
        );
      }
    } catch (e) {
      setState(() => _isGenerating = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to generate insights: $e')),
        );
      }
    }
  }

  Future<void> _dismissInsight(String id) async {
    try {
      await _repository.dismissInsight(id);
      setState(() {
        _insights.removeWhere((i) => i.id == id);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to dismiss: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.calendar_today),
            onSelected: (value) {
              setState(() => _period = value);
              _loadData();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: '7d', child: Text('Last 7 days')),
              const PopupMenuItem(value: '30d', child: Text('Last 30 days')),
              const PopupMenuItem(value: '90d', child: Text('Last 90 days')),
              const PopupMenuItem(value: '1y', child: Text('Last year')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Production'),
            Tab(text: 'Sales'),
            Tab(text: 'Insights'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildError(theme)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(theme),
                    _buildProductionTab(theme),
                    _buildSalesTab(theme),
                    _buildInsightsTab(theme),
                  ],
                ),
    );
  }

  Widget _buildError(ThemeData theme) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
          const SizedBox(height: 16),
          Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadData,
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(ThemeData theme) {
    if (_analytics == null) return const SizedBox();

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildMetricCard(
            'Total Revenue',
            '\$${_analytics!.sales.revenueUsd.toStringAsFixed(2)}',
            Icons.attach_money,
            Colors.green,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSmallMetricCard(
                  'Production Orders',
                  _analytics!.production.total.toString(),
                  '${_analytics!.production.completed} completed',
                  Icons.factory,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSmallMetricCard(
                  'Deliveries',
                  _analytics!.operations.totalDeliveries.toString(),
                  '${_analytics!.operations.deliveryOnTimeRate.toStringAsFixed(0)}% on-time',
                  Icons.local_shipping,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSmallMetricCard(
                  'Outstanding',
                  '\$${_analytics!.payments.totalReceivablesUsd.toStringAsFixed(0)}',
                  '${_analytics!.payments.overdueInvoices} overdue',
                  Icons.receipt_long,
                  isWarning: _analytics!.payments.overdueInvoices > 0,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSmallMetricCard(
                  'Wastage',
                  '${_analytics!.production.wastagePercentage.toStringAsFixed(1)}%',
                  'material waste',
                  Icons.delete_sweep,
                  isWarning: _analytics!.production.wastagePercentage > 10,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildSectionTitle('Quick Stats'),
          const SizedBox(height: 12),
          _buildStatRow('Avg Production Time', '${_analytics!.production.avgProductionTimeHours.toStringAsFixed(1)} hours'),
          _buildStatRow('Order Conversion Rate', '${_analytics!.sales.conversionRate.toStringAsFixed(1)}%'),
          _buildStatRow('Installation Rating', '${_analytics!.operations.avgInstallationRating.toStringAsFixed(1)}/5'),
          _buildStatRow('Payments Received', '\$${_analytics!.payments.paymentsReceived.toStringAsFixed(2)}'),
        ],
      ),
    );
  }

  Widget _buildProductionTab(ThemeData theme) {
    if (_analytics == null) return const SizedBox();
    final prod = _analytics!.production;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: _buildSmallMetricCard(
                  'Total Orders',
                  prod.total.toString(),
                  null,
                  Icons.list_alt,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSmallMetricCard(
                  'Completed',
                  prod.completed.toString(),
                  null,
                  Icons.check_circle,
                  isSuccess: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSmallMetricCard(
                  'In Progress',
                  prod.inProgress.toString(),
                  null,
                  Icons.pending,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSmallMetricCard(
                  'Wastage Rate',
                  '${prod.wastagePercentage.toStringAsFixed(1)}%',
                  null,
                  Icons.delete_sweep,
                  isWarning: prod.wastagePercentage > 10,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildSectionTitle('Production Efficiency'),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Completion Rate', style: TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: prod.total > 0 ? prod.completed / prod.total : 0,
                    minHeight: 8,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${prod.total > 0 ? (prod.completed / prod.total * 100).toStringAsFixed(0) : 0}% completed',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  Text('Average Production Time: ${prod.avgProductionTimeHours.toStringAsFixed(1)} hours'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSalesTab(ThemeData theme) {
    if (_analytics == null) return const SizedBox();
    final sales = _analytics!.sales;
    final payments = _analytics!.payments;

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildMetricCard(
            'Total Revenue',
            '\$${sales.revenueUsd.toStringAsFixed(2)}',
            Icons.attach_money,
            Colors.green,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildSmallMetricCard(
                  'Orders',
                  sales.totalOrders.toString(),
                  '${sales.completedOrders} completed',
                  Icons.shopping_cart,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSmallMetricCard(
                  'Conversion',
                  '${sales.conversionRate.toStringAsFixed(1)}%',
                  'completion rate',
                  Icons.trending_up,
                  isSuccess: sales.conversionRate > 70,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildSectionTitle('Payment Collection'),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildPaymentRow('Total Invoices', payments.totalInvoices.toString()),
                  const Divider(),
                  _buildPaymentRow('Paid', payments.paidInvoices.toString(), isGreen: true),
                  _buildPaymentRow('Overdue', payments.overdueInvoices.toString(), isRed: payments.overdueInvoices > 0),
                  _buildPaymentRow('Partial', payments.partiallyPaidInvoices.toString()),
                  const Divider(),
                  _buildPaymentRow('Total Receivables', '\$${payments.totalReceivablesUsd.toStringAsFixed(2)}', isBold: true),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInsightsTab(ThemeData theme) {
    final unreadInsights = _insights.where((i) => !i.isRead && !i.isDismissed).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            onPressed: _isGenerating ? null : _generateInsights,
            icon: _isGenerating
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.auto_awesome),
            label: Text(_isGenerating ? 'Analyzing...' : 'Generate Insights'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadData,
            child: unreadInsights.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.lightbulb_outline, size: 64, color: theme.colorScheme.outline),
                        const SizedBox(height: 16),
                        const Text('No new insights'),
                        const SizedBox(height: 8),
                        Text(
                          'Tap "Generate Insights" to analyze your data',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: unreadInsights.length,
                    itemBuilder: (context, index) {
                      final insight = unreadInsights[index];
                      return _buildInsightCard(insight, theme);
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildInsightCard(AiInsight insight, ThemeData theme) {
    final severityColor = insight.isCritical
        ? Colors.red
        : insight.isWarning
            ? Colors.orange
            : Colors.blue;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            left: BorderSide(color: severityColor, width: 4),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: severityColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      insight.severity.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: severityColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceVariant,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      insight.category,
                      style: const TextStyle(fontSize: 10),
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => _dismissInsight(insight.id),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                insight.title,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                insight.description,
                style: theme.textTheme.bodySmall,
              ),
              if (insight.metricValue != null) ...[
                const SizedBox(height: 8),
                Text(
                  '${insight.metricValue} ${insight.metricUnit ?? ''}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.outline,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 32),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.grey)),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSmallMetricCard(
    String title,
    String value,
    String? subtitle,
    IconData icon, {
    bool isWarning = false,
    bool isSuccess = false,
  }) {
    final color = isWarning
        ? Colors.orange
        : isSuccess
            ? Colors.green
            : Colors.blue;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                Icon(icon, size: 18, color: color),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(subtitle, style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildPaymentRow(String label, String value, {bool isGreen = false, bool isRed = false, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
              color: isGreen ? Colors.green : isRed ? Colors.red : null,
            ),
          ),
        ],
      ),
    );
  }
}
