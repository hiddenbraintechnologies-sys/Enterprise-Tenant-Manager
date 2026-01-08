/// Education BLoC
library education_bloc;

import 'package:flutter_bloc/flutter_bloc.dart';
import '../data/models/education_models.dart';
import '../data/repositories/education_repository.dart';
import '../../legal/data/models/legal_models.dart' show PaginationInfo;

abstract class EducationEvent {}
class LoadDashboard extends EducationEvent {}
class LoadStudents extends EducationEvent {
  final int page;
  final String? search;
  LoadStudents({this.page = 1, this.search});
}
class LoadCourses extends EducationEvent { final int page; LoadCourses({this.page = 1}); }
class LoadBatches extends EducationEvent { final int page; LoadBatches({this.page = 1}); }
class CreateStudent extends EducationEvent { final Map<String, dynamic> data; CreateStudent(this.data); }
class CreateCourse extends EducationEvent { final Map<String, dynamic> data; CreateCourse(this.data); }
class CreateBatch extends EducationEvent { final Map<String, dynamic> data; CreateBatch(this.data); }

abstract class EducationState {}
class EducationInitial extends EducationState {}
class EducationLoading extends EducationState {}
class EducationError extends EducationState { final String message; EducationError(this.message); }
class DashboardLoaded extends EducationState { final EduDashboardStats stats; DashboardLoaded(this.stats); }
class StudentsLoaded extends EducationState { final List<EduStudent> students; final PaginationInfo pagination; StudentsLoaded(this.students, this.pagination); }
class CoursesLoaded extends EducationState { final List<EduCourse> courses; final PaginationInfo pagination; CoursesLoaded(this.courses, this.pagination); }
class BatchesLoaded extends EducationState { final List<EduBatch> batches; final PaginationInfo pagination; BatchesLoaded(this.batches, this.pagination); }
class StudentCreated extends EducationState { final EduStudent student; StudentCreated(this.student); }
class CourseCreated extends EducationState { final EduCourse course; CourseCreated(this.course); }
class BatchCreated extends EducationState { final EduBatch batch; BatchCreated(this.batch); }

class EducationBloc extends Bloc<EducationEvent, EducationState> {
  final EducationRepository repository;

  EducationBloc(this.repository) : super(EducationInitial()) {
    on<LoadDashboard>((event, emit) async {
      emit(EducationLoading());
      try {
        final stats = await repository.getDashboardStats();
        emit(DashboardLoaded(stats));
      } catch (e) { emit(EducationError(e.toString())); }
    });
    on<LoadStudents>((event, emit) async {
      emit(EducationLoading());
      try {
        final result = await repository.getStudents(page: event.page, search: event.search);
        emit(StudentsLoaded(result.data, result.pagination));
      } catch (e) { emit(EducationError(e.toString())); }
    });
    on<LoadCourses>((event, emit) async {
      emit(EducationLoading());
      try {
        final result = await repository.getCourses(page: event.page);
        emit(CoursesLoaded(result.data, result.pagination));
      } catch (e) { emit(EducationError(e.toString())); }
    });
    on<LoadBatches>((event, emit) async {
      emit(EducationLoading());
      try {
        final result = await repository.getBatches(page: event.page);
        emit(BatchesLoaded(result.data, result.pagination));
      } catch (e) { emit(EducationError(e.toString())); }
    });
    on<CreateStudent>((event, emit) async {
      emit(EducationLoading());
      try {
        final student = await repository.createStudent(event.data);
        emit(StudentCreated(student));
      } catch (e) { emit(EducationError(e.toString())); }
    });
    on<CreateCourse>((event, emit) async {
      emit(EducationLoading());
      try {
        final course = await repository.createCourse(event.data);
        emit(CourseCreated(course));
      } catch (e) { emit(EducationError(e.toString())); }
    });
    on<CreateBatch>((event, emit) async {
      emit(EducationLoading());
      try {
        final batch = await repository.createBatch(event.data);
        emit(BatchCreated(batch));
      } catch (e) { emit(EducationError(e.toString())); }
    });
  }
}
