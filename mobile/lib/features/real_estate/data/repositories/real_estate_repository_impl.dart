import '../../../../core/network/pagination.dart';
import '../../domain/entities/property.dart';
import '../../domain/entities/property_lead.dart';
import '../../domain/entities/property_visit.dart';
import '../../domain/entities/property_owner.dart';
import '../../domain/repositories/real_estate_repository.dart';
import '../datasources/real_estate_remote_datasource.dart';

class RealEstateRepositoryImpl implements RealEstateRepository {
  final RealEstateRemoteDataSource _remoteDataSource;

  RealEstateRepositoryImpl(this._remoteDataSource);

  @override
  Future<PaginatedResponse<Property>> getProperties(
    PaginationParams params, {
    PropertyType? type,
    PropertyPurpose? purpose,
    PropertyStatus? status,
    double? minPrice,
    double? maxPrice,
  }) {
    return _remoteDataSource.getProperties(
      params,
      type: type,
      purpose: purpose,
      status: status,
      minPrice: minPrice,
      maxPrice: maxPrice,
    );
  }

  @override
  Future<Property> getProperty(String id) {
    return _remoteDataSource.getProperty(id);
  }

  @override
  Future<Property> createProperty(Map<String, dynamic> data) {
    return _remoteDataSource.createProperty(data);
  }

  @override
  Future<Property> updateProperty(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateProperty(id, data);
  }

  @override
  Future<void> deleteProperty(String id) {
    return _remoteDataSource.deleteProperty(id);
  }

  @override
  Future<PaginatedResponse<Property>> searchProperties(
    String query,
    PaginationParams params,
  ) {
    return _remoteDataSource.searchProperties(query, params);
  }

  @override
  Future<PaginatedResponse<PropertyLead>> getLeads(
    PaginationParams params, {
    LeadStatus? status,
    LeadSource? source,
    String? assignedTo,
  }) {
    return _remoteDataSource.getLeads(
      params,
      status: status,
      source: source,
      assignedTo: assignedTo,
    );
  }

  @override
  Future<PropertyLead> getLead(String id) {
    return _remoteDataSource.getLead(id);
  }

  @override
  Future<PropertyLead> createLead(Map<String, dynamic> data) {
    return _remoteDataSource.createLead(data);
  }

  @override
  Future<PropertyLead> updateLead(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateLead(id, data);
  }

  @override
  Future<PropertyLead> convertLead(String id) {
    return _remoteDataSource.convertLead(id);
  }

  @override
  Future<PaginatedResponse<PropertyVisit>> getSiteVisits(
    PaginationParams params, {
    VisitStatus? status,
    String? agentId,
    DateTime? fromDate,
    DateTime? toDate,
  }) {
    return _remoteDataSource.getSiteVisits(
      params,
      status: status,
      agentId: agentId,
      fromDate: fromDate,
      toDate: toDate,
    );
  }

  @override
  Future<PropertyVisit> getSiteVisit(String id) {
    return _remoteDataSource.getSiteVisit(id);
  }

  @override
  Future<PropertyVisit> createSiteVisit(Map<String, dynamic> data) {
    return _remoteDataSource.createSiteVisit(data);
  }

  @override
  Future<PropertyVisit> updateSiteVisit(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateSiteVisit(id, data);
  }

  @override
  Future<PropertyVisit> completeSiteVisit(String id, String? feedback) {
    return _remoteDataSource.completeSiteVisit(id, feedback);
  }

  @override
  Future<PaginatedResponse<PropertyOwner>> getOwners(PaginationParams params) {
    return _remoteDataSource.getOwners(params);
  }

  @override
  Future<PropertyOwner> getOwner(String id) {
    return _remoteDataSource.getOwner(id);
  }

  @override
  Future<PropertyOwner> createOwner(Map<String, dynamic> data) {
    return _remoteDataSource.createOwner(data);
  }

  @override
  Future<PropertyOwner> updateOwner(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateOwner(id, data);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() {
    return _remoteDataSource.getDashboardStats();
  }
}
