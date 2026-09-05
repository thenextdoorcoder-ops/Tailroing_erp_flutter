class UserModel {
  final String id;
  final String? email;
  final String firstName;
  final String? lastName;
  final String role; // SUPER_ADMIN, TAILOR_ADMIN, STAFF
  final String? staffRole; // DESIGNER, CUTTING_MASTER, TAILOR, DELIVERY, etc.
  final String? shopName;
  final String? phoneNumber;
  final String? ownerId;
  final String? logoUrl;
  final String? brandLogoUrl;
  final String? appIconUrl;
  final String? signatureUrl;

  UserModel({
    required this.id,
    this.email,
    required this.firstName,
    this.lastName,
    required this.role,
    this.staffRole,
    this.shopName,
    this.phoneNumber,
    this.ownerId,
    this.logoUrl,
    this.brandLogoUrl,
    this.appIconUrl,
    this.signatureUrl,
  });

  String get fullName => '$firstName ${lastName ?? ''}'.trim();

  bool get isAdmin => role == 'TAILOR_ADMIN' || role == 'SUPER_ADMIN';
  bool get isStaff => role == 'STAFF';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString(),
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString(),
      role: json['role']?.toString() ?? 'STAFF',
      staffRole: json['staffRole']?.toString(),
      shopName: json['shopName']?.toString() ?? 'KTown Aari Works',
      phoneNumber: json['phoneNumber']?.toString(),
      ownerId: json['ownerId']?.toString(),
      logoUrl: json['logoUrl']?.toString(),
      brandLogoUrl: json['brandLogoUrl']?.toString(),
      appIconUrl: json['appIconUrl']?.toString(),
      signatureUrl: json['signatureUrl']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'role': role,
      'staffRole': staffRole,
      'shopName': shopName,
      'phoneNumber': phoneNumber,
      'ownerId': ownerId,
      'logoUrl': logoUrl,
      'brandLogoUrl': brandLogoUrl,
      'appIconUrl': appIconUrl,
      'signatureUrl': signatureUrl,
    };
  }
}
