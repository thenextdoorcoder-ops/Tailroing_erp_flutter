class EnquiryModel {
  final String id;
  final String name;
  final String mobile;
  final String? email;
  final String? source;
  final String status; // OPEN, CONVERTED, CLOSED
  final String? notes;
  final String? followUpDate;
  final String createdAt;

  EnquiryModel({
    required this.id,
    required this.name,
    required this.mobile,
    this.email,
    this.source,
    required this.status,
    this.notes,
    this.followUpDate,
    required this.createdAt,
  });

  factory EnquiryModel.fromJson(Map<String, dynamic> json) {
    return EnquiryModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      mobile: json['mobile']?.toString() ?? '',
      email: json['email']?.toString(),
      source: json['source']?.toString(),
      status: json['status']?.toString() ?? 'OPEN',
      notes: json['notes']?.toString(),
      followUpDate: json['followUpDate']?.toString(),
      createdAt: json['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }
}
