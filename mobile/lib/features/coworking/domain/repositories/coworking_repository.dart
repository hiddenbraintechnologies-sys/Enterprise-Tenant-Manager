import '../../../../core/network/pagination.dart';
import '../entities/coworking_desk.dart';
import '../entities/coworking_booking.dart';
import '../entities/coworking_member.dart';
import '../entities/coworking_meeting_room.dart';

abstract class CoworkingRepository {
  Future<PaginatedResponse<CoworkingDesk>> getDesks(
    PaginationParams params, {
    String? type,
    String? floor,
    bool? isAvailable,
  });

  Future<CoworkingDesk> getDesk(String id);

  Future<CoworkingDesk> createDesk(Map<String, dynamic> data);

  Future<CoworkingDesk> updateDesk(String id, Map<String, dynamic> data);

  Future<void> deleteDesk(String id);

  Future<Map<String, dynamic>> checkDeskAvailability(
    String deskId, {
    required DateTime startDate,
    required DateTime endDate,
  });

  Future<PaginatedResponse<CoworkingBooking>> getBookings(
    PaginationParams params, {
    String? status,
    String? bookingType,
    String? memberId,
    DateTime? startDate,
    DateTime? endDate,
  });

  Future<CoworkingBooking> getBooking(String id);

  Future<CoworkingBooking> createBooking(Map<String, dynamic> data);

  Future<CoworkingBooking> updateBooking(String id, Map<String, dynamic> data);

  Future<CoworkingBooking> cancelBooking(String id);

  Future<PaginatedResponse<CoworkingMember>> getMembers(
    PaginationParams params, {
    String? membershipPlan,
    bool? isActive,
  });

  Future<CoworkingMember> getMember(String id);

  Future<CoworkingMember> createMember(Map<String, dynamic> data);

  Future<CoworkingMember> updateMember(String id, Map<String, dynamic> data);

  Future<void> deleteMember(String id);

  Future<PaginatedResponse<CoworkingMeetingRoom>> getMeetingRooms(
    PaginationParams params, {
    int? minCapacity,
    bool? isAvailable,
  });

  Future<CoworkingMeetingRoom> getMeetingRoom(String id);

  Future<CoworkingMeetingRoom> createMeetingRoom(Map<String, dynamic> data);

  Future<CoworkingMeetingRoom> updateMeetingRoom(String id, Map<String, dynamic> data);

  Future<void> deleteMeetingRoom(String id);

  Future<CoworkingBooking> bookMeetingRoom(Map<String, dynamic> data);

  Future<Map<String, dynamic>> getDashboardStats();
}
