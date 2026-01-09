import 'package:equatable/equatable.dart';
import '../../domain/entities/property.dart';
import '../../domain/entities/property_lead.dart';
import '../../domain/entities/property_visit.dart';

abstract class RealEstateEvent extends Equatable {
  const RealEstateEvent();

  @override
  List<Object?> get props => [];
}

class LoadProperties extends RealEstateEvent {
  final int page;
  final int limit;
  final String? search;
  final PropertyType? type;
  final PropertyPurpose? purpose;
  final PropertyStatus? status;
  final double? minPrice;
  final double? maxPrice;
  final String? sortBy;
  final String sortOrder;

  const LoadProperties({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.type,
    this.purpose,
    this.status,
    this.minPrice,
    this.maxPrice,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [
        page,
        limit,
        search,
        type,
        purpose,
        status,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder,
      ];
}

class LoadMoreProperties extends RealEstateEvent {
  const LoadMoreProperties();
}

class LoadProperty extends RealEstateEvent {
  final String id;

  const LoadProperty(this.id);

  @override
  List<Object?> get props => [id];
}

class CreateProperty extends RealEstateEvent {
  final Map<String, dynamic> data;

  const CreateProperty(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateProperty extends RealEstateEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateProperty(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class DeleteProperty extends RealEstateEvent {
  final String id;

  const DeleteProperty(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadLeads extends RealEstateEvent {
  final int page;
  final int limit;
  final String? search;
  final LeadStatus? status;
  final LeadSource? source;
  final String? assignedTo;
  final String? sortBy;
  final String sortOrder;

  const LoadLeads({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.source,
    this.assignedTo,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, source, assignedTo, sortBy, sortOrder];
}

class LoadMoreLeads extends RealEstateEvent {
  const LoadMoreLeads();
}

class CreateLead extends RealEstateEvent {
  final Map<String, dynamic> data;

  const CreateLead(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateLead extends RealEstateEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateLead(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class ConvertLead extends RealEstateEvent {
  final String id;

  const ConvertLead(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadSiteVisits extends RealEstateEvent {
  final int page;
  final int limit;
  final String? search;
  final VisitStatus? status;
  final String? agentId;
  final DateTime? fromDate;
  final DateTime? toDate;
  final String? sortBy;
  final String sortOrder;

  const LoadSiteVisits({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.agentId,
    this.fromDate,
    this.toDate,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, agentId, fromDate, toDate, sortBy, sortOrder];
}

class LoadMoreSiteVisits extends RealEstateEvent {
  const LoadMoreSiteVisits();
}

class ScheduleVisit extends RealEstateEvent {
  final Map<String, dynamic> data;

  const ScheduleVisit(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateSiteVisit extends RealEstateEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateSiteVisit(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class CompleteSiteVisit extends RealEstateEvent {
  final String id;
  final String? feedback;

  const CompleteSiteVisit(this.id, {this.feedback});

  @override
  List<Object?> get props => [id, feedback];
}

class LoadOwners extends RealEstateEvent {
  final int page;
  final int limit;
  final String? search;
  final String? sortBy;
  final String sortOrder;

  const LoadOwners({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, sortBy, sortOrder];
}

class LoadMoreOwners extends RealEstateEvent {
  const LoadMoreOwners();
}

class CreateOwner extends RealEstateEvent {
  final Map<String, dynamic> data;

  const CreateOwner(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateOwner extends RealEstateEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateOwner(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class LoadDashboardStats extends RealEstateEvent {
  const LoadDashboardStats();
}

class ClearFilters extends RealEstateEvent {
  const ClearFilters();
}

class RefreshData extends RealEstateEvent {
  const RefreshData();
}
