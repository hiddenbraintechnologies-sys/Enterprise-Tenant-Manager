import 'package:equatable/equatable.dart';

abstract class PgEvent extends Equatable {
  const PgEvent();

  @override
  List<Object?> get props => [];
}

class LoadRooms extends PgEvent {
  final int page;
  final int limit;
  final String? search;
  final String? type;
  final bool? isOccupied;
  final int? floor;
  final String? sortBy;
  final String sortOrder;

  const LoadRooms({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.type,
    this.isOccupied,
    this.floor,
    this.sortBy,
    this.sortOrder = 'asc',
  });

  @override
  List<Object?> get props => [page, limit, search, type, isOccupied, floor, sortBy, sortOrder];
}

class LoadMoreRooms extends PgEvent {
  const LoadMoreRooms();
}

class CreateRoom extends PgEvent {
  final Map<String, dynamic> data;

  const CreateRoom(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateRoom extends PgEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateRoom(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class LoadAvailableRooms extends PgEvent {
  const LoadAvailableRooms();
}

class LoadResidents extends PgEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? roomId;
  final String? sortBy;
  final String sortOrder;

  const LoadResidents({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.roomId,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, roomId, sortBy, sortOrder];
}

class LoadMoreResidents extends PgEvent {
  const LoadMoreResidents();
}

class CreateResident extends PgEvent {
  final Map<String, dynamic> data;

  const CreateResident(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateResident extends PgEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateResident(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class CheckOutResident extends PgEvent {
  final String id;
  final DateTime? checkOutDate;

  const CheckOutResident(this.id, {this.checkOutDate});

  @override
  List<Object?> get props => [id, checkOutDate];
}

class LoadPayments extends PgEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? type;
  final String? residentId;
  final int? month;
  final int? year;
  final String? sortBy;
  final String sortOrder;

  const LoadPayments({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.type,
    this.residentId,
    this.month,
    this.year,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, type, residentId, month, year, sortBy, sortOrder];
}

class LoadMorePayments extends PgEvent {
  const LoadMorePayments();
}

class CreatePayment extends PgEvent {
  final Map<String, dynamic> data;

  const CreatePayment(this.data);

  @override
  List<Object?> get props => [data];
}

class CollectPayment extends PgEvent {
  final String id;
  final String paymentMethod;
  final String? transactionId;
  final String? notes;

  const CollectPayment({
    required this.id,
    required this.paymentMethod,
    this.transactionId,
    this.notes,
  });

  @override
  List<Object?> get props => [id, paymentMethod, transactionId, notes];
}

class LoadOverduePayments extends PgEvent {
  const LoadOverduePayments();
}

class LoadMaintenanceRequests extends PgEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? priority;
  final String? roomId;
  final String? sortBy;
  final String sortOrder;

  const LoadMaintenanceRequests({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.priority,
    this.roomId,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, priority, roomId, sortBy, sortOrder];
}

class LoadMoreMaintenanceRequests extends PgEvent {
  const LoadMoreMaintenanceRequests();
}

class CreateMaintenanceRequest extends PgEvent {
  final Map<String, dynamic> data;

  const CreateMaintenanceRequest(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateMaintenanceRequest extends PgEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateMaintenanceRequest(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class CompleteMaintenanceRequest extends PgEvent {
  final String id;
  final double? actualCost;

  const CompleteMaintenanceRequest(this.id, {this.actualCost});

  @override
  List<Object?> get props => [id, actualCost];
}

class LoadDashboardStats extends PgEvent {
  const LoadDashboardStats();
}

class ClearFilters extends PgEvent {
  const ClearFilters();
}

class RefreshData extends PgEvent {
  const RefreshData();
}
