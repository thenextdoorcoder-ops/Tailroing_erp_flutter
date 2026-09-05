class CategoryModel {
  final String id;
  final String name;
  final String? measurementType;
  final String? description;
  final List<SubCategoryModel> subCategories;

  CategoryModel({
    required this.id,
    required this.name,
    this.measurementType,
    this.description,
    this.subCategories = const [],
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      measurementType: json['measurementType']?.toString(),
      description: json['description']?.toString(),
      subCategories: (json['subCategories'] as List?)
              ?.map((e) => SubCategoryModel.fromJson(e))
              .toList() ??
          [],
    );
  }
}

class SubCategoryModel {
  final String id;
  final String name;
  final String categoryId;

  SubCategoryModel({
    required this.id,
    required this.name,
    required this.categoryId,
  });

  factory SubCategoryModel.fromJson(Map<String, dynamic> json) {
    return SubCategoryModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      categoryId: json['categoryId']?.toString() ?? '',
    );
  }
}

class ProductModel {
  final String id;
  final String name;
  final String? categoryId;
  final String? categoryName;
  final String? subCategoryId;
  final double sellingPrice;
  final String? description;
  final String? barcode;

  ProductModel({
    required this.id,
    required this.name,
    this.categoryId,
    this.categoryName,
    this.subCategoryId,
    required this.sellingPrice,
    this.description,
    this.barcode,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      categoryId: json['categoryId']?.toString(),
      categoryName: json['category']?['name']?.toString(),
      subCategoryId: json['subCategoryId']?.toString(),
      sellingPrice: double.tryParse(json['sellingPrice']?.toString() ?? '0') ?? 0.0,
      description: json['description']?.toString(),
      barcode: json['barcode']?.toString(),
    );
  }
}

class AddOnModel {
  final String id;
  final String name;
  final String? categoryId;
  final double price;
  final String? description;

  AddOnModel({
    required this.id,
    required this.name,
    this.categoryId,
    required this.price,
    this.description,
  });

  factory AddOnModel.fromJson(Map<String, dynamic> json) {
    return AddOnModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      categoryId: json['categoryId']?.toString(),
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      description: json['description']?.toString(),
    );
  }
}

class InventoryItemModel {
  final String id;
  final String name;
  final String? itemId;
  final double stockQuantity;
  final double purchasePrice;
  final double sellingPrice;
  final String? unitName;
  final String? unitSymbol;

  InventoryItemModel({
    required this.id,
    required this.name,
    this.itemId,
    required this.stockQuantity,
    this.purchasePrice = 0.0,
    this.sellingPrice = 0.0,
    this.unitName,
    this.unitSymbol,
  });

  bool get isLowStock => stockQuantity <= 5.0;

  factory InventoryItemModel.fromJson(Map<String, dynamic> json) {
    return InventoryItemModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      itemId: json['itemId']?.toString(),
      stockQuantity: double.tryParse(json['stockQuantity']?.toString() ?? '0') ?? 0.0,
      purchasePrice: double.tryParse(json['purchasePrice']?.toString() ?? '0') ?? 0.0,
      sellingPrice: double.tryParse(json['sellingPrice']?.toString() ?? '0') ?? 0.0,
      unitName: json['unit']?['name']?.toString(),
      unitSymbol: json['unit']?['symbol']?.toString(),
    );
  }
}
