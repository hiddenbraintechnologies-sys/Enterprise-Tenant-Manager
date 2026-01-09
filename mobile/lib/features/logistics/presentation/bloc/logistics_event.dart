import 'package:equatable/equatable.dart';

abstract class LogisticsEvent extends Equatable {
  const LogisticsEvent();

  @override
  List<Object?> get props => [];
}

class LoadOrders extends LogisticsEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? driverId;
  final String? customerId;
  final String? sortBy;
  final String sortOrder;

  const LoadOrders({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.driverId,
    this.customerId,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, driverId, customerId, sortBy, sortOrder];
}

class LoadMoreOrders extends LogisticsEvent {
  const LoadMoreOrders();
}

class LoadOrder extends LogisticsEvent {
  final String id;

  const LoadOrder(this.id);

  @override
  List<Object?> get props => [id];
}

class CreateOrder extends LogisticsEvent {
  final Map<String, dynamic> data;

  const CreateOrder(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateOrder extends LogisticsEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateOrder(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class AssignDriver extends LogisticsEvent {
  final String orderId;
  final String driverId;
  final String? vehicleId;

  const AssignDriver({
    required this.orderId,
    required this.driverId,
    this.vehicleId,
  });

  @override
  List<Object?> get props => [orderId, driverId, vehicleId];
}

class UpdateOrderStatus extends LogisticsEvent {
  final String orderId;
  final String status;
  final String? notes;

  const UpdateOrderStatus({
    required this.orderId,
    required this.status,
    this.notes,
  });

  @override
  List<Object?> get props => [orderId, status, notes];
}

class LoadVehicles extends LogisticsEvent {
  final int page;
  final int limit;
  final String? search;
  final String? type;
  final String? status;
  final String? sortBy;
  final String sortOrder;

  const LoadVehicles({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.type,
    this.status,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, type, status, sortBy, sortOrder];
}

class LoadMoreVehicles extends LogisticsEvent {
  const LoadMoreVehicles();
}

class LoadAvailableVehicles extends LogisticsEvent {
  const LoadAvailableVehicles();
}

class CreateVehicle extends LogisticsEvent {
  final Map<String, dynamic> data;

  const CreateVehicle(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateVehicle extends LogisticsEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateVehicle(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class LoadDrivers extends LogisticsEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? sortBy;
  final String sortOrder;

  const LoadDrivers({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, sortBy, sortOrder];
}

class LoadMoreDrivers extends LogisticsEvent {
  const LoadMoreDrivers();
}

class LoadAvailableDrivers extends LogisticsEvent {
  const LoadAvailableDrivers();
}

class CreateDriver extends LogisticsEvent {
  final Map<String, dynamic> data;

  const CreateDriver(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateDriver extends LogisticsEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateDriver(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class LoadOrderTracking extends LogisticsEvent {
  final String orderId;

  const LoadOrderTracking(this.orderId);

  @override
  List<Object?> get props => [orderId];
}

class AddTrackingUpdate extends LogisticsEvent {
  final String orderId;
  final Map<String, dynamic> data;

  const AddTrackingUpdate(this.orderId, this.data);

  @override
  List<Object?> get props => [orderId, data];
}

class LoadDashboardStats extends LogisticsEvent {
  const LoadDashboardStats();
}

class ClearFilters extends LogisticsEvent {
  const ClearFilters();
}

class RefreshData extends LogisticsEvent {
  const RefreshData();
}

class ClearSelectedOrder extends LogisticsEvent {
  const ClearSelectedOrder();
}

class ClearError extends LogisticsEvent {
  const ClearError();
}
