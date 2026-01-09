import '../../../../core/network/pagination.dart';
import '../entities/gym_member.dart';
import '../entities/gym_subscription.dart';
import '../entities/gym_trainer.dart';
import '../entities/gym_attendance.dart';

abstract class GymRepository {
  Future<PaginatedResponse<GymMember>> getMembers(
    PaginationParams params, {
    String? membershipType,
    String? status,
  });

  Future<GymMember> getMember(String id);

  Future<GymMember> createMember(Map<String, dynamic> data);

  Future<GymMember> updateMember(String id, Map<String, dynamic> data);

  Future<GymMember> renewMembership(String id, {
    required String subscriptionId,
    required DateTime startDate,
  });

  Future<void> deleteMember(String id);

  Future<PaginatedResponse<GymSubscription>> getSubscriptions(
    PaginationParams params, {
    bool? isActive,
  });

  Future<GymSubscription> getSubscription(String id);

  Future<GymSubscription> createSubscription(Map<String, dynamic> data);

  Future<GymSubscription> updateSubscription(String id, Map<String, dynamic> data);

  Future<void> deleteSubscription(String id);

  Future<PaginatedResponse<GymTrainer>> getTrainers(
    PaginationParams params, {
    String? specialization,
    bool? isActive,
  });

  Future<GymTrainer> getTrainer(String id);

  Future<GymTrainer> createTrainer(Map<String, dynamic> data);

  Future<GymTrainer> updateTrainer(String id, Map<String, dynamic> data);

  Future<void> deleteTrainer(String id);

  Future<PaginatedResponse<GymAttendance>> getAttendance(
    PaginationParams params, {
    String? memberId,
    DateTime? date,
  });

  Future<GymAttendance> checkIn(String memberId, {String? notes});

  Future<GymAttendance> checkOut(String attendanceId, {String? notes});

  Future<Map<String, dynamic>> getDashboardStats();

  Future<List<GymMember>> getExpiringMemberships({int days = 7});

  Future<List<GymAttendance>> getTodayAttendance();
}
