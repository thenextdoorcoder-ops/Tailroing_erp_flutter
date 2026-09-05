import 'user_model.dart';
import 'order_model.dart';

class WorkAssignmentModel {
  final String id;
  final String orderId;
  final String userId;
  final String stage; // TailoringOrderStatus
  final String assignedAt;
  final String? completedAt;
  final String? notes;
  final UserModel? staff;
  final OrderModel? order;

  WorkAssignmentModel({
    required this.id,
    required this.orderId,
    required this.userId,
    required this.stage,
    required this.assignedAt,
    this.completedAt,
    this.notes,
    this.staff,
    this.order,
  });

  bool get isCompleted => completedAt != null && completedAt!.isNotEmpty;

  factory WorkAssignmentModel.fromJson(Map<String, dynamic> json) {
    return WorkAssignmentModel(
      id: json['id']?.toString() ?? '',
      orderId: json['orderId']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      stage: json['stage']?.toString() ?? 'ORDER_CREATED',
      assignedAt: json['assignedAt']?.toString() ?? '',
      completedAt: json['completedAt']?.toString(),
      notes: json['notes']?.toString(),
      staff: json['user'] != null ? UserModel.fromJson(json['user']) : null,
      order: json['order'] != null ? OrderModel.fromJson(json['order']) : null,
    );
  }
}

class AttendanceModel {
  final String id;
  final String userId;
  final String date;
  final String status; // PRESENT, ABSENT, HALF_DAY, LEAVE
  final String? checkInTime;
  final String? checkOutTime;
  final String? notes;
  final UserModel? user;

  AttendanceModel({
    required this.id,
    required this.userId,
    required this.date,
    required this.status,
    this.checkInTime,
    this.checkOutTime,
    this.notes,
    this.user,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id']?.toString() ?? '',
      userId: json['userId']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      status: json['status']?.toString() ?? 'PRESENT',
      checkInTime: json['checkInTime']?.toString(),
      checkOutTime: json['checkOutTime']?.toString(),
      notes: json['notes']?.toString(),
      user: json['user'] != null ? UserModel.fromJson(json['user']) : null,
    );
  }
}

class ExpenseModel {
  final String id;
  final String name;
  final String category;
  final double amount;
  final String expenseDate;
  final String? description;
  final String? staffId;
  final UserModel? staff;

  ExpenseModel({
    required this.id,
    required this.name,
    required this.category,
    required this.amount,
    required this.expenseDate,
    this.description,
    this.staffId,
    this.staff,
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    return ExpenseModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      expenseDate: json['expenseDate']?.toString() ?? '',
      description: json['description']?.toString(),
      staffId: json['staffId']?.toString(),
      staff: json['staff'] != null ? UserModel.fromJson(json['staff']) : null,
    );
  }
}

class CourseModel {
  final String id;
  final String name;
  final String? description;
  final int durationDays;
  final double fees;
  final bool isActive;

  CourseModel({
    required this.id,
    required this.name,
    this.description,
    required this.durationDays,
    required this.fees,
    this.isActive = true,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    return CourseModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      durationDays: int.tryParse(json['durationDays']?.toString() ?? '30') ?? 30,
      fees: double.tryParse(json['fees']?.toString() ?? '0') ?? 0.0,
      isActive: json['isActive'] != false,
    );
  }
}

class StudentModel {
  final String id;
  final String studentId;
  final String name;
  final String mobile;
  final String? whatsapp;
  final String? address;
  final String? city;
  final String? photoUrl;
  final String? courseId;
  final CourseModel? course;
  final double totalFees;
  final double advancePaid;
  final double balanceAmount;
  final String joiningDate;
  final String? endDate;
  final String status; // ACTIVE, COMPLETED, DROPPED

  StudentModel({
    required this.id,
    required this.studentId,
    required this.name,
    required this.mobile,
    this.whatsapp,
    this.address,
    this.city,
    this.photoUrl,
    this.courseId,
    this.course,
    required this.totalFees,
    this.advancePaid = 0.0,
    required this.balanceAmount,
    required this.joiningDate,
    this.endDate,
    this.status = 'ACTIVE',
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    return StudentModel(
      id: json['id']?.toString() ?? '',
      studentId: json['studentId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      mobile: json['mobile']?.toString() ?? '',
      whatsapp: json['whatsapp']?.toString(),
      address: json['address']?.toString(),
      city: json['city']?.toString(),
      photoUrl: json['photoUrl']?.toString(),
      courseId: json['courseId']?.toString(),
      course: json['course'] != null ? CourseModel.fromJson(json['course']) : null,
      totalFees: double.tryParse(json['totalFees']?.toString() ?? '0') ?? 0.0,
      advancePaid: double.tryParse(json['advancePaid']?.toString() ?? '0') ?? 0.0,
      balanceAmount: double.tryParse(json['balanceAmount']?.toString() ?? '0') ?? 0.0,
      joiningDate: json['joiningDate']?.toString() ?? '',
      endDate: json['endDate']?.toString(),
      status: json['status']?.toString() ?? 'ACTIVE',
    );
  }
}

class EnquiryModel {
  final String id;
  final String name;
  final String phone;
  final String? countryCode;
  final String? notes;
  final String? dueDate;
  final String status; // OPEN, CLOSED
  final String? createdAt;

  EnquiryModel({
    required this.id,
    required this.name,
    required this.phone,
    this.countryCode = '+91',
    this.notes,
    this.dueDate,
    this.status = 'OPEN',
    this.createdAt,
  });

  bool get isOpen => status == 'OPEN';

  factory EnquiryModel.fromJson(Map<String, dynamic> json) {
    return EnquiryModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      countryCode: json['countryCode']?.toString() ?? '+91',
      notes: json['notes']?.toString(),
      dueDate: json['dueDate']?.toString(),
      status: json['status']?.toString() ?? 'OPEN',
      createdAt: json['createdAt']?.toString(),
    );
  }
}
