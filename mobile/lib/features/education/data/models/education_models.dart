/// Education Module Models
library education_models;

class EduStudent {
  final String id;
  final String tenantId;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String status;
  final String? enrollmentNumber;
  final DateTime? dateOfBirth;

  EduStudent({
    required this.id,
    required this.tenantId,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    required this.status,
    this.enrollmentNumber,
    this.dateOfBirth,
  });

  factory EduStudent.fromJson(Map<String, dynamic> json) => EduStudent(
    id: json['id'],
    tenantId: json['tenantId'],
    firstName: json['firstName'],
    lastName: json['lastName'],
    email: json['email'],
    phone: json['phone'],
    status: json['status'] ?? 'active',
    enrollmentNumber: json['enrollmentNumber'],
    dateOfBirth: json['dateOfBirth'] != null ? DateTime.parse(json['dateOfBirth']) : null,
  );

  String get fullName => '$firstName $lastName';
}

class EduCourse {
  final String id;
  final String tenantId;
  final String name;
  final String? description;
  final double fee;
  final int durationMonths;
  final String status;

  EduCourse({
    required this.id,
    required this.tenantId,
    required this.name,
    this.description,
    required this.fee,
    required this.durationMonths,
    required this.status,
  });

  factory EduCourse.fromJson(Map<String, dynamic> json) => EduCourse(
    id: json['id'],
    tenantId: json['tenantId'],
    name: json['name'],
    description: json['description'],
    fee: (json['fee'] ?? 0).toDouble(),
    durationMonths: json['durationMonths'] ?? 0,
    status: json['status'] ?? 'active',
  );
}

class EduBatch {
  final String id;
  final String tenantId;
  final String name;
  final String courseId;
  final String? courseName;
  final DateTime startDate;
  final DateTime? endDate;
  final String status;
  final int maxStudents;
  final int currentStudents;

  EduBatch({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.courseId,
    this.courseName,
    required this.startDate,
    this.endDate,
    required this.status,
    required this.maxStudents,
    required this.currentStudents,
  });

  factory EduBatch.fromJson(Map<String, dynamic> json) => EduBatch(
    id: json['id'],
    tenantId: json['tenantId'],
    name: json['name'],
    courseId: json['courseId'],
    courseName: json['courseName'],
    startDate: DateTime.parse(json['startDate']),
    endDate: json['endDate'] != null ? DateTime.parse(json['endDate']) : null,
    status: json['status'] ?? 'active',
    maxStudents: json['maxStudents'] ?? 0,
    currentStudents: json['currentStudents'] ?? 0,
  );
}

class EduDashboardStats {
  final int totalStudents;
  final int activeStudents;
  final int totalCourses;
  final int activeBatches;
  final double averageAttendance;
  final double pendingFees;

  EduDashboardStats({
    required this.totalStudents,
    required this.activeStudents,
    required this.totalCourses,
    required this.activeBatches,
    required this.averageAttendance,
    required this.pendingFees,
  });

  factory EduDashboardStats.fromJson(Map<String, dynamic> json) => EduDashboardStats(
    totalStudents: json['totalStudents'] ?? 0,
    activeStudents: json['activeStudents'] ?? 0,
    totalCourses: json['totalCourses'] ?? 0,
    activeBatches: json['activeBatches'] ?? 0,
    averageAttendance: (json['averageAttendance'] ?? 0).toDouble(),
    pendingFees: (json['pendingFees'] ?? 0).toDouble(),
  );
}
