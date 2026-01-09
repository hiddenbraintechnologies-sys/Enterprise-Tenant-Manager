import 'package:equatable/equatable.dart';

abstract class TourismEvent extends Equatable {
  const TourismEvent();

  @override
  List<Object?> get props => [];
}

class LoadPackages extends TourismEvent {
  final int page;
  final int limit;
  final String? search;
  final String? category;
  final String? destination;
  final bool? isActive;
  final String? sortBy;
  final String sortOrder;

  const LoadPackages({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.category,
    this.destination,
    this.isActive,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props =>
      [page, limit, search, category, destination, isActive, sortBy, sortOrder];
}

class LoadMorePackages extends TourismEvent {
  const LoadMorePackages();
}

class LoadPackageDetail extends TourismEvent {
  final String packageId;

  const LoadPackageDetail(this.packageId);

  @override
  List<Object?> get props => [packageId];
}

class CreatePackage extends TourismEvent {
  final Map<String, dynamic> data;

  const CreatePackage(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdatePackage extends TourismEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdatePackage(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class DeletePackage extends TourismEvent {
  final String id;

  const DeletePackage(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadBookings extends TourismEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? paymentStatus;
  final String? packageId;
  final String? customerId;
  final String? sortBy;
  final String sortOrder;

  const LoadBookings({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.paymentStatus,
    this.packageId,
    this.customerId,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [
        page,
        limit,
        search,
        status,
        paymentStatus,
        packageId,
        customerId,
        sortBy,
        sortOrder
      ];
}

class LoadMoreBookings extends TourismEvent {
  const LoadMoreBookings();
}

class CreateBooking extends TourismEvent {
  final Map<String, dynamic> data;

  const CreateBooking(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateBooking extends TourismEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateBooking(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class CancelBooking extends TourismEvent {
  final String id;

  const CancelBooking(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadItineraries extends TourismEvent {
  final String packageId;

  const LoadItineraries(this.packageId);

  @override
  List<Object?> get props => [packageId];
}

class CreateItinerary extends TourismEvent {
  final Map<String, dynamic> data;

  const CreateItinerary(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateItinerary extends TourismEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateItinerary(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class DeleteItinerary extends TourismEvent {
  final String id;

  const DeleteItinerary(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadCustomers extends TourismEvent {
  final int page;
  final int limit;
  final String? search;
  final String? sortBy;
  final String sortOrder;

  const LoadCustomers({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, sortBy, sortOrder];
}

class LoadMoreCustomers extends TourismEvent {
  const LoadMoreCustomers();
}

class CreateCustomer extends TourismEvent {
  final Map<String, dynamic> data;

  const CreateCustomer(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateCustomer extends TourismEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateCustomer(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class LoadDashboardStats extends TourismEvent {
  const LoadDashboardStats();
}

class ClearFilters extends TourismEvent {
  const ClearFilters();
}

class RefreshData extends TourismEvent {
  const RefreshData();
}
