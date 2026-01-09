import 'package:equatable/equatable.dart';

abstract class CoworkingEvent extends Equatable {
  const CoworkingEvent();

  @override
  List<Object?> get props => [];
}

class LoadDesks extends CoworkingEvent {
  final int page;
  final int limit;
  final String? search;
  final String? type;
  final String? floor;
  final bool? isAvailable;
  final String? sortBy;
  final String sortOrder;

  const LoadDesks({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.type,
    this.floor,
    this.isAvailable,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, type, floor, isAvailable, sortBy, sortOrder];
}

class LoadMoreDesks extends CoworkingEvent {
  const LoadMoreDesks();
}

class CreateDesk extends CoworkingEvent {
  final Map<String, dynamic> data;

  const CreateDesk(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateDesk extends CoworkingEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateDesk(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class DeleteDesk extends CoworkingEvent {
  final String id;

  const DeleteDesk(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadBookings extends CoworkingEvent {
  final int page;
  final int limit;
  final String? search;
  final String? status;
  final String? bookingType;
  final String? memberId;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? sortBy;
  final String sortOrder;

  const LoadBookings({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.status,
    this.bookingType,
    this.memberId,
    this.startDate,
    this.endDate,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, status, bookingType, memberId, startDate, endDate, sortBy, sortOrder];
}

class LoadMoreBookings extends CoworkingEvent {
  const LoadMoreBookings();
}

class CreateBooking extends CoworkingEvent {
  final Map<String, dynamic> data;

  const CreateBooking(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateBooking extends CoworkingEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateBooking(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class CancelBooking extends CoworkingEvent {
  final String id;

  const CancelBooking(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadMembers extends CoworkingEvent {
  final int page;
  final int limit;
  final String? search;
  final String? membershipPlan;
  final bool? isActive;
  final String? sortBy;
  final String sortOrder;

  const LoadMembers({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.membershipPlan,
    this.isActive,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, membershipPlan, isActive, sortBy, sortOrder];
}

class LoadMoreMembers extends CoworkingEvent {
  const LoadMoreMembers();
}

class CreateMember extends CoworkingEvent {
  final Map<String, dynamic> data;

  const CreateMember(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateMember extends CoworkingEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateMember(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class DeleteMember extends CoworkingEvent {
  final String id;

  const DeleteMember(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadMeetingRooms extends CoworkingEvent {
  final int page;
  final int limit;
  final String? search;
  final int? minCapacity;
  final bool? isAvailable;
  final String? sortBy;
  final String sortOrder;

  const LoadMeetingRooms({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.minCapacity,
    this.isAvailable,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, minCapacity, isAvailable, sortBy, sortOrder];
}

class LoadMoreMeetingRooms extends CoworkingEvent {
  const LoadMoreMeetingRooms();
}

class BookMeetingRoom extends CoworkingEvent {
  final Map<String, dynamic> data;

  const BookMeetingRoom(this.data);

  @override
  List<Object?> get props => [data];
}

class LoadDashboardStats extends CoworkingEvent {
  const LoadDashboardStats();
}

class ClearFilters extends CoworkingEvent {
  const ClearFilters();
}

class RefreshData extends CoworkingEvent {
  const RefreshData();
}
