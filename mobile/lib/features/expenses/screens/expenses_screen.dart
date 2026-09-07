import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/expense_model.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/bottom_sheet_handle.dart';
import '../../../shared/widgets/premium_snackbar.dart';

class ExpensesScreen extends ConsumerStatefulWidget {
  const ExpensesScreen({super.key});

  @override
  ConsumerState<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends ConsumerState<ExpensesScreen> {
  List<ExpenseModel> _expenses = [];
  bool _isLoading = true;
  String _selectedCategory = 'ALL';

  final List<String> _categories = [
    'ALL',
    'RENT',
    'STAFF_SALARY',
    'SUPPLIES',
    'POWER_ELECTRICITY',
    'MACHINE_MAINTENANCE',
    'TEA_SNACKS',
    'OTHER',
  ];

  @override
  void initState() {
    super.initState();
    _fetchExpenses();
  }

  Future<void> _fetchExpenses() async {
    setState(() => _isLoading = true);
    final apiClient = ref.read(apiClientProvider);
    try {
      final res = await apiClient.get(ApiEndpoints.expenses);
      if (res != null && mounted) {
        final list = res is List ? res : (res['expenses'] as List? ?? []);
        setState(() {
          _expenses = list.map((e) => ExpenseModel.fromJson(e)).toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddExpenseModal() {
    final amountController = TextEditingController();
    final notesController = TextEditingController();
    String category = 'SUPPLIES';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const BottomSheetHandle(margin: EdgeInsets.only(bottom: 14)),
              const Text('Log Shop Expense', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 14),
              CustomTextField(
                controller: amountController,
                label: 'Expense Amount (₹) *',
                keyboardType: TextInputType.number,
                autofocus: true,
              ),
              const SizedBox(height: 12),
              const Text('Expense Category *', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: category,
                items: [
                  'RENT',
                  'STAFF_SALARY',
                  'SUPPLIES',
                  'POWER_ELECTRICITY',
                  'MACHINE_MAINTENANCE',
                  'TEA_SNACKS',
                  'OTHER'
                ].map((c) {
                  return DropdownMenuItem(value: c, child: Text(c.replaceAll('_', ' ')));
                }).toList(),
                onChanged: (val) {
                  if (val != null) setModalState(() => category = val);
                },
              ),
              const SizedBox(height: 12),
              CustomTextField(
                controller: notesController,
                label: 'Description / Purpose',
                hint: 'e.g. 5 spools of golden aari zari thread from market',
                maxLines: 2,
              ),
              const SizedBox(height: 20),
              CustomButton(
                text: 'Record Expense',
                onPressed: () async {
                  final amt = double.tryParse(amountController.text) ?? 0.0;
                  if (amt <= 0) return;

                  Navigator.pop(ctx);
                  final apiClient = ref.read(apiClientProvider);
                  try {
                    await apiClient.post(ApiEndpoints.expenses, data: {
                      'amount': amt,
                      'category': category,
                      'notes': notesController.text.trim(),
                      'date': DateTime.now().toIso8601String(),
                    });
                    if (mounted) {
                      PremiumSnackbar.showSuccess(
                        context,
                        'Expense of ₹${amt.toStringAsFixed(0)} recorded successfully! ✨',
                      );
                    }
                    _fetchExpenses();
                  } catch (_) {}
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    final filtered = _selectedCategory == 'ALL'
        ? _expenses
        : _expenses.where((e) => e.category == _selectedCategory).toList();

    final totalSpent = filtered.fold(0.0, (sum, item) => sum + item.amount);

    return Scaffold(
      appBar: AppBar(title: const Text('Shop Expenses & Costs')),
      body: RefreshIndicator(
        onRefresh: _fetchExpenses,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Total Expense Summary Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Expenses Recorded', style: TextStyle(fontSize: 13, color: Colors.grey, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Text(
                      currencyFormatter.format(totalSpent),
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.error),
                    ),
                    Text('${filtered.length} expense transactions in this view', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Category Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _categories.map((cat) {
                    final isSelected = _selectedCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(cat.replaceAll('_', ' ')),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) setState(() => _selectedCategory = cat);
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),

              if (_isLoading)
                const LoadingShimmer(count: 5, height: 75)
              else if (filtered.isEmpty)
                const EmptyState(
                  icon: Icons.money_off_outlined,
                  title: 'No expenses in this category',
                  message: 'Tap the button below to log shop running expenses.',
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, i) {
                    final exp = filtered[i];
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.cardDark : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: AppColors.error.withValues(alpha: 0.1),
                            child: const Icon(Icons.receipt_outlined, color: AppColors.error, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  exp.category.replaceAll('_', ' '),
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                                ),
                                if (exp.notes != null && exp.notes!.isNotEmpty)
                                  Text(
                                    exp.notes!,
                                    style: TextStyle(fontSize: 12, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                                  ),
                                Text(
                                  exp.date.split("T").first,
                                  style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            currencyFormatter.format(exp.amount),
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.error),
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddExpenseModal,
        backgroundColor: AppColors.error,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Log Expense', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
    );
  }
}
