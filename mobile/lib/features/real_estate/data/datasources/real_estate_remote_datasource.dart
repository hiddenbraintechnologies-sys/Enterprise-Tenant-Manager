import '../../../../core/network/api_client.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/property.dart';
import '../../domain/entities/property_lead.dart';
import '../../domain/entities/property_visit.dart';
import '../../domain/entities/property_owner.dart';

class RealEstateRemoteDataSource {
  final ApiClient _apiClient;
  static const String _basePath = '/api/real-estate';

  RealEstateRemoteDataSource(this._apiClient);

  Future<PaginatedResponse<Property>> getProperties(
    PaginationParams params, {
    PropertyType? type,
    PropertyPurpose? purpose,
    PropertyStatus? status,
    double? minPrice,
    double? maxPrice,
  }) async {
    final queryParams = params.toQueryParameters();
    if (type != null) queryParams['type'] = type.name;
    if (purpose != null) queryParams['purpose'] = purpose.name;
    if (status != null) queryParams['status'] = status.name;
    if (minPrice != null) queryParams['minPrice'] = minPrice.toString();
    if (maxPrice != null) queryParams['maxPrice'] = maxPrice.toString();

    final response = await _apiClient.get(
      '$_basePath/properties',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => Property.fromJson(json),
    );
  }

  Future<Property> getProperty(String id) async {
    final response = await _apiClient.get('$_basePath/properties/$id');
    return Property.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Property> createProperty(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/properties', data: data);
    return Property.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Property> updateProperty(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/properties/$id', data: data);
    return Property.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteProperty(String id) async {
    await _apiClient.delete('$_basePath/properties/$id');
  }

  Future<PaginatedResponse<Property>> searchProperties(
    String query,
    PaginationParams params,
  ) async {
    final queryParams = params.toQueryParameters();
    queryParams['q'] = query;

    final response = await _apiClient.get(
      '$_basePath/properties/search',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => Property.fromJson(json),
    );
  }

  Future<PaginatedResponse<PropertyLead>> getLeads(
    PaginationParams params, {
    LeadStatus? status,
    LeadSource? source,
    String? assignedTo,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null) {
      queryParams['status'] = status == LeadStatus.newLead
          ? 'new'
          : status == LeadStatus.siteVisitScheduled
              ? 'site_visit_scheduled'
              : status.name;
    }
    if (source != null) queryParams['source'] = source.name;
    if (assignedTo != null) queryParams['assignedTo'] = assignedTo;

    final response = await _apiClient.get(
      '$_basePath/leads',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => PropertyLead.fromJson(json),
    );
  }

  Future<PropertyLead> getLead(String id) async {
    final response = await _apiClient.get('$_basePath/leads/$id');
    return PropertyLead.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PropertyLead> createLead(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/leads', data: data);
    return PropertyLead.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PropertyLead> updateLead(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/leads/$id', data: data);
    return PropertyLead.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PropertyLead> convertLead(String id) async {
    final response = await _apiClient.post('$_basePath/leads/$id/convert');
    return PropertyLead.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<PropertyVisit>> getSiteVisits(
    PaginationParams params, {
    VisitStatus? status,
    String? agentId,
    DateTime? fromDate,
    DateTime? toDate,
  }) async {
    final queryParams = params.toQueryParameters();
    if (status != null) {
      queryParams['status'] = status == VisitStatus.noShow ? 'no_show' : status.name;
    }
    if (agentId != null) queryParams['agentId'] = agentId;
    if (fromDate != null) queryParams['fromDate'] = fromDate.toIso8601String();
    if (toDate != null) queryParams['toDate'] = toDate.toIso8601String();

    final response = await _apiClient.get(
      '$_basePath/site-visits',
      queryParameters: queryParams,
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => PropertyVisit.fromJson(json),
    );
  }

  Future<PropertyVisit> getSiteVisit(String id) async {
    final response = await _apiClient.get('$_basePath/site-visits/$id');
    return PropertyVisit.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PropertyVisit> createSiteVisit(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/site-visits', data: data);
    return PropertyVisit.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PropertyVisit> updateSiteVisit(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/site-visits/$id', data: data);
    return PropertyVisit.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PropertyVisit> completeSiteVisit(String id, String? feedback) async {
    final response = await _apiClient.post(
      '$_basePath/site-visits/$id/complete',
      data: {'feedback': feedback},
    );
    return PropertyVisit.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PaginatedResponse<PropertyOwner>> getOwners(PaginationParams params) async {
    final response = await _apiClient.get(
      '$_basePath/owners',
      queryParameters: params.toQueryParameters(),
    );

    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => PropertyOwner.fromJson(json),
    );
  }

  Future<PropertyOwner> getOwner(String id) async {
    final response = await _apiClient.get('$_basePath/owners/$id');
    return PropertyOwner.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PropertyOwner> createOwner(Map<String, dynamic> data) async {
    final response = await _apiClient.post('$_basePath/owners', data: data);
    return PropertyOwner.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PropertyOwner> updateOwner(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('$_basePath/owners/$id', data: data);
    return PropertyOwner.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await _apiClient.get('$_basePath/dashboard/stats');
    return response.data as Map<String, dynamic>;
  }
}
