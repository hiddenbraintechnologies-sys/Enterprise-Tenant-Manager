import '../../../../core/network/pagination.dart';
import '../../domain/entities/coworking_desk.dart';
import '../../domain/entities/coworking_booking.dart';
import '../../domain/entities/coworking_member.dart';
import '../../domain/entities/coworking_meeting_room.dart';
import '../../domain/repositories/coworking_repository.dart';
import '../datasources/coworking_remote_datasource.dart';

class CoworkingRepositoryImpl implements CoworkingRepository {
  final CoworkingRemoteDataSource _remoteDataSource;

  CoworkingRepositoryImpl(this._remoteDataSource);

  @override
  Future<PaginatedResponse<CoworkingDesk>> getDesks(
    PaginationParams params, {
    String? type,
    String? floor,
    bool? isAvailable,
  }) {
    return _remoteDataSource.getDesks(
      params,
      type: type,
      floor: floor,
      isAvailable: isAvailable,
    );
  }

  @override
  Future<CoworkingDesk> getDesk(String id) {
    return _remoteDataSource.getDesk(id);
  }

  @override
  Future<CoworkingDesk> createDesk(Map<String, dynamic> data) {
    return _remoteDataSource.createDesk(data);
  }

  @override
  Future<CoworkingDesk> updateDesk(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateDesk(id, data);
  }

  @override
  Future<void> deleteDesk(String id) {
    return _remoteDataSource.deleteDesk(id);
  }

  @override
  Future<Map<String, dynamic>> checkDeskAvailability(
    String deskId, {
    required DateTime startDate,
    required DateTime endDate,
  }) {
    return _remoteDataSource.checkDeskAvailability(
      deskId,
      startDate: startDate,
      endDate: endDate,
    );
  }

  @override
  Future<PaginatedResponse<CoworkingBooking>> getBookings(
    PaginationParams params, {
    String? status,
    String? bookingType,
    String? memberId,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    return _remoteDataSource.getBookings(
      params,
      status: status,
      bookingType: bookingType,
      memberId: memberId,
      startDate: startDate,
      endDate: endDate,
    );
  }

  @override
  Future<CoworkingBooking> getBooking(String id) {
    return _remoteDataSource.getBooking(id);
  }

  @override
  Future<CoworkingBooking> createBooking(Map<String, dynamic> data) {
    return _remoteDataSource.createBooking(data);
  }

  @override
  Future<CoworkingBooking> updateBooking(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateBooking(id, data);
  }

  @override
  Future<CoworkingBooking> cancelBooking(String id) {
    return _remoteDataSource.cancelBooking(id);
  }

  @override
  Future<PaginatedResponse<CoworkingMember>> getMembers(
    PaginationParams params, {
    String? membershipPlan,
    bool? isActive,
  }) {
    return _remoteDataSource.getMembers(
      params,
      membershipPlan: membershipPlan,
      isActive: isActive,
    );
  }

  @override
  Future<CoworkingMember> getMember(String id) {
    return _remoteDataSource.getMember(id);
  }

  @override
  Future<CoworkingMember> createMember(Map<String, dynamic> data) {
    return _remoteDataSource.createMember(data);
  }

  @override
  Future<CoworkingMember> updateMember(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateMember(id, data);
  }

  @override
  Future<void> deleteMember(String id) {
    return _remoteDataSource.deleteMember(id);
  }

  @override
  Future<PaginatedResponse<CoworkingMeetingRoom>> getMeetingRooms(
    PaginationParams params, {
    int? minCapacity,
    bool? isAvailable,
  }) {
    return _remoteDataSource.getMeetingRooms(
      params,
      minCapacity: minCapacity,
      isAvailable: isAvailable,
    );
  }

  @override
  Future<CoworkingMeetingRoom> getMeetingRoom(String id) {
    return _remoteDataSource.getMeetingRoom(id);
  }

  @override
  Future<CoworkingMeetingRoom> createMeetingRoom(Map<String, dynamic> data) {
    return _remoteDataSource.createMeetingRoom(data);
  }

  @override
  Future<CoworkingMeetingRoom> updateMeetingRoom(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateMeetingRoom(id, data);
  }

  @override
  Future<void> deleteMeetingRoom(String id) {
    return _remoteDataSource.deleteMeetingRoom(id);
  }

  @override
  Future<CoworkingBooking> bookMeetingRoom(Map<String, dynamic> data) {
    return _remoteDataSource.bookMeetingRoom(data);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() {
    return _remoteDataSource.getDashboardStats();
  }
}
