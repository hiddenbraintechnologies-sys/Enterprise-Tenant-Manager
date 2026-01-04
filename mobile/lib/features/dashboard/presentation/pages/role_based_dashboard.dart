import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/business_navigation_config.dart';
import '../../../../core/navigation/navigation_item.dart';
import '../../../../core/permissions/role_permissions.dart';
import '../../../../core/offline/connectivity_service.dart';
import '../../../../domain/entities/business_type.dart';
import '../../../../domain/entities/role.dart';
import '../../../../domain/entities/permission.dart';
import '../../../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../../../features/tenant/presentation/bloc/tenant_bloc.dart';
import '../../../../presentation/widgets/offline_indicator.dart';

class RoleBasedDashboard extends StatefulWidget {
  const RoleBasedDashboard({super.key});

  @override
  State<RoleBasedDashboard> createState() => _RoleBasedDashboardState();
}

class _RoleBasedDashboardState extends State<RoleBasedDashboard> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<TenantBloc, TenantState>(
      builder: (context, tenantState) {
        return BlocBuilder<AuthBloc, AuthState>(
          builder: (context, authState) {
            final tenant = tenantState is TenantLoaded ? tenantState.currentTenant : null;
            final user = authState is AuthAuthenticated ? authState.user : null;

            if (tenant == null || user == null) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }

            final businessType = BusinessType.fromString(tenant.businessType);
            final userRole = UserRole.fromString(user.role);
            final permissions = RolePermissions.getPermissions(userRole);

            final bottomNavItems = BusinessNavigationConfig.getBottomNavItems(
              businessType,
              permissions,
            );
            final drawerItems = BusinessNavigationConfig.getDrawerItems(
              businessType,
              permissions,
            );

            return OfflineIndicator(
              child: Scaffold(
                appBar: _buildAppBar(context, tenant.name, userRole),
                drawer: _buildDrawer(context, drawerItems, tenant.name, user.fullName),
                body: _buildBody(context, businessType, userRole, permissions),
                bottomNavigationBar: bottomNavItems.length > 1
                    ? _buildBottomNav(context, bottomNavItems)
                    : null,
              ),
            );
          },
        );
      },
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, String tenantName, UserRole role) {
    return AppBar(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(tenantName, style: const TextStyle(fontSize: 16)),
          Text(
            role.displayName,
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            ),
          ),
        ],
      ),
      actions: [
        StreamBuilder<ConnectionStatus>(
          stream: ConnectivityService.instance.statusStream,
          initialData: ConnectivityService.instance.currentStatus,
          builder: (context, snapshot) {
            if (snapshot.data == ConnectionStatus.offline) {
              return const Padding(
                padding: EdgeInsets.only(right: 8),
                child: Icon(Icons.cloud_off, color: Colors.orange),
              );
            }
            return const SizedBox.shrink();
          },
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          onSelected: (value) => _handleMenuAction(context, value),
          itemBuilder: (context) => [
            const PopupMenuItem(value: 'profile', child: Text('Profile')),
            const PopupMenuItem(value: 'switch_tenant', child: Text('Switch Business')),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'logout',
              child: Text('Logout', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDrawer(
    BuildContext context,
    List<NavigationItem> items,
    String tenantName,
    String userName,
  ) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white,
                  child: Text(
                    userName.isNotEmpty ? userName[0].toUpperCase() : 'U',
                    style: TextStyle(
                      fontSize: 24,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  userName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  tenantName,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          ...items.map((item) => ListTile(
            leading: Icon(item.icon),
            title: Text(item.title),
            onTap: () {
              Navigator.pop(context);
              context.go(item.route);
            },
          )),
        ],
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    BusinessType businessType,
    UserRole role,
    Set<Permission> permissions,
  ) {
    return RefreshIndicator(
      onRefresh: () async {
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildQuickStats(context, businessType, permissions),
            const SizedBox(height: 24),
            _buildQuickActions(context, businessType, permissions),
            const SizedBox(height: 24),
            _buildRecentActivity(context),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickStats(
    BuildContext context,
    BusinessType businessType,
    Set<Permission> permissions,
  ) {
    final stats = _getStatsForBusinessType(businessType, permissions);

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: stats.map((stat) => _StatCard(stat: stat)).toList(),
    );
  }

  List<_StatData> _getStatsForBusinessType(
    BusinessType businessType,
    Set<Permission> permissions,
  ) {
    final stats = <_StatData>[];

    switch (businessType) {
      case BusinessType.pgHostel:
        if (permissions.contains(Permission.viewRooms)) {
          stats.add(_StatData('Occupied Rooms', '24/30', Icons.bed, Colors.blue));
        }
        if (permissions.contains(Permission.viewCustomers)) {
          stats.add(_StatData('Total Tenants', '45', Icons.people, Colors.green));
        }
        break;

      case BusinessType.gym:
        if (permissions.contains(Permission.viewMemberships)) {
          stats.add(_StatData('Active Members', '156', Icons.fitness_center, Colors.orange));
        }
        if (permissions.contains(Permission.viewBookings)) {
          stats.add(_StatData('Today\'s Classes', '8', Icons.calendar_today, Colors.purple));
        }
        break;

      case BusinessType.clinic:
      case BusinessType.diagnostics:
        if (permissions.contains(Permission.viewPatients)) {
          stats.add(_StatData('Patients Today', '28', Icons.medical_information, Colors.red));
        }
        if (permissions.contains(Permission.viewAppointments)) {
          stats.add(_StatData('Appointments', '35', Icons.event_note, Colors.teal));
        }
        break;

      case BusinessType.salon:
        if (permissions.contains(Permission.viewBookings)) {
          stats.add(_StatData('Today\'s Bookings', '18', Icons.calendar_today, Colors.pink));
        }
        if (permissions.contains(Permission.viewServices)) {
          stats.add(_StatData('Services', '25', Icons.content_cut, Colors.amber));
        }
        break;

      default:
        if (permissions.contains(Permission.viewCustomers)) {
          stats.add(_StatData('Customers', '120', Icons.people, Colors.blue));
        }
        if (permissions.contains(Permission.viewBookings)) {
          stats.add(_StatData('Bookings', '45', Icons.calendar_today, Colors.green));
        }
    }

    if (permissions.contains(Permission.viewInvoices)) {
      stats.add(_StatData('Revenue (MTD)', '\$12,450', Icons.attach_money, Colors.green));
    }
    if (permissions.contains(Permission.viewReports)) {
      stats.add(_StatData('Pending', '5', Icons.pending_actions, Colors.orange));
    }

    return stats.take(4).toList();
  }

  Widget _buildQuickActions(
    BuildContext context,
    BusinessType businessType,
    Set<Permission> permissions,
  ) {
    final actions = _getActionsForBusinessType(businessType, permissions);

    if (actions.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Actions',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: actions.map((action) => _ActionChip(action: action)).toList(),
        ),
      ],
    );
  }

  List<_ActionData> _getActionsForBusinessType(
    BusinessType businessType,
    Set<Permission> permissions,
  ) {
    final actions = <_ActionData>[];

    if (permissions.contains(Permission.createCustomer)) {
      actions.add(_ActionData(
        'Add Customer',
        Icons.person_add,
        '/customers/new',
        Colors.blue,
      ));
    }

    if (permissions.contains(Permission.createBooking)) {
      actions.add(_ActionData(
        'New Booking',
        Icons.add_box,
        '/bookings/new',
        Colors.green,
      ));
    }

    if (permissions.contains(Permission.createInvoice)) {
      actions.add(_ActionData(
        'Create Invoice',
        Icons.receipt_long,
        '/invoices/new',
        Colors.orange,
      ));
    }

    switch (businessType) {
      case BusinessType.clinic:
      case BusinessType.diagnostics:
        if (permissions.contains(Permission.managePatients)) {
          actions.add(_ActionData(
            'Add Patient',
            Icons.medical_information,
            '/patients/new',
            Colors.red,
          ));
        }
        if (permissions.contains(Permission.manageAppointments)) {
          actions.add(_ActionData(
            'Schedule Appointment',
            Icons.event_note,
            '/appointments/new',
            Colors.teal,
          ));
        }
        break;

      case BusinessType.gym:
        if (permissions.contains(Permission.manageMemberships)) {
          actions.add(_ActionData(
            'New Membership',
            Icons.card_membership,
            '/memberships/new',
            Colors.purple,
          ));
        }
        break;

      default:
        break;
    }

    return actions.take(4).toList();
  }

  Widget _buildRecentActivity(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Recent Activity',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _ActivityItem(
                  icon: Icons.person_add,
                  iconColor: Colors.blue,
                  title: 'New customer registered',
                  time: '2 hours ago',
                ),
                const Divider(),
                _ActivityItem(
                  icon: Icons.calendar_today,
                  iconColor: Colors.green,
                  title: 'Booking confirmed',
                  time: '5 hours ago',
                ),
                const Divider(),
                _ActivityItem(
                  icon: Icons.payment,
                  iconColor: Colors.orange,
                  title: 'Payment received',
                  time: '1 day ago',
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomNav(BuildContext context, List<NavigationItem> items) {
    return NavigationBar(
      selectedIndex: _selectedIndex,
      onDestinationSelected: (index) {
        setState(() => _selectedIndex = index);
        context.go(items[index].route);
      },
      destinations: items.map((item) => NavigationDestination(
        icon: Icon(item.icon),
        selectedIcon: Icon(item.activeIcon ?? item.icon),
        label: item.title,
      )).toList(),
    );
  }

  void _handleMenuAction(BuildContext context, String action) {
    switch (action) {
      case 'profile':
        context.go('/profile');
        break;
      case 'switch_tenant':
        context.read<TenantBloc>().add(const TenantCleared());
        context.go('/select-tenant');
        break;
      case 'logout':
        context.read<AuthBloc>().add(const AuthLogoutRequested());
        context.go('/login');
        break;
    }
  }
}

class _StatData {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  _StatData(this.label, this.value, this.icon, this.color);
}

class _StatCard extends StatelessWidget {
  final _StatData stat;

  const _StatCard({required this.stat});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(stat.icon, color: stat.color, size: 24),
            const SizedBox(height: 8),
            Text(
              stat.value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              stat.label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionData {
  final String label;
  final IconData icon;
  final String route;
  final Color color;

  _ActionData(this.label, this.icon, this.route, this.color);
}

class _ActionChip extends StatelessWidget {
  final _ActionData action;

  const _ActionChip({required this.action});

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(action.icon, color: action.color, size: 18),
      label: Text(action.label),
      onPressed: () => context.go(action.route),
    );
  }
}

class _ActivityItem extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String time;

  const _ActivityItem({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          Text(
            time,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }
}
