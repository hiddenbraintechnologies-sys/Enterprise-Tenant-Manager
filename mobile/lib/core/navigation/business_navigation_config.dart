import 'package:flutter/material.dart';

import '../../domain/entities/business_type.dart';
import '../../domain/entities/permission.dart';
import 'navigation_item.dart';

class BusinessNavigationConfig {
  static List<NavigationItem> getNavigationItems(BusinessType businessType) {
    final baseItems = _getBaseItems();
    final businessSpecificItems = _getBusinessSpecificItems(businessType);
    
    final allItems = [...baseItems, ...businessSpecificItems];
    allItems.sort((a, b) => a.order.compareTo(b.order));
    
    return allItems
        .where((item) => item.isVisibleForBusinessType(businessType))
        .toList();
  }

  static List<NavigationItem> _getBaseItems() {
    return const [
      NavigationItem(
        id: 'dashboard',
        title: 'Dashboard',
        icon: Icons.dashboard_outlined,
        activeIcon: Icons.dashboard,
        route: '/dashboard',
        requiredPermissions: [Permission.viewDashboard],
        order: 0,
        showInBottomNav: true,
      ),
      NavigationItem(
        id: 'customers',
        title: 'Customers',
        icon: Icons.people_outline,
        activeIcon: Icons.people,
        route: '/customers',
        requiredPermissions: [Permission.viewCustomers],
        order: 10,
        showInBottomNav: true,
      ),
      NavigationItem(
        id: 'bookings',
        title: 'Bookings',
        icon: Icons.calendar_today_outlined,
        activeIcon: Icons.calendar_today,
        route: '/bookings',
        requiredPermissions: [Permission.viewBookings],
        order: 20,
        showInBottomNav: true,
      ),
      NavigationItem(
        id: 'invoices',
        title: 'Invoices',
        icon: Icons.receipt_long_outlined,
        activeIcon: Icons.receipt_long,
        route: '/invoices',
        requiredPermissions: [Permission.viewInvoices],
        order: 30,
      ),
      NavigationItem(
        id: 'reports',
        title: 'Reports',
        icon: Icons.bar_chart_outlined,
        activeIcon: Icons.bar_chart,
        route: '/reports',
        requiredPermissions: [Permission.viewReports],
        order: 80,
      ),
      NavigationItem(
        id: 'settings',
        title: 'Settings',
        icon: Icons.settings_outlined,
        activeIcon: Icons.settings,
        route: '/settings',
        requiredPermissions: [Permission.viewSettings],
        order: 100,
        showInBottomNav: true,
      ),
    ];
  }

  static List<NavigationItem> _getBusinessSpecificItems(BusinessType businessType) {
    switch (businessType) {
      case BusinessType.pgHostel:
        return const [
          NavigationItem(
            id: 'rooms',
            title: 'Rooms',
            icon: Icons.bed_outlined,
            activeIcon: Icons.bed,
            route: '/rooms',
            requiredPermissions: [Permission.viewRooms],
            allowedBusinessTypes: [BusinessType.pgHostel],
            order: 25,
          ),
          NavigationItem(
            id: 'tenants',
            title: 'Tenants',
            icon: Icons.person_outline,
            activeIcon: Icons.person,
            route: '/tenants',
            requiredPermissions: [Permission.viewCustomers],
            allowedBusinessTypes: [BusinessType.pgHostel],
            order: 15,
          ),
        ];

      case BusinessType.salon:
        return const [
          NavigationItem(
            id: 'services',
            title: 'Services',
            icon: Icons.content_cut_outlined,
            activeIcon: Icons.content_cut,
            route: '/services',
            requiredPermissions: [Permission.viewServices],
            allowedBusinessTypes: [BusinessType.salon],
            order: 25,
          ),
          NavigationItem(
            id: 'stylists',
            title: 'Stylists',
            icon: Icons.face_outlined,
            activeIcon: Icons.face,
            route: '/staff',
            requiredPermissions: [Permission.viewStaff],
            allowedBusinessTypes: [BusinessType.salon],
            order: 35,
          ),
        ];

      case BusinessType.gym:
        return const [
          NavigationItem(
            id: 'memberships',
            title: 'Memberships',
            icon: Icons.card_membership_outlined,
            activeIcon: Icons.card_membership,
            route: '/memberships',
            requiredPermissions: [Permission.viewMemberships],
            allowedBusinessTypes: [BusinessType.gym],
            order: 25,
          ),
          NavigationItem(
            id: 'classes',
            title: 'Classes',
            icon: Icons.fitness_center_outlined,
            activeIcon: Icons.fitness_center,
            route: '/classes',
            requiredPermissions: [Permission.viewServices],
            allowedBusinessTypes: [BusinessType.gym],
            order: 35,
          ),
          NavigationItem(
            id: 'trainers',
            title: 'Trainers',
            icon: Icons.sports_outlined,
            activeIcon: Icons.sports,
            route: '/staff',
            requiredPermissions: [Permission.viewStaff],
            allowedBusinessTypes: [BusinessType.gym],
            order: 40,
          ),
        ];

      case BusinessType.coachingInstitute:
        return const [
          NavigationItem(
            id: 'students',
            title: 'Students',
            icon: Icons.school_outlined,
            activeIcon: Icons.school,
            route: '/students',
            requiredPermissions: [Permission.viewCustomers],
            allowedBusinessTypes: [BusinessType.coachingInstitute],
            order: 15,
          ),
          NavigationItem(
            id: 'courses',
            title: 'Courses',
            icon: Icons.menu_book_outlined,
            activeIcon: Icons.menu_book,
            route: '/courses',
            requiredPermissions: [Permission.viewServices],
            allowedBusinessTypes: [BusinessType.coachingInstitute],
            order: 25,
          ),
          NavigationItem(
            id: 'batches',
            title: 'Batches',
            icon: Icons.groups_outlined,
            activeIcon: Icons.groups,
            route: '/batches',
            requiredPermissions: [Permission.viewServices],
            allowedBusinessTypes: [BusinessType.coachingInstitute],
            order: 35,
          ),
        ];

      case BusinessType.clinic:
      case BusinessType.diagnostics:
        return const [
          NavigationItem(
            id: 'patients',
            title: 'Patients',
            icon: Icons.medical_information_outlined,
            activeIcon: Icons.medical_information,
            route: '/patients',
            requiredPermissions: [Permission.viewPatients],
            allowedBusinessTypes: [BusinessType.clinic, BusinessType.diagnostics],
            order: 15,
          ),
          NavigationItem(
            id: 'appointments',
            title: 'Appointments',
            icon: Icons.event_note_outlined,
            activeIcon: Icons.event_note,
            route: '/appointments',
            requiredPermissions: [Permission.viewAppointments],
            allowedBusinessTypes: [BusinessType.clinic, BusinessType.diagnostics],
            order: 25,
          ),
          NavigationItem(
            id: 'doctors',
            title: 'Doctors',
            icon: Icons.local_hospital_outlined,
            activeIcon: Icons.local_hospital,
            route: '/doctors',
            requiredPermissions: [Permission.viewStaff],
            allowedBusinessTypes: [BusinessType.clinic, BusinessType.diagnostics],
            order: 35,
          ),
        ];

      case BusinessType.restaurant:
        return const [
          NavigationItem(
            id: 'menu',
            title: 'Menu',
            icon: Icons.restaurant_menu_outlined,
            activeIcon: Icons.restaurant_menu,
            route: '/menu',
            requiredPermissions: [Permission.viewServices],
            allowedBusinessTypes: [BusinessType.restaurant],
            order: 25,
          ),
          NavigationItem(
            id: 'orders',
            title: 'Orders',
            icon: Icons.receipt_outlined,
            activeIcon: Icons.receipt,
            route: '/orders',
            requiredPermissions: [Permission.viewBookings],
            allowedBusinessTypes: [BusinessType.restaurant],
            order: 20,
          ),
          NavigationItem(
            id: 'tables',
            title: 'Tables',
            icon: Icons.table_restaurant_outlined,
            activeIcon: Icons.table_restaurant,
            route: '/tables',
            requiredPermissions: [Permission.viewRooms],
            allowedBusinessTypes: [BusinessType.restaurant],
            order: 35,
          ),
        ];

      case BusinessType.retail:
        return const [
          NavigationItem(
            id: 'inventory',
            title: 'Inventory',
            icon: Icons.inventory_2_outlined,
            activeIcon: Icons.inventory_2,
            route: '/inventory',
            requiredPermissions: [Permission.viewInventory],
            allowedBusinessTypes: [BusinessType.retail],
            order: 25,
          ),
          NavigationItem(
            id: 'pos',
            title: 'POS',
            icon: Icons.point_of_sale_outlined,
            activeIcon: Icons.point_of_sale,
            route: '/pos',
            requiredPermissions: [Permission.createInvoice],
            allowedBusinessTypes: [BusinessType.retail],
            order: 15,
          ),
        ];

      case BusinessType.general:
      default:
        return const [
          NavigationItem(
            id: 'services',
            title: 'Services',
            icon: Icons.miscellaneous_services_outlined,
            activeIcon: Icons.miscellaneous_services,
            route: '/services',
            requiredPermissions: [Permission.viewServices],
            order: 25,
          ),
        ];
    }
  }

  static List<NavigationItem> getBottomNavItems(
    BusinessType businessType,
    Set<Permission> userPermissions,
  ) {
    return getNavigationItems(businessType)
        .where((item) => item.showInBottomNav)
        .where((item) => _hasRequiredPermissions(item, userPermissions))
        .take(5)
        .toList();
  }

  static List<NavigationItem> getDrawerItems(
    BusinessType businessType,
    Set<Permission> userPermissions,
  ) {
    return getNavigationItems(businessType)
        .where((item) => item.showInDrawer)
        .where((item) => _hasRequiredPermissions(item, userPermissions))
        .toList();
  }

  static bool _hasRequiredPermissions(
    NavigationItem item,
    Set<Permission> userPermissions,
  ) {
    if (item.requiredPermissions.isEmpty) return true;
    return item.requiredPermissions.any((p) => userPermissions.contains(p));
  }
}
