import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/network/pagination.dart';
import '../../domain/repositories/real_estate_repository.dart';
import 'real_estate_event.dart';
import 'real_estate_state.dart';

class RealEstateBloc extends Bloc<RealEstateEvent, RealEstateState> {
  final RealEstateRepository _repository;

  RealEstateBloc(this._repository) : super(const RealEstateState()) {
    on<LoadProperties>(_onLoadProperties);
    on<LoadMoreProperties>(_onLoadMoreProperties);
    on<LoadProperty>(_onLoadProperty);
    on<CreateProperty>(_onCreateProperty);
    on<UpdateProperty>(_onUpdateProperty);
    on<DeleteProperty>(_onDeleteProperty);
    on<LoadLeads>(_onLoadLeads);
    on<LoadMoreLeads>(_onLoadMoreLeads);
    on<CreateLead>(_onCreateLead);
    on<UpdateLead>(_onUpdateLead);
    on<ConvertLead>(_onConvertLead);
    on<LoadSiteVisits>(_onLoadSiteVisits);
    on<LoadMoreSiteVisits>(_onLoadMoreSiteVisits);
    on<ScheduleVisit>(_onScheduleVisit);
    on<UpdateSiteVisit>(_onUpdateSiteVisit);
    on<CompleteSiteVisit>(_onCompleteSiteVisit);
    on<LoadOwners>(_onLoadOwners);
    on<LoadMoreOwners>(_onLoadMoreOwners);
    on<CreateOwner>(_onCreateOwner);
    on<UpdateOwner>(_onUpdateOwner);
    on<LoadDashboardStats>(_onLoadDashboardStats);
    on<ClearFilters>(_onClearFilters);
    on<RefreshData>(_onRefreshData);
  }

  Future<void> _onLoadProperties(
    LoadProperties event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(propertiesStatus: RealEstateStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getProperties(
        params,
        type: event.type,
        purpose: event.purpose,
        status: event.status,
        minPrice: event.minPrice,
        maxPrice: event.maxPrice,
      );

      emit(state.copyWith(
        propertiesStatus: RealEstateStatus.success,
        properties: response.data,
        propertiesPagination: response.pagination,
        currentPropertiesParams: params,
        propertiesType: event.type,
        propertiesPurpose: event.purpose,
        propertiesStatusFilter: event.status,
        propertiesMinPrice: event.minPrice,
        propertiesMaxPrice: event.maxPrice,
        propertiesError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        propertiesStatus: RealEstateStatus.failure,
        propertiesError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreProperties(
    LoadMoreProperties event,
    Emitter<RealEstateState> emit,
  ) async {
    if (!state.hasMoreProperties || state.propertiesStatus == RealEstateStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(propertiesStatus: RealEstateStatus.loadingMore));

    try {
      final nextPage = (state.propertiesPagination?.page ?? 0) + 1;
      final params = state.currentPropertiesParams.copyWith(page: nextPage);

      final response = await _repository.getProperties(
        params,
        type: state.propertiesType,
        purpose: state.propertiesPurpose,
        status: state.propertiesStatusFilter,
        minPrice: state.propertiesMinPrice,
        maxPrice: state.propertiesMaxPrice,
      );

      emit(state.copyWith(
        propertiesStatus: RealEstateStatus.success,
        properties: [...state.properties, ...response.data],
        propertiesPagination: response.pagination,
        currentPropertiesParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        propertiesStatus: RealEstateStatus.failure,
        propertiesError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadProperty(
    LoadProperty event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final property = await _repository.getProperty(event.id);
      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        selectedProperty: property,
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateProperty(
    CreateProperty event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final property = await _repository.createProperty(event.data);
      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        properties: [property, ...state.properties],
        operationSuccessMessage: 'Property created successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateProperty(
    UpdateProperty event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final property = await _repository.updateProperty(event.id, event.data);
      final updatedProperties = state.properties.map((p) {
        return p.id == event.id ? property : p;
      }).toList();

      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        properties: updatedProperties,
        selectedProperty: property,
        operationSuccessMessage: 'Property updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onDeleteProperty(
    DeleteProperty event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      await _repository.deleteProperty(event.id);
      final updatedProperties = state.properties.where((p) => p.id != event.id).toList();

      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        properties: updatedProperties,
        operationSuccessMessage: 'Property deleted successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadLeads(
    LoadLeads event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(leadsStatus: RealEstateStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getLeads(
        params,
        status: event.status,
        source: event.source,
        assignedTo: event.assignedTo,
      );

      emit(state.copyWith(
        leadsStatus: RealEstateStatus.success,
        leads: response.data,
        leadsPagination: response.pagination,
        currentLeadsParams: params,
        leadsStatusFilter: event.status,
        leadsSourceFilter: event.source,
        leadsAssignedTo: event.assignedTo,
        leadsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        leadsStatus: RealEstateStatus.failure,
        leadsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreLeads(
    LoadMoreLeads event,
    Emitter<RealEstateState> emit,
  ) async {
    if (!state.hasMoreLeads || state.leadsStatus == RealEstateStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(leadsStatus: RealEstateStatus.loadingMore));

    try {
      final nextPage = (state.leadsPagination?.page ?? 0) + 1;
      final params = state.currentLeadsParams.copyWith(page: nextPage);

      final response = await _repository.getLeads(
        params,
        status: state.leadsStatusFilter,
        source: state.leadsSourceFilter,
        assignedTo: state.leadsAssignedTo,
      );

      emit(state.copyWith(
        leadsStatus: RealEstateStatus.success,
        leads: [...state.leads, ...response.data],
        leadsPagination: response.pagination,
        currentLeadsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        leadsStatus: RealEstateStatus.failure,
        leadsError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateLead(
    CreateLead event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final lead = await _repository.createLead(event.data);
      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        leads: [lead, ...state.leads],
        operationSuccessMessage: 'Lead created successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateLead(
    UpdateLead event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final lead = await _repository.updateLead(event.id, event.data);
      final updatedLeads = state.leads.map((l) {
        return l.id == event.id ? lead : l;
      }).toList();

      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        leads: updatedLeads,
        operationSuccessMessage: 'Lead updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onConvertLead(
    ConvertLead event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final lead = await _repository.convertLead(event.id);
      final updatedLeads = state.leads.map((l) {
        return l.id == event.id ? lead : l;
      }).toList();

      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        leads: updatedLeads,
        operationSuccessMessage: 'Lead converted successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadSiteVisits(
    LoadSiteVisits event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(visitsStatus: RealEstateStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getSiteVisits(
        params,
        status: event.status,
        agentId: event.agentId,
        fromDate: event.fromDate,
        toDate: event.toDate,
      );

      emit(state.copyWith(
        visitsStatus: RealEstateStatus.success,
        visits: response.data,
        visitsPagination: response.pagination,
        currentVisitsParams: params,
        visitsStatusFilter: event.status,
        visitsAgentId: event.agentId,
        visitsFromDate: event.fromDate,
        visitsToDate: event.toDate,
        visitsError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        visitsStatus: RealEstateStatus.failure,
        visitsError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreSiteVisits(
    LoadMoreSiteVisits event,
    Emitter<RealEstateState> emit,
  ) async {
    if (!state.hasMoreVisits || state.visitsStatus == RealEstateStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(visitsStatus: RealEstateStatus.loadingMore));

    try {
      final nextPage = (state.visitsPagination?.page ?? 0) + 1;
      final params = state.currentVisitsParams.copyWith(page: nextPage);

      final response = await _repository.getSiteVisits(
        params,
        status: state.visitsStatusFilter,
        agentId: state.visitsAgentId,
        fromDate: state.visitsFromDate,
        toDate: state.visitsToDate,
      );

      emit(state.copyWith(
        visitsStatus: RealEstateStatus.success,
        visits: [...state.visits, ...response.data],
        visitsPagination: response.pagination,
        currentVisitsParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        visitsStatus: RealEstateStatus.failure,
        visitsError: e.toString(),
      ));
    }
  }

  Future<void> _onScheduleVisit(
    ScheduleVisit event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final visit = await _repository.createSiteVisit(event.data);
      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        visits: [visit, ...state.visits],
        operationSuccessMessage: 'Site visit scheduled successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateSiteVisit(
    UpdateSiteVisit event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final visit = await _repository.updateSiteVisit(event.id, event.data);
      final updatedVisits = state.visits.map((v) {
        return v.id == event.id ? visit : v;
      }).toList();

      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        visits: updatedVisits,
        operationSuccessMessage: 'Site visit updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onCompleteSiteVisit(
    CompleteSiteVisit event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final visit = await _repository.completeSiteVisit(event.id, event.feedback);
      final updatedVisits = state.visits.map((v) {
        return v.id == event.id ? visit : v;
      }).toList();

      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        visits: updatedVisits,
        operationSuccessMessage: 'Site visit completed successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadOwners(
    LoadOwners event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(ownersStatus: RealEstateStatus.loading));

    try {
      final params = PaginationParams(
        page: event.page,
        limit: event.limit,
        search: event.search,
        sortBy: event.sortBy,
        sortOrder: event.sortOrder,
      );

      final response = await _repository.getOwners(params);

      emit(state.copyWith(
        ownersStatus: RealEstateStatus.success,
        owners: response.data,
        ownersPagination: response.pagination,
        currentOwnersParams: params,
        ownersError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        ownersStatus: RealEstateStatus.failure,
        ownersError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadMoreOwners(
    LoadMoreOwners event,
    Emitter<RealEstateState> emit,
  ) async {
    if (!state.hasMoreOwners || state.ownersStatus == RealEstateStatus.loadingMore) {
      return;
    }

    emit(state.copyWith(ownersStatus: RealEstateStatus.loadingMore));

    try {
      final nextPage = (state.ownersPagination?.page ?? 0) + 1;
      final params = state.currentOwnersParams.copyWith(page: nextPage);

      final response = await _repository.getOwners(params);

      emit(state.copyWith(
        ownersStatus: RealEstateStatus.success,
        owners: [...state.owners, ...response.data],
        ownersPagination: response.pagination,
        currentOwnersParams: params,
      ));
    } catch (e) {
      emit(state.copyWith(
        ownersStatus: RealEstateStatus.failure,
        ownersError: e.toString(),
      ));
    }
  }

  Future<void> _onCreateOwner(
    CreateOwner event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final owner = await _repository.createOwner(event.data);
      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        owners: [owner, ...state.owners],
        operationSuccessMessage: 'Owner created successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onUpdateOwner(
    UpdateOwner event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(operationStatus: RealEstateStatus.loading));

    try {
      final owner = await _repository.updateOwner(event.id, event.data);
      final updatedOwners = state.owners.map((o) {
        return o.id == event.id ? owner : o;
      }).toList();

      emit(state.copyWith(
        operationStatus: RealEstateStatus.success,
        owners: updatedOwners,
        operationSuccessMessage: 'Owner updated successfully',
      ));
    } catch (e) {
      emit(state.copyWith(
        operationStatus: RealEstateStatus.failure,
        operationError: e.toString(),
      ));
    }
  }

  Future<void> _onLoadDashboardStats(
    LoadDashboardStats event,
    Emitter<RealEstateState> emit,
  ) async {
    emit(state.copyWith(dashboardStatus: RealEstateStatus.loading));

    try {
      final stats = await _repository.getDashboardStats();

      emit(state.copyWith(
        dashboardStatus: RealEstateStatus.success,
        dashboardStats: stats,
        dashboardError: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        dashboardStatus: RealEstateStatus.failure,
        dashboardError: e.toString(),
      ));
    }
  }

  void _onClearFilters(
    ClearFilters event,
    Emitter<RealEstateState> emit,
  ) {
    emit(RealEstateState(
      propertiesStatus: state.propertiesStatus,
      properties: state.properties,
      propertiesPagination: state.propertiesPagination,
      leadsStatus: state.leadsStatus,
      leads: state.leads,
      leadsPagination: state.leadsPagination,
      visitsStatus: state.visitsStatus,
      visits: state.visits,
      visitsPagination: state.visitsPagination,
      ownersStatus: state.ownersStatus,
      owners: state.owners,
      ownersPagination: state.ownersPagination,
      dashboardStatus: state.dashboardStatus,
      dashboardStats: state.dashboardStats,
    ));
  }

  Future<void> _onRefreshData(
    RefreshData event,
    Emitter<RealEstateState> emit,
  ) async {
    add(const LoadProperties());
    add(const LoadLeads());
    add(const LoadSiteVisits());
    add(const LoadOwners());
    add(const LoadDashboardStats());
  }
}
