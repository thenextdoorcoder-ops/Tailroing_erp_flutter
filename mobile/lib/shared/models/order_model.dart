import 'customer_model.dart';

class OrderModel {
  final String id;
  final String orderId;
  final String customerId;
  final String status;
  final String deliveryOption;
  final String orderDate;
  final String dueDate;
  final double productTotal;
  final double addOnsTotal;
  final double itemTotal;
  final double deliveryCharges;
  final double gstAmount;
  final double discount;
  final double grandTotal;
  final double advancePaid;
  final double balanceDue;
  final String? orderingFor;
  final String? voiceNoteUrl;
  final String? sketchDataUrl;
  final CustomerModel? customer;
  final List<OrderItemModel> items;
  final List<OrderAddOnModel> addOns;
  final List<OrderMaterialModel> materials;
  final List<PaymentRecordModel> payments;
  final List<OrderAttachmentModel> attachments;

  OrderModel({
    required this.id,
    required this.orderId,
    required this.customerId,
    required this.status,
    required this.deliveryOption,
    required this.orderDate,
    required this.dueDate,
    this.productTotal = 0.0,
    this.addOnsTotal = 0.0,
    this.itemTotal = 0.0,
    this.deliveryCharges = 0.0,
    this.gstAmount = 0.0,
    this.discount = 0.0,
    required this.grandTotal,
    this.advancePaid = 0.0,
    required this.balanceDue,
    this.orderingFor,
    this.voiceNoteUrl,
    this.sketchDataUrl,
    this.customer,
    this.items = const [],
    this.addOns = const [],
    this.materials = const [],
    this.payments = const [],
    this.attachments = const [],
  });

  bool get isOverdue {
    if (status == 'DELIVERED' || status == 'CANCELLED') return false;
    try {
      final due = DateTime.parse(dueDate);
      return due.isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id']?.toString() ?? '',
      orderId: json['orderId']?.toString() ?? '',
      customerId: json['customerId']?.toString() ?? '',
      status: json['status']?.toString() ?? 'ORDER_CREATED',
      deliveryOption: json['deliveryOption']?.toString() ?? 'CUSTOM',
      orderDate: json['orderDate']?.toString() ?? '',
      dueDate: json['dueDate']?.toString() ?? '',
      productTotal: double.tryParse(json['productTotal']?.toString() ?? '0') ?? 0.0,
      addOnsTotal: double.tryParse(json['addOnsTotal']?.toString() ?? '0') ?? 0.0,
      itemTotal: double.tryParse(json['itemTotal']?.toString() ?? '0') ?? 0.0,
      deliveryCharges: double.tryParse(json['deliveryCharges']?.toString() ?? '0') ?? 0.0,
      gstAmount: double.tryParse(json['gstAmount']?.toString() ?? '0') ?? 0.0,
      discount: double.tryParse(json['discount']?.toString() ?? '0') ?? 0.0,
      grandTotal: double.tryParse(json['grandTotal']?.toString() ?? '0') ?? 0.0,
      advancePaid: double.tryParse(json['advancePaid']?.toString() ?? '0') ?? 0.0,
      balanceDue: double.tryParse(json['balanceDue']?.toString() ?? '0') ?? 0.0,
      orderingFor: json['orderingFor']?.toString(),
      voiceNoteUrl: json['voiceNoteUrl']?.toString(),
      sketchDataUrl: json['sketchDataUrl']?.toString(),
      customer: json['customer'] != null ? CustomerModel.fromJson(json['customer']) : null,
      items: (json['items'] as List?)?.map((e) => OrderItemModel.fromJson(e)).toList() ?? [],
      addOns: (json['addOns'] as List?)?.map((e) => OrderAddOnModel.fromJson(e)).toList() ?? [],
      materials: (json['materials'] as List?)?.map((e) => OrderMaterialModel.fromJson(e)).toList() ?? [],
      payments: (json['payments'] as List?)?.map((e) => PaymentRecordModel.fromJson(e)).toList() ?? [],
      attachments: (json['attachments'] as List?)?.map((e) => OrderAttachmentModel.fromJson(e)).toList() ?? [],
    );
  }
}

class OrderItemModel {
  final String id;
  final String? productId;
  final String? productName;
  final int quantity;
  final double rate;
  final double total;
  final String? barcode;

  OrderItemModel({
    required this.id,
    this.productId,
    this.productName,
    required this.quantity,
    required this.rate,
    required this.total,
    this.barcode,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id']?.toString() ?? '',
      productId: json['productId']?.toString(),
      productName: json['product']?['name']?.toString() ?? json['productName']?.toString() ?? 'Tailoring Item',
      quantity: int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      rate: double.tryParse(json['rate']?.toString() ?? '0') ?? 0.0,
      total: double.tryParse(json['total']?.toString() ?? '0') ?? 0.0,
      barcode: json['barcode']?.toString(),
    );
  }
}

class OrderAddOnModel {
  final String id;
  final String? addOnId;
  final String? name;
  final int quantity;
  final double price;
  final double total;

  OrderAddOnModel({
    required this.id,
    this.addOnId,
    this.name,
    required this.quantity,
    required this.price,
    required this.total,
  });

  factory OrderAddOnModel.fromJson(Map<String, dynamic> json) {
    return OrderAddOnModel(
      id: json['id']?.toString() ?? '',
      addOnId: json['addOnId']?.toString(),
      name: json['addOn']?['name']?.toString() ?? json['name']?.toString() ?? 'Add-On',
      quantity: int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      total: double.tryParse(json['total']?.toString() ?? '0') ?? 0.0,
    );
  }
}

class OrderMaterialModel {
  final String id;
  final String? itemId;
  final String? itemName;
  final double quantity;
  final double price;
  final double total;

  OrderMaterialModel({
    required this.id,
    this.itemId,
    this.itemName,
    required this.quantity,
    required this.price,
    required this.total,
  });

  factory OrderMaterialModel.fromJson(Map<String, dynamic> json) {
    return OrderMaterialModel(
      id: json['id']?.toString() ?? '',
      itemId: json['itemId']?.toString(),
      itemName: json['item']?['name']?.toString() ?? json['name']?.toString() ?? 'Material',
      quantity: double.tryParse(json['quantity']?.toString() ?? '1') ?? 1.0,
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      total: double.tryParse(json['total']?.toString() ?? '0') ?? 0.0,
    );
  }
}

class PaymentRecordModel {
  final String id;
  final double amount;
  final String paymentMethod;
  final String paymentDate;
  final String? notes;

  PaymentRecordModel({
    required this.id,
    required this.amount,
    required this.paymentMethod,
    required this.paymentDate,
    this.notes,
  });

  factory PaymentRecordModel.fromJson(Map<String, dynamic> json) {
    return PaymentRecordModel(
      id: json['id']?.toString() ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      paymentMethod: json['paymentMethod']?.toString() ?? 'CASH',
      paymentDate: json['paymentDate']?.toString() ?? '',
      notes: json['notes']?.toString(),
    );
  }
}

class OrderAttachmentModel {
  final String id;
  final String fileUrl;
  final String fileType;
  final String? fileName;
  final int? fileSize;

  OrderAttachmentModel({
    required this.id,
    required this.fileUrl,
    required this.fileType,
    this.fileName,
    this.fileSize,
  });

  factory OrderAttachmentModel.fromJson(Map<String, dynamic> json) {
    return OrderAttachmentModel(
      id: json['id']?.toString() ?? '',
      fileUrl: json['fileUrl']?.toString() ?? '',
      fileType: json['fileType']?.toString() ?? 'IMAGE',
      fileName: json['fileName']?.toString(),
      fileSize: json['fileSize'] as int?,
    );
  }
}
