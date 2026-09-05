import 'user_model.dart';

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

  String get date => expenseDate;
  String? get notes => description;

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    return ExpenseModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? json['category']?.toString() ?? 'Expense',
      category: json['category']?.toString() ?? 'OTHER',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      expenseDate: json['expenseDate']?.toString() ?? json['date']?.toString() ?? DateTime.now().toIso8601String(),
      description: json['description']?.toString() ?? json['notes']?.toString(),
      staffId: json['staffId']?.toString(),
      staff: json['staff'] != null ? UserModel.fromJson(json['staff']) : null,
    );
  }
}
