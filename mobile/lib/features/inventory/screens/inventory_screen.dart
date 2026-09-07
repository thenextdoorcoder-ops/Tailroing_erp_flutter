import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/product_model.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/bottom_sheet_handle.dart';
import '../../../shared/widgets/premium_snackbar.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  List<InventoryItemModel> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchInventory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchInventory() async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final res = await apiClient.get(ApiEndpoints.items);
      if (res != null && mounted) {
        final list = res is List ? res : (res['items'] as List? ?? []);
        setState(() {
          _items = list.map((e) => InventoryItemModel.fromJson(e)).toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddItemModal() {
    final nameController = TextEditingController();
    final stockController = TextEditingController(text: '10');
    final purchaseController = TextEditingController(text: '0');
    final sellingController = TextEditingController(text: '0');
    String selectedUnit = 'Meter';

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
              const Text('Add Raw Material / Fabric', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 14),
              CustomTextField(
                controller: nameController,
                label: 'Item Name *',
                hint: 'e.g. Cotton Silk Lining Cloth, Invisible Zip, Aari Thread',
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: CustomTextField(
                      controller: stockController,
                      label: 'Initial Quantity',
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Unit of Measure', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          initialValue: selectedUnit,
                          items: ['Meter', 'Piece', 'Roll', 'Gram', 'Packet'].map((u) {
                            return DropdownMenuItem(value: u, child: Text(u));
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setModalState(() => selectedUnit = val);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: CustomTextField(
                      controller: purchaseController,
                      label: 'Purchase Cost (₹)',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CustomTextField(
                      controller: sellingController,
                      label: 'Billing Rate (₹)',
                      keyboardType: TextInputType.number,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              CustomButton(
                text: 'Save Inventory Item',
                onPressed: () async {
                  if (nameController.text.trim().isEmpty) return;

                  Navigator.pop(ctx);
                  final apiClient = ref.read(apiClientProvider);
                  try {
                    await apiClient.post(ApiEndpoints.items, data: {
                      'name': nameController.text.trim(),
                      'stockQuantity': double.tryParse(stockController.text) ?? 10.0,
                      'purchasePrice': double.tryParse(purchaseController.text) ?? 0.0,
                      'sellingPrice': double.tryParse(sellingController.text) ?? 0.0,
                    });
                    _fetchInventory();
                  } catch (_) {}
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showRestockModal(InventoryItemModel item) {
    final qtyController = TextEditingController(text: '5');
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
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
            Text('Quick Restock: ${item.name}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text('Current Stock: ${item.stockQuantity} ${item.unitSymbol ?? "units"}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 16),
            CustomTextField(
              controller: qtyController,
              label: 'Add Quantity to Stock',
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
            ),
            const SizedBox(height: 20),
            CustomButton(
              text: 'Confirm Stock Addition',
              onPressed: () async {
                final addQty = double.tryParse(qtyController.text) ?? 0.0;
                if (addQty <= 0) return;

                Navigator.pop(ctx);
                final apiClient = ref.read(apiClientProvider);
                try {
                  await apiClient.patch(
                    ApiEndpoints.itemDetail(item.id),
                    data: {'stockQuantity': item.stockQuantity + addQty},
                  );
                  _fetchInventory();
                  if (mounted) {
                    PremiumSnackbar.showSuccess(context, 'Added +$addQty to ${item.name}');
                  }
                } catch (_) {}
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    final filteredItems = _items.where((i) {
      if (_searchController.text.isNotEmpty && !i.name.toLowerCase().contains(_searchController.text.toLowerCase())) {
        return false;
      }
      return true;
    }).toList();

    final lowStockItems = filteredItems.where((i) => i.isLowStock).toList();
    final inStockItems = filteredItems.where((i) => !i.isLowStock).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Raw Materials & Inventory'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(108),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    hintText: 'Search fabrics, linings, threads, zips...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    filled: true,
                    fillColor: isDark ? AppColors.surfaceDark : Colors.grey.shade100,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  ),
                ),
              ),
              TabBar(
                controller: _tabController,
                indicatorColor: AppColors.primary,
                labelColor: AppColors.primary,
                unselectedLabelColor: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                tabs: [
                  Tab(text: 'All Items (${filteredItems.length})'),
                  Tab(text: '⚠️ Low Stock (${lowStockItems.length})'),
                  Tab(text: 'In Stock (${inStockItems.length})'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchInventory,
        child: _isLoading
            ? const LoadingShimmer(count: 6, height: 80)
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildItemList(filteredItems, isDark, currencyFormatter),
                  _buildItemList(lowStockItems, isDark, currencyFormatter),
                  _buildItemList(inStockItems, isDark, currencyFormatter),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddItemModal,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Material', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
    );
  }

  Widget _buildItemList(List<InventoryItemModel> list, bool isDark, NumberFormat currencyFormatter) {
    if (list.isEmpty) {
      return const EmptyState(
        icon: Icons.inventory_2_outlined,
        title: 'No inventory items in this view',
        message: 'Add fabrics, linings, and sewing accessories using the button below.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: list.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, i) {
        final item = list[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isDark ? AppColors.cardDark : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: item.isLowStock
                  ? AppColors.error.withValues(alpha: 0.5)
                  : (isDark ? AppColors.borderDark : AppColors.borderLight),
              width: item.isLowStock ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: item.isLowStock
                      ? AppColors.error.withValues(alpha: 0.1)
                      : AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.category_outlined,
                  color: item.isLowStock ? AppColors.error : AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    Text(
                      'Cost: ${currencyFormatter.format(item.purchasePrice)} | Billing: ${currencyFormatter.format(item.sellingPrice)}',
                      style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${item.stockQuantity} ${item.unitSymbol ?? ""}',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: item.isLowStock ? AppColors.error : AppColors.success,
                    ),
                  ),
                  if (item.isLowStock)
                    const Text(
                      'Low Stock',
                      style: TextStyle(fontSize: 10, color: AppColors.error, fontWeight: FontWeight.w700),
                    ),
                ],
              ),
              const SizedBox(width: 4),
              IconButton(
                icon: const Icon(Icons.add_circle, color: AppColors.primary),
                tooltip: 'Restock',
                onPressed: () => _showRestockModal(item),
              ),
            ],
          ),
        );
      },
    );
  }
}
