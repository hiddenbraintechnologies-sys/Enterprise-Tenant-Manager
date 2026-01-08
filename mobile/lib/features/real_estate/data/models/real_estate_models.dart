/// Real Estate Module Models
library real_estate_models;

class RealEstateProperty {
  final String id;
  final String tenantId;
  final String title;
  final String propertyType;
  final String transactionType;
  final String? address;
  final String? city;
  final String? state;
  final double price;
  final double? area;
  final String? areaUnit;
  final int? bedrooms;
  final int? bathrooms;
  final String status;
  final List<String>? images;

  RealEstateProperty({
    required this.id,
    required this.tenantId,
    required this.title,
    required this.propertyType,
    required this.transactionType,
    this.address,
    this.city,
    this.state,
    required this.price,
    this.area,
    this.areaUnit,
    this.bedrooms,
    this.bathrooms,
    required this.status,
    this.images,
  });

  factory RealEstateProperty.fromJson(Map<String, dynamic> json) => RealEstateProperty(
    id: json['id'],
    tenantId: json['tenantId'],
    title: json['title'],
    propertyType: json['propertyType'],
    transactionType: json['transactionType'],
    address: json['address'],
    city: json['city'],
    state: json['state'],
    price: (json['price'] ?? 0).toDouble(),
    area: json['area']?.toDouble(),
    areaUnit: json['areaUnit'],
    bedrooms: json['bedrooms'],
    bathrooms: json['bathrooms'],
    status: json['status'] ?? 'available',
    images: json['images'] != null ? List<String>.from(json['images']) : null,
  );
}

class RealEstateLead {
  final String id;
  final String tenantId;
  final String name;
  final String? email;
  final String? phone;
  final String? propertyId;
  final String source;
  final String status;
  final String? notes;
  final String? assignedAgentId;

  RealEstateLead({
    required this.id,
    required this.tenantId,
    required this.name,
    this.email,
    this.phone,
    this.propertyId,
    required this.source,
    required this.status,
    this.notes,
    this.assignedAgentId,
  });

  factory RealEstateLead.fromJson(Map<String, dynamic> json) => RealEstateLead(
    id: json['id'],
    tenantId: json['tenantId'],
    name: json['name'],
    email: json['email'],
    phone: json['phone'],
    propertyId: json['propertyId'],
    source: json['source'] ?? 'direct',
    status: json['status'] ?? 'new',
    notes: json['notes'],
    assignedAgentId: json['assignedAgentId'],
  );
}

class RealEstateDashboardStats {
  final int totalProperties;
  final int availableProperties;
  final int soldProperties;
  final int totalLeads;
  final int newLeads;
  final int pendingVisits;

  RealEstateDashboardStats({
    required this.totalProperties,
    required this.availableProperties,
    required this.soldProperties,
    required this.totalLeads,
    required this.newLeads,
    required this.pendingVisits,
  });

  factory RealEstateDashboardStats.fromJson(Map<String, dynamic> json) => RealEstateDashboardStats(
    totalProperties: json['totalProperties'] ?? 0,
    availableProperties: json['availableProperties'] ?? 0,
    soldProperties: json['soldProperties'] ?? 0,
    totalLeads: json['totalLeads'] ?? 0,
    newLeads: json['newLeads'] ?? 0,
    pendingVisits: json['pendingVisits'] ?? 0,
  );
}
