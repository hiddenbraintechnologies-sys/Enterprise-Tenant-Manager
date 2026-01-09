import 'package:equatable/equatable.dart';

abstract class GymEvent extends Equatable {
  const GymEvent();

  @override
  List<Object?> get props => [];
}

class LoadMembers extends GymEvent {
  final int page;
  final int limit;
  final String? search;
  final String? membershipType;
  final String? status;
  final String? sortBy;
  final String sortOrder;

  const LoadMembers({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.membershipType,
    this.status,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, membershipType, status, sortBy, sortOrder];
}

class LoadMoreMembers extends GymEvent {
  const LoadMoreMembers();
}

class LoadMemberDetail extends GymEvent {
  final String memberId;

  const LoadMemberDetail(this.memberId);

  @override
  List<Object?> get props => [memberId];
}

class CreateMember extends GymEvent {
  final Map<String, dynamic> data;

  const CreateMember(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateMember extends GymEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateMember(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class RenewMembership extends GymEvent {
  final String memberId;
  final String subscriptionId;
  final DateTime startDate;

  const RenewMembership({
    required this.memberId,
    required this.subscriptionId,
    required this.startDate,
  });

  @override
  List<Object?> get props => [memberId, subscriptionId, startDate];
}

class DeleteMember extends GymEvent {
  final String id;

  const DeleteMember(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadSubscriptions extends GymEvent {
  final int page;
  final int limit;
  final String? search;
  final bool? isActive;
  final String? sortBy;
  final String sortOrder;

  const LoadSubscriptions({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.isActive,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, isActive, sortBy, sortOrder];
}

class LoadMoreSubscriptions extends GymEvent {
  const LoadMoreSubscriptions();
}

class CreateSubscription extends GymEvent {
  final Map<String, dynamic> data;

  const CreateSubscription(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateSubscription extends GymEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateSubscription(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class DeleteSubscription extends GymEvent {
  final String id;

  const DeleteSubscription(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadTrainers extends GymEvent {
  final int page;
  final int limit;
  final String? search;
  final String? specialization;
  final bool? isActive;
  final String? sortBy;
  final String sortOrder;

  const LoadTrainers({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.specialization,
    this.isActive,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, specialization, isActive, sortBy, sortOrder];
}

class LoadMoreTrainers extends GymEvent {
  const LoadMoreTrainers();
}

class CreateTrainer extends GymEvent {
  final Map<String, dynamic> data;

  const CreateTrainer(this.data);

  @override
  List<Object?> get props => [data];
}

class UpdateTrainer extends GymEvent {
  final String id;
  final Map<String, dynamic> data;

  const UpdateTrainer(this.id, this.data);

  @override
  List<Object?> get props => [id, data];
}

class DeleteTrainer extends GymEvent {
  final String id;

  const DeleteTrainer(this.id);

  @override
  List<Object?> get props => [id];
}

class LoadAttendance extends GymEvent {
  final int page;
  final int limit;
  final String? search;
  final String? memberId;
  final DateTime? date;
  final String? sortBy;
  final String sortOrder;

  const LoadAttendance({
    this.page = 1,
    this.limit = 20,
    this.search,
    this.memberId,
    this.date,
    this.sortBy,
    this.sortOrder = 'desc',
  });

  @override
  List<Object?> get props => [page, limit, search, memberId, date, sortBy, sortOrder];
}

class LoadMoreAttendance extends GymEvent {
  const LoadMoreAttendance();
}

class CheckInMember extends GymEvent {
  final String memberId;
  final String? notes;

  const CheckInMember(this.memberId, {this.notes});

  @override
  List<Object?> get props => [memberId, notes];
}

class CheckOutMember extends GymEvent {
  final String attendanceId;
  final String? notes;

  const CheckOutMember(this.attendanceId, {this.notes});

  @override
  List<Object?> get props => [attendanceId, notes];
}

class LoadDashboardStats extends GymEvent {
  const LoadDashboardStats();
}

class LoadExpiringMemberships extends GymEvent {
  final int days;

  const LoadExpiringMemberships({this.days = 7});

  @override
  List<Object?> get props => [days];
}

class LoadTodayAttendance extends GymEvent {
  const LoadTodayAttendance();
}

class ClearFilters extends GymEvent {
  const ClearFilters();
}

class RefreshData extends GymEvent {
  const RefreshData();
}
