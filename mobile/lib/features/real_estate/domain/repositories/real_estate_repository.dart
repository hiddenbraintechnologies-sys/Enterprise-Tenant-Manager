import '../../../../core/network/pagination.dart';
import '../entities/property.dart';
import '../entities/property_lead.dart';
import '../entities/property_visit.dart';
import '../entities/property_owner.dart';

abstract class RealEstateRepository {
  Future<PaginatedResponse<Property>> getProperties(
    PaginationParams params, {
    PropertyType? type,
    PropertyPurpose? purpose,
    PropertyStatus? status,
    double? minPrice,
    double? maxPrice,
  });

  Future<Property> getProperty(String id);

  Future<Property> createProperty(Map<String, dynamic> data);

  Future<Property> updateProperty(String id, Map<String, dynamic> data);

  Future<void> deleteProperty(String id);

  Future<PaginatedResponse<Property>> searchProperties(
    String query,
    PaginationParams params,
  );

  Future<PaginatedResponse<PropertyLead>> getLeads(
    PaginationParams params, {
    LeadStatus? status,
    LeadSource? source,
    String? assignedTo,
  });

  Future<PropertyLead> getLead(String id);

  Future<PropertyLead> createLead(Map<String, dynamic> data);

  Future<PropertyLead> updateLead(String id, Map<String, dynamic> data);

  Future<PropertyLead> convertLead(String id);

  Future<PaginatedResponse<PropertyVisit>> getSiteVisits(
    PaginationParams params, {
    VisitStatus? status,
    String? agentId,
    DateTime? fromDate,
    DateTime? toDate,
  });

  Future<PropertyVisit> getSiteVisit(String id);

  Future<PropertyVisit> createSiteVisit(Map<String, dynamic> data);

  Future<PropertyVisit> updateSiteVisit(String id, Map<String, dynamic> data);

  Future<PropertyVisit> completeSiteVisit(String id, String? feedback);

  Future<PaginatedResponse<PropertyOwner>> getOwners(PaginationParams params);

  Future<PropertyOwner> getOwner(String id);

  Future<PropertyOwner> createOwner(Map<String, dynamic> data);

  Future<PropertyOwner> updateOwner(String id, Map<String, dynamic> data);

  Future<Map<String, dynamic>> getDashboardStats();
}
