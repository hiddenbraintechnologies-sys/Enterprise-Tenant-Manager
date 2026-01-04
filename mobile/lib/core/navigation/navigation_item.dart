import 'package:flutter/material.dart';

import '../../domain/entities/permission.dart';
import '../../domain/entities/business_type.dart';

class NavigationItem {
  final String id;
  final String title;
  final IconData icon;
  final IconData? activeIcon;
  final String route;
  final List<Permission> requiredPermissions;
  final List<BusinessType>? allowedBusinessTypes;
  final List<BusinessType>? excludedBusinessTypes;
  final int order;
  final bool showInBottomNav;
  final bool showInDrawer;
  final List<NavigationItem>? children;

  const NavigationItem({
    required this.id,
    required this.title,
    required this.icon,
    this.activeIcon,
    required this.route,
    this.requiredPermissions = const [],
    this.allowedBusinessTypes,
    this.excludedBusinessTypes,
    this.order = 0,
    this.showInBottomNav = false,
    this.showInDrawer = true,
    this.children,
  });

  bool isVisibleForBusinessType(BusinessType businessType) {
    if (allowedBusinessTypes != null && allowedBusinessTypes!.isNotEmpty) {
      return allowedBusinessTypes!.contains(businessType);
    }
    if (excludedBusinessTypes != null && excludedBusinessTypes!.isNotEmpty) {
      return !excludedBusinessTypes!.contains(businessType);
    }
    return true;
  }
}
