import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/haptic_service.dart';
import '../../../shared/models/product_model.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/bottom_sheet_handle.dart';
import '../../../shared/widgets/premium_snackbar.dart';

class ServicesPricingScreen extends ConsumerStatefulWidget {
  const ServicesPricingScreen({super.key});

  @override
  ConsumerState<ServicesPricingScreen> createState() => _ServicesPricingScreenState();
}

class _ServicesPricingScreenState extends ConsumerState<ServicesPricingScreen> {
  bool _isLoading = true;
  List<ProductModel> _allProducts = [];
  List<CategoryModel> _categories = [];
  String _selectedCategoryId = 'ALL';
  String _searchQuery = '';
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final apiClient = ref.read(apiClientProvider);

    try {
      // 1. Fetch Categories
      final catRes = await apiClient.get(ApiEndpoints.categories);
      if (catRes != null) {
        final list = catRes is List ? catRes : (catRes['categories'] as List? ?? []);
        _categories = list.map((e) => CategoryModel.fromJson(e)).toList();
      }

      // 2. Fetch All Products
      final prodRes = await apiClient.get(ApiEndpoints.products);
      if (prodRes != null) {
        final list = prodRes is List ? prodRes : (prodRes['products'] as List? ?? []);
        _allProducts = list.map((e) => ProductModel.fromJson(e)).toList();
      }
    } catch (e) {
      if (mounted) {
        PremiumSnackbar.showError(context, 'Failed to load services: $e');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<ProductModel> get _filteredProducts {
    return _allProducts.where((p) {
      final matchesCategory = _selectedCategoryId == 'ALL' || p.categoryId == _selectedCategoryId;
      final matchesSearch = _searchQuery.isEmpty ||
          p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (p.categoryName?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
      return matchesCategory && matchesSearch;
    }).toList();
  }

  void _showAddEditServiceDialog({ProductModel? product}) {
    final isEditing = product != null;
    final nameCtrl = TextEditingController(text: product?.name ?? '');
    final priceCtrl = TextEditingController(
      text: product != null ? product.sellingPrice.toStringAsFixed(0) : '',
    );
    final descCtrl = TextEditingController(text: product?.description ?? '');
    String? chosenCategoryId = product?.categoryId ?? (_categories.isNotEmpty ? _categories.first.id : null);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (sheetCtx, setSheetState) {
          final isDark = Theme.of(context).brightness == Brightness.dark;

          return Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              top: 20,
              left: 20,
              right: 20,
            ),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const BottomSheetHandle(margin: EdgeInsets.only(bottom: 16)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isEditing ? 'Edit Garment / Service' : 'Add New Tailoring Service',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Service Name
                  CustomTextField(
                    controller: nameCtrl,
                    label: 'Service Name',
                    hint: 'e.g. Lining Blouse, Straight Pant, Anarkali',
                    prefixIcon: const Icon(Icons.checkroom_rounded, size: 20),
                  ),
                  const SizedBox(height: 14),

                  // Category Dropdown
                  if (_categories.isNotEmpty) ...[
                    DropdownButtonFormField<String>(
                      initialValue: chosenCategoryId,
                      decoration: const InputDecoration(
                        labelText: 'Garment Category',
                        prefixIcon: Icon(Icons.category_outlined, size: 20),
                      ),
                      items: _categories.map((c) {
                        return DropdownMenuItem(value: c.id, child: Text(c.name));
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setSheetState(() => chosenCategoryId = val);
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Selling / Stitching Price
                  CustomTextField(
                    controller: priceCtrl,
                    label: 'Standard Stitching Price (₹)',
                    hint: '0',
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    prefixIcon: const Icon(Icons.currency_rupee_rounded, size: 20),
                  ),
                  const SizedBox(height: 14),

                  // Description
                  CustomTextField(
                    controller: descCtrl,
                    label: 'Description / Notes (Optional)',
                    hint: 'e.g. Includes standard lining and finishing',
                    maxLines: 2,
                  ),
                  const SizedBox(height: 22),

                  // Save Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () async {
                        final name = nameCtrl.text.trim();
                        final price = double.tryParse(priceCtrl.text.trim()) ?? 0.0;
                        final desc = descCtrl.text.trim();

                        if (name.isEmpty) {
                          PremiumSnackbar.showWarning(context, 'Please enter service name');
                          return;
                        }

                        if (chosenCategoryId == null) {
                          PremiumSnackbar.showWarning(context, 'Please select a garment category');
                          return;
                        }

                        Navigator.pop(ctx);
                        HapticService.lightTap();
                        await _saveService(
                          id: product?.id,
                          name: name,
                          categoryId: chosenCategoryId!,
                          sellingPrice: price,
                          description: desc.isNotEmpty ? desc : null,
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        isEditing ? 'Save Changes' : 'Create Service',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _saveService({
    String? id,
    required String name,
    required String categoryId,
    required double sellingPrice,
    String? description,
  }) async {
    final apiClient = ref.read(apiClientProvider);
    final isEditing = id != null;

    try {
      if (isEditing) {
        await apiClient.put(
          ApiEndpoints.productDetail(id),
          data: {
            'name': name,
            'categoryId': categoryId,
            'sellingPrice': sellingPrice,
            'description': description,
          },
        );
        if (mounted) {
          PremiumSnackbar.showSuccess(context, '"$name" updated successfully!');
        }
      } else {
        await apiClient.post(
          ApiEndpoints.products,
          data: {
            'name': name,
            'categoryId': categoryId,
            'sellingPrice': sellingPrice,
            'description': description,
          },
        );
        if (mounted) {
          PremiumSnackbar.showSuccess(context, '"$name" added to services catalog! 🎉');
        }
      }
      _loadData();
    } catch (e) {
      if (mounted) {
        PremiumSnackbar.showError(context, 'Failed to save service: $e');
      }
    }
  }

  Future<void> _deleteService(ProductModel product) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Service?'),
        content: Text('Are you sure you want to remove "${product.name}" from the services catalog?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    final apiClient = ref.read(apiClientProvider);
    try {
      await apiClient.delete(ApiEndpoints.productDetail(product.id));
      if (mounted) {
        PremiumSnackbar.showSuccess(context, 'Service "${product.name}" removed');
      }
      _loadData();
    } catch (e) {
      if (mounted) {
        PremiumSnackbar.showError(context, 'Failed to delete service: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text('Services & Garment Pricing'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const SingleChildScrollView(
              padding: EdgeInsets.all(16),
              child: Column(
                children: [
                  LoadingShimmer(count: 1, height: 95),
                  SizedBox(height: 14),
                  LoadingShimmer(count: 6, height: 75),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadData,
              child: Column(
                children: [
                  // Top Search and Category Filter Bar
                  Container(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    color: isDark ? AppColors.surfaceDark : Colors.white,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Search bar
                        TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Search services (e.g. Blouse, Pant, Salwar)...',
                            prefixIcon: const Icon(Icons.search_rounded, size: 20),
                            suffixIcon: _searchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, size: 18),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _searchQuery = '');
                                    },
                                  )
                                : null,
                            filled: true,
                            fillColor: isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          ),
                          onChanged: (val) => setState(() => _searchQuery = val.trim()),
                        ),
                        const SizedBox(height: 12),

                        // Category Filter Chips
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          child: Row(
                            children: [
                              _buildCategoryChip('ALL', 'All Garments (${_allProducts.length})', isDark),
                              ..._categories.map((c) {
                                final count = _allProducts.where((p) => p.categoryId == c.id).length;
                                return _buildCategoryChip(c.id, '${c.name} ($count)', isDark);
                              }),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Header Info Count
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${_filteredProducts.length} Services Listed',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                        Text(
                          'Tap pencil to update price',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Products List
                  Expanded(
                    child: _filteredProducts.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.checkroom_rounded, size: 64, color: Colors.grey.shade400),
                                const SizedBox(height: 12),
                                const Text(
                                  'No services found',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Add your shop\'s tailoring services and prices.',
                                  style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  onPressed: () => _showAddEditServiceDialog(),
                                  icon: const Icon(Icons.add_rounded),
                                  label: const Text('Add Service Now'),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 6, 16, 80),
                            itemCount: _filteredProducts.length,
                            itemBuilder: (ctx, index) {
                              final product = _filteredProducts[index];
                              return _buildProductCard(product, isDark, currencyFormatter);
                            },
                          ),
                  ),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddEditServiceDialog(),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Service', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildCategoryChip(String id, String label, bool isDark) {
    final isSelected = _selectedCategoryId == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () {
          HapticService.selectionClick();
          setState(() => _selectedCategoryId = id);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary
                : (isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9)),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected
                  ? AppColors.primary
                  : (isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              color: isSelected
                  ? Colors.white
                  : (isDark ? Colors.white70 : AppColors.textPrimaryLight),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProductCard(ProductModel product, bool isDark, NumberFormat currency) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Garment Icon Badge
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.10),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.checkroom_rounded, color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: 12),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        product.name,
                        style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                if (product.categoryName != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      product.categoryName!,
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.accent),
                    ),
                  ),
                  const SizedBox(height: 2),
                ],
                if (product.description != null && product.description!.isNotEmpty)
                  Text(
                    product.description!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Price Tag & Edit Button
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                currency.format(product.sellingPrice),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  InkWell(
                    onTap: () {
                      HapticService.lightTap();
                      _showAddEditServiceDialog(product: product);
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.edit_outlined, size: 16, color: AppColors.primary),
                    ),
                  ),
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: () {
                      HapticService.lightTap();
                      _deleteService(product);
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.delete_outline_rounded, size: 16, color: AppColors.error),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
