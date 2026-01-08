import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/furniture_invoice.dart';
import '../../domain/entities/notification_log.dart';
import '../../domain/repositories/furniture_repository.dart';

class FurnitureInvoicesPage extends StatefulWidget {
  const FurnitureInvoicesPage({super.key});

  @override
  State<FurnitureInvoicesPage> createState() => _FurnitureInvoicesPageState();
}

class _FurnitureInvoicesPageState extends State<FurnitureInvoicesPage> {
  late final FurnitureRepository _repository;
  List<FurnitureInvoice> _invoices = [];
  bool _isLoading = true;
  String? _error;
  String _statusFilter = 'all';
  int _page = 1;
  int _totalPages = 1;
  bool _hasMore = false;

  @override
  void initState() {
    super.initState();
    _repository = GetIt.instance<FurnitureRepository>();
    _loadInvoices();
  }

  Future<void> _loadInvoices({bool loadMore = false}) async {
    if (!loadMore) {
      setState(() {
        _isLoading = true;
        _error = null;
        _page = 1;
      });
    }

    try {
      final params = PaginationParams(page: _page, limit: 20);
      final response = await _repository.getInvoices(
        params,
        status: _statusFilter == 'all' ? null : _statusFilter,
      );

      setState(() {
        if (loadMore) {
          _invoices.addAll(response.data);
        } else {
          _invoices = response.data;
        }
        _totalPages = response.pagination.totalPages;
        _hasMore = response.pagination.hasNext;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_hasMore && !_isLoading) {
      _page++;
      await _loadInvoices(loadMore: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoices'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() {
                _statusFilter = value;
              });
              _loadInvoices();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'all', child: Text('All')),
              const PopupMenuItem(value: 'draft', child: Text('Draft')),
              const PopupMenuItem(value: 'issued', child: Text('Issued')),
              const PopupMenuItem(value: 'overdue', child: Text('Overdue')),
              const PopupMenuItem(value: 'paid', child: Text('Paid')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadInvoices(),
        child: _buildBody(theme),
      ),
    );
  }

  Widget _buildBody(ThemeData theme) {
    if (_isLoading && _invoices.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null && _invoices.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadInvoices,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_invoices.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.receipt_long_outlined, size: 64, color: theme.colorScheme.outline),
            const SizedBox(height: 16),
            Text(
              'No invoices found',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.outline,
              ),
            ),
          ],
        ),
      );
    }

    return NotificationListener<ScrollNotification>(
      onNotification: (scrollInfo) {
        if (scrollInfo.metrics.pixels >= scrollInfo.metrics.maxScrollExtent - 200) {
          _loadMore();
        }
        return false;
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _invoices.length + (_hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index >= _invoices.length) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            );
          }
          final invoice = _invoices[index];
          return InvoiceCard(
            invoice: invoice,
            repository: _repository,
            onTap: () => _showInvoiceDetails(invoice),
            onSendNotification: () => _showNotificationDialog(invoice),
          );
        },
      ),
    );
  }

  void _showInvoiceDetails(FurnitureInvoice invoice) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => InvoiceDetailSheet(
        invoice: invoice,
        repository: _repository,
      ),
    );
  }

  void _showNotificationDialog(FurnitureInvoice invoice) {
    showDialog(
      context: context,
      builder: (context) => SendNotificationDialog(
        invoice: invoice,
        repository: _repository,
        onSuccess: () => _loadInvoices(),
      ),
    );
  }
}

class InvoiceCard extends StatelessWidget {
  final FurnitureInvoice invoice;
  final FurnitureRepository repository;
  final VoidCallback onTap;
  final VoidCallback onSendNotification;

  const InvoiceCard({
    super.key,
    required this.invoice,
    required this.repository,
    required this.onTap,
    required this.onSendNotification,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    invoice.invoiceNumber,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  _StatusBadge(status: invoice.status),
                ],
              ),
              const SizedBox(height: 8),
              if (invoice.billingName != null)
                Text(
                  invoice.billingName!,
                  style: theme.textTheme.bodyMedium,
                ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${invoice.currency} ${invoice.totalAmount.toStringAsFixed(2)}',
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (invoice.dueDate != null)
                    Text(
                      'Due: ${_formatDate(invoice.dueDate!)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: invoice.isOverdue
                            ? theme.colorScheme.error
                            : theme.colorScheme.outline,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: onSendNotification,
                    icon: const Icon(Icons.send, size: 18),
                    label: const Text('Notify'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (color, bgColor) = _getStatusColors(theme);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        _getStatusText(),
        style: theme.textTheme.labelSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  (Color, Color) _getStatusColors(ThemeData theme) {
    switch (status) {
      case 'paid':
        return (Colors.green.shade700, Colors.green.shade50);
      case 'overdue':
        return (Colors.red.shade700, Colors.red.shade50);
      case 'issued':
        return (Colors.blue.shade700, Colors.blue.shade50);
      case 'draft':
        return (Colors.grey.shade700, Colors.grey.shade100);
      case 'partially_paid':
        return (Colors.orange.shade700, Colors.orange.shade50);
      case 'cancelled':
        return (Colors.red.shade700, Colors.red.shade50);
      default:
        return (theme.colorScheme.outline, theme.colorScheme.surfaceContainerHighest);
    }
  }

  String _getStatusText() {
    switch (status) {
      case 'partially_paid':
        return 'Partial';
      default:
        if (status.isEmpty) return 'Unknown';
        return status[0].toUpperCase() + status.substring(1);
    }
  }
}

class InvoiceDetailSheet extends StatefulWidget {
  final FurnitureInvoice invoice;
  final FurnitureRepository repository;

  const InvoiceDetailSheet({
    super.key,
    required this.invoice,
    required this.repository,
  });

  @override
  State<InvoiceDetailSheet> createState() => _InvoiceDetailSheetState();
}

class _InvoiceDetailSheetState extends State<InvoiceDetailSheet> {
  List<NotificationLog> _notifications = [];
  bool _loadingNotifications = true;
  String? _notificationError;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      final notifications = await widget.repository.getInvoiceNotifications(widget.invoice.id);
      setState(() {
        _notifications = notifications;
        _loadingNotifications = false;
      });
    } catch (e) {
      setState(() {
        _notificationError = e.toString();
        _loadingNotifications = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final invoice = widget.invoice;

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.outline.withValues(alpha: 0.3),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      invoice.invoiceNumber,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    _StatusBadge(status: invoice.status),
                  ],
                ),
                const SizedBox(height: 24),
                _DetailRow(label: 'Customer', value: invoice.billingName ?? 'N/A'),
                _DetailRow(label: 'Email', value: invoice.billingEmail ?? 'N/A'),
                _DetailRow(label: 'Phone', value: invoice.billingPhone ?? 'N/A'),
                const Divider(height: 32),
                _DetailRow(
                  label: 'Subtotal',
                  value: '${invoice.currency} ${invoice.subtotal.toStringAsFixed(2)}',
                ),
                _DetailRow(
                  label: 'Tax',
                  value: '${invoice.currency} ${invoice.taxAmount.toStringAsFixed(2)}',
                ),
                _DetailRow(
                  label: 'Total',
                  value: '${invoice.currency} ${invoice.totalAmount.toStringAsFixed(2)}',
                  isBold: true,
                ),
                _DetailRow(
                  label: 'Paid',
                  value: '${invoice.currency} ${invoice.paidAmount.toStringAsFixed(2)}',
                ),
                _DetailRow(
                  label: 'Balance',
                  value: '${invoice.currency} ${invoice.balanceAmount.toStringAsFixed(2)}',
                  isBold: true,
                  valueColor: invoice.balanceAmount > 0 ? theme.colorScheme.error : null,
                ),
                const SizedBox(height: 24),
                const Text(
                  'Notification History',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 12),
                _buildNotificationHistory(theme),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildNotificationHistory(ThemeData theme) {
    if (_loadingNotifications) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_notificationError != null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.errorContainer.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          'Failed to load notifications',
          style: TextStyle(color: theme.colorScheme.error),
        ),
      );
    }

    if (_notifications.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: Text(
            'No notifications sent yet',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
        ),
      );
    }

    return Column(
      children: _notifications.map((log) => NotificationLogTile(log: log)).toList(),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isBold;
  final Color? valueColor;

  const _DetailRow({
    required this.label,
    required this.value,
    this.isBold = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.outline,
            ),
          ),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: isBold ? FontWeight.bold : null,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}

class NotificationLogTile extends StatelessWidget {
  final NotificationLog log;

  const NotificationLogTile({super.key, required this.log});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (statusIcon, statusColor) = _getStatusIconAndColor();

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.2)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            log.channel == 'email' ? Icons.email_outlined : Icons.chat_outlined,
            size: 20,
            color: theme.colorScheme.outline,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  log.eventTypeDisplay,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  log.recipient,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.outline,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(statusIcon, size: 14, color: statusColor),
                  const SizedBox(width: 4),
                  Text(
                    log.statusDisplay,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: statusColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              Text(
                _formatDateTime(log.createdAt),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  (IconData, Color) _getStatusIconAndColor() {
    switch (log.status) {
      case 'sent':
      case 'delivered':
        return (Icons.check_circle, Colors.green);
      case 'pending':
        return (Icons.schedule, Colors.orange);
      case 'retrying':
        return (Icons.refresh, Colors.orange);
      case 'failed':
        return (Icons.error, Colors.red);
      default:
        return (Icons.info, Colors.grey);
    }
  }

  String _formatDateTime(DateTime dt) {
    return '${dt.day}/${dt.month} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class SendNotificationDialog extends StatefulWidget {
  final FurnitureInvoice invoice;
  final FurnitureRepository repository;
  final VoidCallback? onSuccess;

  const SendNotificationDialog({
    super.key,
    required this.invoice,
    required this.repository,
    this.onSuccess,
  });

  @override
  State<SendNotificationDialog> createState() => _SendNotificationDialogState();
}

class _SendNotificationDialogState extends State<SendNotificationDialog> {
  String _channel = 'email';
  String _eventType = 'invoice_issued';
  bool _isSending = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: const Text('Send Notification'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Invoice: ${widget.invoice.invoiceNumber}',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            const Text('Channel'),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'email', label: Text('Email'), icon: Icon(Icons.email)),
                ButtonSegment(value: 'whatsapp', label: Text('WhatsApp'), icon: Icon(Icons.chat)),
              ],
              selected: {_channel},
              onSelectionChanged: (selected) {
                setState(() => _channel = selected.first);
              },
            ),
            const SizedBox(height: 16),
            const Text('Notification Type'),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _eventType,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: const [
                DropdownMenuItem(value: 'invoice_issued', child: Text('Invoice Issued')),
                DropdownMenuItem(value: 'payment_reminder', child: Text('Payment Reminder')),
                DropdownMenuItem(value: 'invoice_overdue', child: Text('Overdue Notice')),
                DropdownMenuItem(value: 'payment_received', child: Text('Payment Confirmation')),
              ],
              onChanged: (value) {
                if (value != null) setState(() => _eventType = value);
              },
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _InfoRow(
                    label: 'Recipient',
                    value: _channel == 'email'
                        ? widget.invoice.billingEmail ?? 'N/A'
                        : widget.invoice.billingPhone ?? 'N/A',
                  ),
                  _InfoRow(
                    label: 'Amount',
                    value: '${widget.invoice.currency} ${widget.invoice.totalAmount.toStringAsFixed(2)}',
                  ),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: TextStyle(color: theme.colorScheme.error, fontSize: 12),
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSending ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton.icon(
          onPressed: _isSending ? null : _sendNotification,
          icon: _isSending
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.send),
          label: Text(_isSending ? 'Sending...' : 'Send'),
        ),
      ],
    );
  }

  Future<void> _sendNotification() async {
    setState(() {
      _isSending = true;
      _error = null;
    });

    try {
      await widget.repository.sendInvoiceNotification(
        widget.invoice.id,
        channel: _channel,
        eventType: _eventType,
      );

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Notification sent successfully')),
        );
        widget.onSuccess?.call();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to send: ${e.toString()}';
          _isSending = false;
        });
      }
    }
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: theme.textTheme.bodySmall),
          Text(value, style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
