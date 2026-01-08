class HrDashboardStats {
  final int totalEmployees;
  final int activeEmployees;
  final int onLeaveToday;
  final int pendingLeaveRequests;
  final int presentToday;
  final int absentToday;

  HrDashboardStats({
    this.totalEmployees = 0,
    this.activeEmployees = 0,
    this.onLeaveToday = 0,
    this.pendingLeaveRequests = 0,
    this.presentToday = 0,
    this.absentToday = 0,
  });

  factory HrDashboardStats.fromJson(Map<String, dynamic> json) {
    return HrDashboardStats(
      totalEmployees: json['totalEmployees'] ?? 0,
      activeEmployees: json['activeEmployees'] ?? 0,
      onLeaveToday: json['onLeaveToday'] ?? 0,
      pendingLeaveRequests: json['pendingLeaveRequests'] ?? 0,
      presentToday: json['presentToday'] ?? 0,
      absentToday: json['absentToday'] ?? 0,
    );
  }
}

class HrEmployee {
  final String id;
  final String firstName;
  final String lastName;
  final String? email;
  final String? phone;
  final String? position;
  final String? departmentId;
  final String? departmentName;
  final String employmentType;
  final String status;
  final String? dateOfJoining;
  final String? profileImageUrl;

  HrEmployee({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.email,
    this.phone,
    this.position,
    this.departmentId,
    this.departmentName,
    this.employmentType = 'full_time',
    this.status = 'active',
    this.dateOfJoining,
    this.profileImageUrl,
  });

  String get fullName => '$firstName $lastName';

  factory HrEmployee.fromJson(Map<String, dynamic> json) {
    return HrEmployee(
      id: json['id'],
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      email: json['email'],
      phone: json['phone'],
      position: json['position'],
      departmentId: json['departmentId'],
      departmentName: json['departmentName'],
      employmentType: json['employmentType'] ?? 'full_time',
      status: json['status'] ?? 'active',
      dateOfJoining: json['dateOfJoining'],
      profileImageUrl: json['profileImageUrl'],
    );
  }

  Map<String, dynamic> toJson() => {
    'firstName': firstName,
    'lastName': lastName,
    'email': email,
    'phone': phone,
    'position': position,
    'departmentId': departmentId,
    'employmentType': employmentType,
    'status': status,
    'dateOfJoining': dateOfJoining,
  };
}

class HrDepartment {
  final String id;
  final String name;
  final String? description;
  final String? managerId;

  HrDepartment({
    required this.id,
    required this.name,
    this.description,
    this.managerId,
  });

  factory HrDepartment.fromJson(Map<String, dynamic> json) {
    return HrDepartment(
      id: json['id'],
      name: json['name'] ?? '',
      description: json['description'],
      managerId: json['managerId'],
    );
  }
}

class HrAttendance {
  final String id;
  final String employeeId;
  final String? employeeName;
  final String date;
  final String? checkIn;
  final String? checkOut;
  final String status;
  final double? hoursWorked;

  HrAttendance({
    required this.id,
    required this.employeeId,
    this.employeeName,
    required this.date,
    this.checkIn,
    this.checkOut,
    this.status = 'present',
    this.hoursWorked,
  });

  factory HrAttendance.fromJson(Map<String, dynamic> json) {
    return HrAttendance(
      id: json['id'],
      employeeId: json['employeeId'] ?? '',
      employeeName: json['employeeName'],
      date: json['date'] ?? '',
      checkIn: json['checkIn'],
      checkOut: json['checkOut'],
      status: json['status'] ?? 'present',
      hoursWorked: (json['hoursWorked'] as num?)?.toDouble(),
    );
  }
}

class HrLeave {
  final String id;
  final String employeeId;
  final String? employeeName;
  final String leaveTypeId;
  final String? leaveTypeName;
  final String startDate;
  final String endDate;
  final String? reason;
  final String status;
  final String? approvedBy;
  final int days;

  HrLeave({
    required this.id,
    required this.employeeId,
    this.employeeName,
    required this.leaveTypeId,
    this.leaveTypeName,
    required this.startDate,
    required this.endDate,
    this.reason,
    this.status = 'pending',
    this.approvedBy,
    this.days = 1,
  });

  factory HrLeave.fromJson(Map<String, dynamic> json) {
    return HrLeave(
      id: json['id'],
      employeeId: json['employeeId'] ?? '',
      employeeName: json['employeeName'],
      leaveTypeId: json['leaveTypeId'] ?? '',
      leaveTypeName: json['leaveTypeName'],
      startDate: json['startDate'] ?? '',
      endDate: json['endDate'] ?? '',
      reason: json['reason'],
      status: json['status'] ?? 'pending',
      approvedBy: json['approvedBy'],
      days: json['days'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() => {
    'employeeId': employeeId,
    'leaveTypeId': leaveTypeId,
    'startDate': startDate,
    'endDate': endDate,
    'reason': reason,
  };
}

class HrLeaveType {
  final String id;
  final String name;
  final int defaultDays;
  final bool isPaid;

  HrLeaveType({
    required this.id,
    required this.name,
    this.defaultDays = 0,
    this.isPaid = true,
  });

  factory HrLeaveType.fromJson(Map<String, dynamic> json) {
    return HrLeaveType(
      id: json['id'],
      name: json['name'] ?? '',
      defaultDays: json['defaultDays'] ?? 0,
      isPaid: json['isPaid'] ?? true,
    );
  }
}

class HrPayroll {
  final String id;
  final String employeeId;
  final String? employeeName;
  final int month;
  final int year;
  final double basicSalary;
  final double allowances;
  final double deductions;
  final double grossSalary;
  final double netPay;
  final String status;

  HrPayroll({
    required this.id,
    required this.employeeId,
    this.employeeName,
    required this.month,
    required this.year,
    this.basicSalary = 0,
    this.allowances = 0,
    this.deductions = 0,
    this.grossSalary = 0,
    this.netPay = 0,
    this.status = 'pending',
  });

  factory HrPayroll.fromJson(Map<String, dynamic> json) {
    return HrPayroll(
      id: json['id'],
      employeeId: json['employeeId'] ?? '',
      employeeName: json['employeeName'],
      month: json['month'] ?? 1,
      year: json['year'] ?? DateTime.now().year,
      basicSalary: (json['basicSalary'] as num?)?.toDouble() ?? 0,
      allowances: (json['allowances'] as num?)?.toDouble() ?? 0,
      deductions: (json['deductions'] as num?)?.toDouble() ?? 0,
      grossSalary: (json['grossSalary'] as num?)?.toDouble() ?? 0,
      netPay: (json['netPay'] as num?)?.toDouble() ?? 0,
      status: json['status'] ?? 'pending',
    );
  }
}

class PaginatedResponse<T> {
  final List<T> data;
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  PaginatedResponse({
    required this.data,
    this.total = 0,
    this.page = 1,
    this.limit = 20,
    this.totalPages = 1,
  });
}
