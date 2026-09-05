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

  String get duration => '$durationDays Days';

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
  final String? studentId;
  final String name;
  final String mobile;
  final String? whatsapp;
  final String? address;
  final String? city;
  final String? courseId;
  final String? batchTiming;
  final String? joinDate;
  final double totalFees;
  final double feesPaid;
  final String status;
  final CourseModel? course;

  StudentModel({
    required this.id,
    this.studentId,
    required this.name,
    required this.mobile,
    this.whatsapp,
    this.address,
    this.city,
    this.courseId,
    this.batchTiming,
    this.joinDate,
    required this.totalFees,
    required this.feesPaid,
    this.status = 'ACTIVE',
    this.course,
  });

  double get balanceFee => (totalFees - feesPaid).clamp(0.0, double.infinity);

  factory StudentModel.fromJson(Map<String, dynamic> json) {
    return StudentModel(
      id: json['id']?.toString() ?? '',
      studentId: json['studentId']?.toString(),
      name: json['name']?.toString() ?? '',
      mobile: json['mobile']?.toString() ?? '',
      whatsapp: json['whatsapp']?.toString(),
      address: json['address']?.toString(),
      city: json['city']?.toString(),
      courseId: json['courseId']?.toString(),
      batchTiming: json['batchTiming']?.toString(),
      joinDate: json['joinDate']?.toString(),
      totalFees: double.tryParse(json['totalFees']?.toString() ?? '0') ?? 0.0,
      feesPaid: double.tryParse(json['feesPaid']?.toString() ?? '0') ?? 0.0,
      status: json['status']?.toString() ?? 'ACTIVE',
      course: json['course'] != null ? CourseModel.fromJson(json['course']) : null,
    );
  }
}
