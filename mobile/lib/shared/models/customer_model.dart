class CustomerModel {
  final String id;
  final String name;
  final String mobile;
  final String? whatsapp;
  final String? alternativeMobile;
  final String? countryCode;
  final String? address;
  final String? city;
  final String? email;
  final String? dob;
  final String? profession;
  final String? preferredStyle;
  final String? specialOccasion;
  final bool faceAdded;
  final int? ordersCount;
  final double? totalSpent;
  final String? createdAt;

  CustomerModel({
    required this.id,
    required this.name,
    required this.mobile,
    this.whatsapp,
    this.alternativeMobile,
    this.countryCode = '+91',
    this.address,
    this.city,
    this.email,
    this.dob,
    this.profession,
    this.preferredStyle,
    this.specialOccasion,
    this.faceAdded = false,
    this.ordersCount,
    this.totalSpent,
    this.createdAt,
  });

  String get initials {
    if (name.isEmpty) return 'C';
    final parts = name.trim().split(' ');
    if (parts.length > 1) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length >= 2 ? 2 : 1).toUpperCase();
  }

  factory CustomerModel.fromJson(Map<String, dynamic> json) {
    return CustomerModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      mobile: json['mobile']?.toString() ?? '',
      whatsapp: json['whatsapp']?.toString(),
      alternativeMobile: json['alternativeMobile']?.toString(),
      countryCode: json['countryCode']?.toString() ?? '+91',
      address: json['address']?.toString(),
      city: json['city']?.toString(),
      email: json['email']?.toString(),
      dob: json['dob']?.toString(),
      profession: json['profession']?.toString(),
      preferredStyle: json['preferredStyle']?.toString(),
      specialOccasion: json['specialOccasion']?.toString(),
      faceAdded: json['faceAdded'] == true,
      ordersCount: json['_count']?['orders'] ?? json['ordersCount'] as int?,
      totalSpent: json['totalSpent'] != null ? double.tryParse(json['totalSpent'].toString()) : null,
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'mobile': mobile,
      'whatsapp': whatsapp,
      'alternativeMobile': alternativeMobile,
      'countryCode': countryCode,
      'address': address,
      'city': city,
      'email': email,
      'dob': dob,
      'profession': profession,
      'preferredStyle': preferredStyle,
      'specialOccasion': specialOccasion,
      'faceAdded': faceAdded,
    };
  }
}
