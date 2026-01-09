import '../../../../core/network/pagination.dart';
import '../../domain/entities/gym_member.dart';
import '../../domain/entities/gym_subscription.dart';
import '../../domain/entities/gym_trainer.dart';
import '../../domain/entities/gym_attendance.dart';
import '../../domain/repositories/gym_repository.dart';
import '../datasources/gym_remote_datasource.dart';

class GymRepositoryImpl implements GymRepository {
  final GymRemoteDataSource _remoteDataSource;

  GymRepositoryImpl(this._remoteDataSource);

  @override
  Future<PaginatedResponse<GymMember>> getMembers(
    PaginationParams params, {
    String? membershipType,
    String? status,
  }) {
    return _remoteDataSource.getMembers(
      params,
      membershipType: membershipType,
      status: status,
    );
  }

  @override
  Future<GymMember> getMember(String id) {
    return _remoteDataSource.getMember(id);
  }

  @override
  Future<GymMember> createMember(Map<String, dynamic> data) {
    return _remoteDataSource.createMember(data);
  }

  @override
  Future<GymMember> updateMember(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateMember(id, data);
  }

  @override
  Future<GymMember> renewMembership(String id, {
    required String subscriptionId,
    required DateTime startDate,
  }) {
    return _remoteDataSource.renewMembership(
      id,
      subscriptionId: subscriptionId,
      startDate: startDate,
    );
  }

  @override
  Future<void> deleteMember(String id) {
    return _remoteDataSource.deleteMember(id);
  }

  @override
  Future<PaginatedResponse<GymSubscription>> getSubscriptions(
    PaginationParams params, {
    bool? isActive,
  }) {
    return _remoteDataSource.getSubscriptions(params, isActive: isActive);
  }

  @override
  Future<GymSubscription> getSubscription(String id) {
    return _remoteDataSource.getSubscription(id);
  }

  @override
  Future<GymSubscription> createSubscription(Map<String, dynamic> data) {
    return _remoteDataSource.createSubscription(data);
  }

  @override
  Future<GymSubscription> updateSubscription(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateSubscription(id, data);
  }

  @override
  Future<void> deleteSubscription(String id) {
    return _remoteDataSource.deleteSubscription(id);
  }

  @override
  Future<PaginatedResponse<GymTrainer>> getTrainers(
    PaginationParams params, {
    String? specialization,
    bool? isActive,
  }) {
    return _remoteDataSource.getTrainers(
      params,
      specialization: specialization,
      isActive: isActive,
    );
  }

  @override
  Future<GymTrainer> getTrainer(String id) {
    return _remoteDataSource.getTrainer(id);
  }

  @override
  Future<GymTrainer> createTrainer(Map<String, dynamic> data) {
    return _remoteDataSource.createTrainer(data);
  }

  @override
  Future<GymTrainer> updateTrainer(String id, Map<String, dynamic> data) {
    return _remoteDataSource.updateTrainer(id, data);
  }

  @override
  Future<void> deleteTrainer(String id) {
    return _remoteDataSource.deleteTrainer(id);
  }

  @override
  Future<PaginatedResponse<GymAttendance>> getAttendance(
    PaginationParams params, {
    String? memberId,
    DateTime? date,
  }) {
    return _remoteDataSource.getAttendance(
      params,
      memberId: memberId,
      date: date,
    );
  }

  @override
  Future<GymAttendance> checkIn(String memberId, {String? notes}) {
    return _remoteDataSource.checkIn(memberId, notes: notes);
  }

  @override
  Future<GymAttendance> checkOut(String attendanceId, {String? notes}) {
    return _remoteDataSource.checkOut(attendanceId, notes: notes);
  }

  @override
  Future<Map<String, dynamic>> getDashboardStats() {
    return _remoteDataSource.getDashboardStats();
  }

  @override
  Future<List<GymMember>> getExpiringMemberships({int days = 7}) {
    return _remoteDataSource.getExpiringMemberships(days: days);
  }

  @override
  Future<List<GymAttendance>> getTodayAttendance() {
    return _remoteDataSource.getTodayAttendance();
  }
}
