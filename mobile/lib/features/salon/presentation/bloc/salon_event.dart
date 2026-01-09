import 'package:equatable/equatable.dart';

abstract class SalonEvent extends Equatable {
  const SalonEvent();

  @override
  List<Object?> get props => [];
}

class LoadServices extends SalonEvent {
  final int page;
  final int limit;
  final String? search;
  final String? category;
  final bool? isActive;
  final String? sortBy;
  final String sortOrder;

  const LoadServices({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.category,
    this.isActive,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, category, isActive, sortBy, sortOrder];
}

class LoadMoreServices extends SalonEvent {
  const LoadMoreServices();
}

class CreateService extends SalonEvent {
  final Map<String, dynamic> data;

  const CreateService({required this.data});

  @override
  List<Object?> get props => [data];
}

class UpdateService extends SalonEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateService({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class DeleteService extends SalonEvent {
  final String id;

  const DeleteService({required this.id});

  @override
  List<Object?> get props => [id];
}

class LoadAppointments extends SalonEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? staffId;
  final String? customerId;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? sortBy;
  final String sortOrder;

  const LoadAppointments({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.staffId,
    this.customerId,
    this.startDate,
    this.endDate,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [
        page,
        limit,
        search,
        status,
        staffId,
        customerId,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      ];
}

class LoadMoreAppointments extends SalonEvent {
  const LoadMoreAppointments();
}

class CreateAppointment extends SalonEvent {
  final Map<String, dynamic> data;

  const CreateAppointment({required this.data});

  @override
  List<Object?> get props => [data];
}

class UpdateAppointment extends SalonEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateAppointment({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class CancelAppointment extends SalonEvent {
  final String id;

  const CancelAppointment({required this.id});

  @override
  List<Object?> get props => [id];
}

class LoadStaff extends SalonEvent {
  final int page;
  final int limit;
  final String? search;
  final bool? isActive;
  final String? specialization;
  final String? sortBy;
  final String sortOrder;

  const LoadStaff({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.isActive,
    this.specialization,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, isActive, specialization, sortBy, sortOrder];
}

class LoadMoreStaff extends SalonEvent {
  const LoadMoreStaff();
}

class CreateStaff extends SalonEvent {
  final Map<String, dynamic> data;

  const CreateStaff({required this.data});

  @override
  List<Object?> get props => [data];
}

class UpdateStaff extends SalonEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateStaff({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class LoadCustomers extends SalonEvent {
  final int page;
  final int limit;
  final String? search;
  final int? minLoyaltyPoints;
  final String? sortBy;
  final String sortOrder;

  const LoadCustomers({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.minLoyaltyPoints,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, minLoyaltyPoints, sortBy, sortOrder];
}

class LoadMoreCustomers extends SalonEvent {
  const LoadMoreCustomers();
}

class CreateCustomer extends SalonEvent {
  final Map<String, dynamic> data;

  const CreateCustomer({required this.data});

  @override
  List<Object?> get props => [data];
}

class UpdateCustomer extends SalonEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateCustomer({required this.id, required this.data});

  @override
  List<Object?> get props => [id, data];
}

class LoadDashboardStats extends SalonEvent {
  const LoadDashboardStats();
}

class LoadTodayAppointments extends SalonEvent {
  const LoadTodayAppointments();
}

class ClearFilters extends SalonEvent {
  const ClearFilters();
}

class RefreshData extends SalonEvent {
  const RefreshData();
}
