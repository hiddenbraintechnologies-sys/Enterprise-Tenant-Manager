import 'package:equatable/equatable.dart';

class Tenant extends Equatable {
  final String id;
  final String name;
  final String? slug;
  final String? logo;
  final String businessType;
  final String? subdomain;
  final String? customDomain;
  final TenantSettings? settings;
  final TenantBranding? branding;
  final bool isActive;
  final DateTime? createdAt;

  const Tenant({
    required this.id,
    required this.name,
    this.slug,
    this.logo,
    required this.businessType,
    this.subdomain,
    this.customDomain,
    this.settings,
    this.branding,
    this.isActive = true,
    this.createdAt,
  });

  @override
  List<Object?> get props => [id, name, slug, businessType, isActive];
}

class TenantSettings extends Equatable {
  final String timezone;
  final String currency;
  final String dateFormat;
  final String timeFormat;
  final String language;
  final Map<String, bool> features;

  const TenantSettings({
    this.timezone = 'UTC',
    this.currency = 'USD',
    this.dateFormat = 'YYYY-MM-DD',
    this.timeFormat = 'HH:mm',
    this.language = 'en',
    this.features = const {},
  });

  @override
  List<Object?> get props => [timezone, currency, dateFormat, timeFormat, language, features];
}

class TenantBranding extends Equatable {
  final String? primaryColor;
  final String? secondaryColor;
  final String? logo;
  final String? favicon;
  final String? fontFamily;

  const TenantBranding({
    this.primaryColor,
    this.secondaryColor,
    this.logo,
    this.favicon,
    this.fontFamily,
  });

  @override
  List<Object?> get props => [primaryColor, secondaryColor, logo, favicon, fontFamily];
}
