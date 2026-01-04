import '../../domain/entities/tenant.dart';

class TenantModel extends Tenant {
  const TenantModel({
    required super.id,
    required super.name,
    super.slug,
    super.logo,
    required super.businessType,
    super.subdomain,
    super.customDomain,
    super.settings,
    super.branding,
    super.isActive,
    super.createdAt,
  });

  factory TenantModel.fromJson(Map<String, dynamic> json) {
    return TenantModel(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String?,
      logo: json['logo'] as String?,
      businessType: json['businessType'] as String? ?? 'general',
      subdomain: json['subdomain'] as String?,
      customDomain: json['customDomain'] as String?,
      settings: json['settings'] != null 
          ? TenantSettingsModel.fromJson(json['settings']) 
          : null,
      branding: json['branding'] != null 
          ? TenantBrandingModel.fromJson(json['branding']) 
          : null,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt'] as String) 
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'logo': logo,
      'businessType': businessType,
      'subdomain': subdomain,
      'customDomain': customDomain,
      'isActive': isActive,
      'createdAt': createdAt?.toIso8601String(),
    };
  }
}

class TenantSettingsModel extends TenantSettings {
  const TenantSettingsModel({
    super.timezone,
    super.currency,
    super.dateFormat,
    super.timeFormat,
    super.language,
    super.features,
  });

  factory TenantSettingsModel.fromJson(Map<String, dynamic> json) {
    return TenantSettingsModel(
      timezone: json['timezone'] as String? ?? 'UTC',
      currency: json['currency'] as String? ?? 'USD',
      dateFormat: json['dateFormat'] as String? ?? 'YYYY-MM-DD',
      timeFormat: json['timeFormat'] as String? ?? 'HH:mm',
      language: json['language'] as String? ?? 'en',
      features: (json['features'] as Map<String, dynamic>?)?.cast<String, bool>() ?? {},
    );
  }
}

class TenantBrandingModel extends TenantBranding {
  const TenantBrandingModel({
    super.primaryColor,
    super.secondaryColor,
    super.logo,
    super.favicon,
    super.fontFamily,
  });

  factory TenantBrandingModel.fromJson(Map<String, dynamic> json) {
    return TenantBrandingModel(
      primaryColor: json['primaryColor'] as String?,
      secondaryColor: json['secondaryColor'] as String?,
      logo: json['logo'] as String?,
      favicon: json['favicon'] as String?,
      fontFamily: json['fontFamily'] as String?,
    );
  }
}
