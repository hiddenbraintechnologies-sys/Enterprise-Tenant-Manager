import 'package:equatable/equatable.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/entities/property.dart';
import '../../domain/entities/property_lead.dart';
import '../../domain/entities/property_visit.dart';
import '../../domain/entities/property_owner.dart';

enum RealEstateStatus { initial, loading, loadingMore, success, failure }

class RealEstateState extends Equatable {
  final RealEstateStatus propertiesStatus;
  final List<Property> properties;
  final PaginationMeta? propertiesPagination;
  final String? propertiesError;
  final Property? selectedProperty;

  final RealEstateStatus leadsStatus;
  final List<PropertyLead> leads;
  final PaginationMeta? leadsPagination;
  final String? leadsError;

  final RealEstateStatus visitsStatus;
  final List<PropertyVisit> visits;
  final PaginationMeta? visitsPagination;
  final String? visitsError;

  final RealEstateStatus ownersStatus;
  final List<PropertyOwner> owners;
  final PaginationMeta? ownersPagination;
  final String? ownersError;

  final RealEstateStatus dashboardStatus;
  final Map<String, dynamic>? dashboardStats;
  final String? dashboardError;

  final RealEstateStatus operationStatus;
  final String? operationError;
  final String? operationSuccessMessage;

  final PaginationParams currentPropertiesParams;
  final PaginationParams currentLeadsParams;
  final PaginationParams currentVisitsParams;
  final PaginationParams currentOwnersParams;

  final PropertyType? propertiesType;
  final PropertyPurpose? propertiesPurpose;
  final PropertyStatus? propertiesStatusFilter;
  final double? propertiesMinPrice;
  final double? propertiesMaxPrice;

  final LeadStatus? leadsStatusFilter;
  final LeadSource? leadsSourceFilter;
  final String? leadsAssignedTo;

  final VisitStatus? visitsStatusFilter;
  final String? visitsAgentId;
  final DateTime? visitsFromDate;
  final DateTime? visitsToDate;

  const RealEstateState({
    this.propertiesStatus = RealEstateStatus.initial,
    this.properties = const [],
    this.propertiesPagination,
    this.propertiesError,
    this.selectedProperty,
    this.leadsStatus = RealEstateStatus.initial,
    this.leads = const [],
    this.leadsPagination,
    this.leadsError,
    this.visitsStatus = RealEstateStatus.initial,
    this.visits = const [],
    this.visitsPagination,
    this.visitsError,
    this.ownersStatus = RealEstateStatus.initial,
    this.owners = const [],
    this.ownersPagination,
    this.ownersError,
    this.dashboardStatus = RealEstateStatus.initial,
    this.dashboardStats,
    this.dashboardError,
    this.operationStatus = RealEstateStatus.initial,
    this.operationError,
    this.operationSuccessMessage,
    PaginationParams? currentPropertiesParams,
    PaginationParams? currentLeadsParams,
    PaginationParams? currentVisitsParams,
    PaginationParams? currentOwnersParams,
    this.propertiesType,
    this.propertiesPurpose,
    this.propertiesStatusFilter,
    this.propertiesMinPrice,
    this.propertiesMaxPrice,
    this.leadsStatusFilter,
    this.leadsSourceFilter,
    this.leadsAssignedTo,
    this.visitsStatusFilter,
    this.visitsAgentId,
    this.visitsFromDate,
    this.visitsToDate,
  })  : currentPropertiesParams = currentPropertiesParams ?? const _DefaultPaginationParams(),
        currentLeadsParams = currentLeadsParams ?? const _DefaultPaginationParams(),
        currentVisitsParams = currentVisitsParams ?? const _DefaultPaginationParams(),
        currentOwnersParams = currentOwnersParams ?? const _DefaultPaginationParams();

  bool get hasMoreProperties => propertiesPagination?.hasNext ?? false;
  bool get hasMoreLeads => leadsPagination?.hasNext ?? false;
  bool get hasMoreVisits => visitsPagination?.hasNext ?? false;
  bool get hasMoreOwners => ownersPagination?.hasNext ?? false;

  bool get isLoading =>
      propertiesStatus == RealEstateStatus.loading ||
      leadsStatus == RealEstateStatus.loading ||
      visitsStatus == RealEstateStatus.loading ||
      ownersStatus == RealEstateStatus.loading ||
      dashboardStatus == RealEstateStatus.loading;

  String? get error =>
      propertiesError ?? leadsError ?? visitsError ?? ownersError ?? dashboardError ?? operationError;

  RealEstateState copyWith({
    RealEstateStatus? propertiesStatus,
    List<Property>? properties,
    PaginationMeta? propertiesPagination,
    String? propertiesError,
    Property? selectedProperty,
    RealEstateStatus? leadsStatus,
    List<PropertyLead>? leads,
    PaginationMeta? leadsPagination,
    String? leadsError,
    RealEstateStatus? visitsStatus,
    List<PropertyVisit>? visits,
    PaginationMeta? visitsPagination,
    String? visitsError,
    RealEstateStatus? ownersStatus,
    List<PropertyOwner>? owners,
    PaginationMeta? ownersPagination,
    String? ownersError,
    RealEstateStatus? dashboardStatus,
    Map<String, dynamic>? dashboardStats,
    String? dashboardError,
    RealEstateStatus? operationStatus,
    String? operationError,
    String? operationSuccessMessage,
    PaginationParams? currentPropertiesParams,
    PaginationParams? currentLeadsParams,
    PaginationParams? currentVisitsParams,
    PaginationParams? currentOwnersParams,
    PropertyType? propertiesType,
    PropertyPurpose? propertiesPurpose,
    PropertyStatus? propertiesStatusFilter,
    double? propertiesMinPrice,
    double? propertiesMaxPrice,
    LeadStatus? leadsStatusFilter,
    LeadSource? leadsSourceFilter,
    String? leadsAssignedTo,
    VisitStatus? visitsStatusFilter,
    String? visitsAgentId,
    DateTime? visitsFromDate,
    DateTime? visitsToDate,
  }) {
    return RealEstateState(
      propertiesStatus: propertiesStatus ?? this.propertiesStatus,
      properties: properties ?? this.properties,
      propertiesPagination: propertiesPagination ?? this.propertiesPagination,
      propertiesError: propertiesError,
      selectedProperty: selectedProperty ?? this.selectedProperty,
      leadsStatus: leadsStatus ?? this.leadsStatus,
      leads: leads ?? this.leads,
      leadsPagination: leadsPagination ?? this.leadsPagination,
      leadsError: leadsError,
      visitsStatus: visitsStatus ?? this.visitsStatus,
      visits: visits ?? this.visits,
      visitsPagination: visitsPagination ?? this.visitsPagination,
      visitsError: visitsError,
      ownersStatus: ownersStatus ?? this.ownersStatus,
      owners: owners ?? this.owners,
      ownersPagination: ownersPagination ?? this.ownersPagination,
      ownersError: ownersError,
      dashboardStatus: dashboardStatus ?? this.dashboardStatus,
      dashboardStats: dashboardStats ?? this.dashboardStats,
      dashboardError: dashboardError,
      operationStatus: operationStatus ?? this.operationStatus,
      operationError: operationError,
      operationSuccessMessage: operationSuccessMessage,
      currentPropertiesParams: currentPropertiesParams ?? this.currentPropertiesParams,
      currentLeadsParams: currentLeadsParams ?? this.currentLeadsParams,
      currentVisitsParams: currentVisitsParams ?? this.currentVisitsParams,
      currentOwnersParams: currentOwnersParams ?? this.currentOwnersParams,
      propertiesType: propertiesType ?? this.propertiesType,
      propertiesPurpose: propertiesPurpose ?? this.propertiesPurpose,
      propertiesStatusFilter: propertiesStatusFilter ?? this.propertiesStatusFilter,
      propertiesMinPrice: propertiesMinPrice ?? this.propertiesMinPrice,
      propertiesMaxPrice: propertiesMaxPrice ?? this.propertiesMaxPrice,
      leadsStatusFilter: leadsStatusFilter ?? this.leadsStatusFilter,
      leadsSourceFilter: leadsSourceFilter ?? this.leadsSourceFilter,
      leadsAssignedTo: leadsAssignedTo ?? this.leadsAssignedTo,
      visitsStatusFilter: visitsStatusFilter ?? this.visitsStatusFilter,
      visitsAgentId: visitsAgentId ?? this.visitsAgentId,
      visitsFromDate: visitsFromDate ?? this.visitsFromDate,
      visitsToDate: visitsToDate ?? this.visitsToDate,
    );
  }

  @override
  List<Object?> get props => [
        propertiesStatus,
        properties,
        propertiesPagination,
        propertiesError,
        selectedProperty,
        leadsStatus,
        leads,
        leadsPagination,
        leadsError,
        visitsStatus,
        visits,
        visitsPagination,
        visitsError,
        ownersStatus,
        owners,
        ownersPagination,
        ownersError,
        dashboardStatus,
        dashboardStats,
        dashboardError,
        operationStatus,
        operationError,
        operationSuccessMessage,
        currentPropertiesParams,
        currentLeadsParams,
        currentVisitsParams,
        currentOwnersParams,
        propertiesType,
        propertiesPurpose,
        propertiesStatusFilter,
        propertiesMinPrice,
        propertiesMaxPrice,
        leadsStatusFilter,
        leadsSourceFilter,
        leadsAssignedTo,
        visitsStatusFilter,
        visitsAgentId,
        visitsFromDate,
        visitsToDate,
      ];
}

class _DefaultPaginationParams implements PaginationParams {
  const _DefaultPaginationParams();

  @override
  int get page => 1;
  @override
  int get limit => 20;
  @override
  String? get search => null;
  @override
  String? get status => null;
  @override
  String? get sortBy => null;
  @override
  String get sortOrder => 'desc';
  @override
  Map<String, String>? get additionalFilters => null;

  @override
  Map<String, dynamic> toQueryParameters() => {'page': '1', 'limit': '20'};

  @override
  PaginationParams copyWith({
    int? page,
    int? limit,
    String? search,
    String? status,
    String? sortBy,
    String? sortOrder,
    Map<String, String>? additionalFilters,
  }) {
    return PaginationParams(
      page: page ?? this.page,
      limit: limit ?? this.limit,
      search: search ?? this.search,
      status: status ?? this.status,
      sortBy: sortBy ?? this.sortBy,
      sortOrder: sortOrder ?? this.sortOrder,
      additionalFilters: additionalFilters ?? this.additionalFilters,
    );
  }
}
