class MeasurementModel {
  final String id;
  final String customerId;
  final String? orderId;
  final String type; // BLOUSE, CHUDI, LADIES_PANT, KIDS, GENTS_SHIRT, GENTS_PANT
  final Map<String, dynamic> data;
  final String? fitStyle; // A_SIZE, B_TYPE, C_TYPE
  final String? notes;
  final String? createdAt;

  MeasurementModel({
    required this.id,
    required this.customerId,
    this.orderId,
    required this.type,
    required this.data,
    this.fitStyle,
    this.notes,
    this.createdAt,
  });

  factory MeasurementModel.fromJson(Map<String, dynamic> json) {
    return MeasurementModel(
      id: json['id']?.toString() ?? '',
      customerId: json['customerId']?.toString() ?? '',
      orderId: json['orderId']?.toString(),
      type: json['type']?.toString() ?? 'BLOUSE',
      data: json['data'] is Map ? Map<String, dynamic>.from(json['data']) : {},
      fitStyle: json['fitStyle']?.toString() ?? json['data']?['fitStyle']?.toString(),
      notes: json['notes']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customerId': customerId,
      'orderId': orderId,
      'type': type,
      'data': data,
      'notes': notes,
    };
  }

  // Predefined field templates per garment type
  static List<String> getFieldsForType(String type) {
    switch (type.toUpperCase()) {
      case 'BLOUSE':
        return [
          'Length',
          'Shoulder',
          'Chest / Bust',
          'Waist',
          'Front Neck Depth',
          'Back Neck Depth',
          'Sleeve Length',
          'Sleeve Round / Armhole',
          'Apex to Apex',
          'Front Cross',
        ];
      case 'CHUDI':
        return [
          'Top Length',
          'Bottom Length',
          'Chest',
          'Waist',
          'Hip',
          'Shoulder',
          'Sleeve Length',
          'Sleeve Round',
          'Front Neck',
          'Back Neck',
          'Bottom Waist',
          'Ankle Round',
        ];
      case 'GENTS_SHIRT':
        return [
          'Shirt Length',
          'Chest',
          'Shoulder',
          'Sleeve Length',
          'Collar Size',
          'Cuff / Sleeve Round',
          'Waist',
        ];
      case 'GENTS_PANT':
        return [
          'Pant Length',
          'Waist',
          'Hip',
          'Thigh Round',
          'Knee Round',
          'Bottom / Ankle Round',
          'Fork / Crotch',
        ];
      case 'LADIES_PANT':
        return [
          'Pant Length',
          'Waist',
          'Hip',
          'Thigh Round',
          'Bottom Round',
        ];
      case 'KIDS':
        return [
          'Height / Length',
          'Chest',
          'Waist',
          'Shoulder',
          'Sleeve',
        ];
      default:
        return ['Length', 'Chest', 'Waist', 'Shoulder'];
    }
  }
}
