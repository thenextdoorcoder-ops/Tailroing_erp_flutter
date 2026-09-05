import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/haptic_service.dart';
import '../../../shared/models/customer_model.dart';
import '../../../shared/models/product_model.dart';
import '../../../shared/models/measurement_model.dart';
import '../../../shared/models/user_model.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/sketch_pad_modal.dart';
import '../../measurements/widgets/measurement_history_modal.dart';
import '../providers/order_provider.dart';

class NewOrderWizardScreen extends ConsumerStatefulWidget {
  final String? preselectedCustomerId;

  const NewOrderWizardScreen({super.key, this.preselectedCustomerId});

  @override
  ConsumerState<NewOrderWizardScreen> createState() => _NewOrderWizardScreenState();
}

class _NewOrderWizardScreenState extends ConsumerState<NewOrderWizardScreen> {
  int _currentStep = 0;
  bool _isSubmitting = false;

  // Step 1: Customer & Referral & Attender
  CustomerModel? _selectedCustomer;
  String _orderingFor = 'Self';
  final TextEditingController _customOrderingForController = TextEditingController();
  List<CustomerModel> _customersList = [];
  List<UserModel> _staffList = [];
  UserModel? _selectedAttender;
  List<MeasurementModel> _customerMeasurements = [];

  // Step 2: Measurements
  MeasurementModel? _selectedExistingMeasurement;
  bool _isTakingNewMeasurement = false;
  String _newMeasurementType = 'BLOUSE';
  String _newMeasurementFitStyle = 'B_TYPE';
  final Map<String, TextEditingController> _measurementControllers = {};
  String? _measurementId;

  // Step 3: Products & Materials
  List<CategoryModel> _categories = [];
  CategoryModel? _selectedCategory;
  List<ProductModel> _availableProducts = [];
  final Map<String, int> _selectedProductQuantities = {};
  final Map<String, double> _productRates = {};
  List<AddOnModel> _availableAddOns = [];
  final Map<String, int> _selectedAddOnQuantities = {};
  List<InventoryItemModel> _availableMaterials = [];
  final Map<String, double> _selectedMaterialQuantities = {};

  // Step 4: Design Sketch & Attachments
  String? _sketchBase64;
  final List<String> _attachedImagePaths = [];

  // Step 5: Schedule & Financials
  DateTime _selectedDueDate = DateTime.now().add(const Duration(days: 7));
  String _deliveryOption = 'CUSTOM';
  final TextEditingController _deliveryChargesController = TextEditingController(text: '0');
  final TextEditingController _advancePaidController = TextEditingController(text: '500');
  final TextEditingController _discountController = TextEditingController(text: '0');
  final TextEditingController _notesController = TextEditingController();

  final List<String> _orderingForOptions = ['Self', 'Daughter', 'Sister', 'Mother', 'Friend', 'Other'];

  @override
  void initState() {
    super.initState();
    _initMeasurementFields(_newMeasurementType);
    _fetchInitialData();
  }

  @override
  void dispose() {
    _customOrderingForController.dispose();
    _deliveryChargesController.dispose();
    _advancePaidController.dispose();
    _discountController.dispose();
    _notesController.dispose();
    for (var c in _measurementControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _initMeasurementFields(String type) {
    for (var c in _measurementControllers.values) {
      c.dispose();
    }
    _measurementControllers.clear();
    final fields = MeasurementModel.getFieldsForType(type);
    for (var f in fields) {
      _measurementControllers[f] = TextEditingController();
    }
  }

  Future<void> _fetchInitialData() async {
    final apiClient = ref.read(apiClientProvider);
    try {
      // 1. Fetch Customers
      final custRes = await apiClient.get(ApiEndpoints.customers);
      if (custRes != null) {
        final list = custRes is List ? custRes : (custRes['customers'] as List? ?? []);
        setState(() {
          _customersList = list.map((e) => CustomerModel.fromJson(e)).toList();
          if (widget.preselectedCustomerId != null) {
            _selectedCustomer = _customersList.firstWhere(
              (c) => c.id == widget.preselectedCustomerId,
              orElse: () => _customersList.first,
            );
            _fetchCustomerMeasurements(_selectedCustomer!.id);
          }
        });
      }

      // 2. Fetch Categories
      final catRes = await apiClient.get(ApiEndpoints.categories);
      if (catRes != null) {
        final list = catRes is List ? catRes : (catRes['categories'] as List? ?? []);
        setState(() {
          _categories = list.map((e) => CategoryModel.fromJson(e)).toList();
          if (_categories.isNotEmpty) {
            _selectedCategory = _categories.first;
            _fetchProductsForCategory(_categories.first.id);
          }
        });
      }

      // 3. Fetch Add-Ons
      final addOnRes = await apiClient.get(ApiEndpoints.addOns);
      if (addOnRes != null) {
        final list = addOnRes is List ? addOnRes : (addOnRes['addOns'] as List? ?? []);
        setState(() {
          _availableAddOns = list.map((e) => AddOnModel.fromJson(e)).toList();
        });
      }

      // 4. Fetch Raw Materials
      final matRes = await apiClient.get(ApiEndpoints.items);
      if (matRes != null) {
        final list = matRes is List ? matRes : (matRes['items'] as List? ?? []);
        setState(() {
          _availableMaterials = list.map((e) => InventoryItemModel.fromJson(e)).toList();
        });
      }

      // 5. Fetch Staff for Attender Selection
      final staffRes = await apiClient.get(ApiEndpoints.staff);
      if (staffRes != null) {
        final list = staffRes is List ? staffRes : (staffRes['staff'] as List? ?? []);
        setState(() {
          _staffList = list.map((e) => UserModel.fromJson(e)).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchCustomerMeasurements(String customerId) async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final res = await apiClient.get(ApiEndpoints.customerMeasurements(customerId));
      if (res != null) {
        final list = res is List ? res : (res['measurements'] as List? ?? []);
        setState(() {
          _customerMeasurements = list.map((e) => MeasurementModel.fromJson(e)).toList();
          if (_customerMeasurements.isNotEmpty) {
            _selectedExistingMeasurement = _customerMeasurements.first;
            _measurementId = _selectedExistingMeasurement!.id;
          } else {
            _isTakingNewMeasurement = true;
          }
        });
      }
    } catch (_) {}
  }

  void _showCustomerSearchPicker() {
    final searchCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            final query = searchCtrl.text.toLowerCase().trim();
            final filtered = _customersList.where((c) {
              if (query.isEmpty) return true;
              return c.name.toLowerCase().contains(query) ||
                  c.mobile.contains(query) ||
                  (c.city?.toLowerCase().contains(query) ?? false);
            }).toList();

            final isDark = Theme.of(context).brightness == Brightness.dark;

            return Container(
              height: MediaQuery.of(context).size.height * 0.78,
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Handle bar
                  Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade400,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),

                  // Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Select Customer',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                        TextButton.icon(
                          onPressed: () {
                            Navigator.pop(ctx);
                            _showQuickCreateCustomerSheet();
                          },
                          icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
                          label: const Text('+ New Client', style: TextStyle(fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ),

                  // Search field
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    child: TextField(
                      controller: searchCtrl,
                      autofocus: true,
                      decoration: InputDecoration(
                        hintText: 'Search by Name or Mobile Phone...',
                        prefixIcon: const Icon(Icons.search_rounded),
                        suffixIcon: searchCtrl.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded),
                                onPressed: () {
                                  searchCtrl.clear();
                                  setModalState(() {});
                                },
                              )
                            : null,
                        filled: true,
                        fillColor: isDark ? AppColors.cardDark : Colors.grey.shade100,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onChanged: (val) => setModalState(() {}),
                    ),
                  ),

                  const SizedBox(height: 8),

                  // List of filtered customers
                  Expanded(
                    child: filtered.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.person_search_outlined, size: 48, color: Colors.grey),
                                  const SizedBox(height: 12),
                                  Text(
                                    searchCtrl.text.isNotEmpty
                                        ? 'No client found matching "${searchCtrl.text}"'
                                        : 'No clients available',
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      _showQuickCreateCustomerSheet(initialName: searchCtrl.text);
                                    },
                                    icon: const Icon(Icons.add),
                                    label: const Text('Add This Customer Now'),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: filtered.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (itemCtx, i) {
                              final cust = filtered[i];
                              final isSelected = _selectedCustomer?.id == cust.id;

                              return InkWell(
                                onTap: () {
                                  HapticService.lightTap();
                                  setState(() {
                                    _selectedCustomer = cust;
                                    _fetchCustomerMeasurements(cust.id);
                                  });
                                  Navigator.pop(ctx);
                                },
                                borderRadius: BorderRadius.circular(14),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primary.withValues(alpha: 0.12)
                                        : (isDark ? AppColors.cardDark : Colors.grey.shade50),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: isSelected
                                          ? AppColors.primary
                                          : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                      width: isSelected ? 1.5 : 1,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                                        child: Text(
                                          cust.initials,
                                          style: TextStyle(
                                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              cust.name,
                                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              cust.mobile,
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                              ),
                                            ),
                                            if (cust.city != null && cust.city!.isNotEmpty)
                                              Text(
                                                cust.city!,
                                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                                              ),
                                          ],
                                        ),
                                      ),
                                      if (isSelected)
                                        const Icon(Icons.check_circle_rounded, color: AppColors.primary),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showQuickCreateCustomerSheet({String? initialName}) {
    final nameCtrl = TextEditingController(text: initialName ?? '');
    final mobileCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            final isDark = Theme.of(context).brightness == Brightness.dark;

            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                ),
                child: Form(
                  key: formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Handle bar
                        Center(
                          child: Container(
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade400,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Title
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.person_add_alt_1_rounded, color: AppColors.primaryLight, size: 20),
                            ),
                            const SizedBox(width: 12),
                            const Text(
                              'Quick Add New Client',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        // Name field
                        TextFormField(
                          controller: nameCtrl,
                          autofocus: true,
                          decoration: const InputDecoration(
                            labelText: 'Customer Full Name *',
                            prefixIcon: Icon(Icons.person_outline),
                          ),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter customer name' : null,
                        ),
                        const SizedBox(height: 14),

                        // Mobile field
                        TextFormField(
                          controller: mobileCtrl,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Mobile Number *',
                            prefixIcon: Icon(Icons.phone_outlined),
                          ),
                          validator: (v) => (v == null || v.trim().length < 10) ? 'Enter valid 10-digit mobile number' : null,
                        ),
                        const SizedBox(height: 14),

                        // City field
                        TextFormField(
                          controller: cityCtrl,
                          decoration: const InputDecoration(
                            labelText: 'City / Area (Optional)',
                            prefixIcon: Icon(Icons.location_city_outlined),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Address field
                        TextFormField(
                          controller: addressCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Address (Optional)',
                            prefixIcon: Icon(Icons.home_outlined),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Save button
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: isSaving
                                ? null
                                : () async {
                                    if (!formKey.currentState!.validate()) return;
                                    setModalState(() => isSaving = true);

                                    final trimmedMobile = mobileCtrl.text.trim();
                                    final cleanDigits = trimmedMobile.replaceAll(RegExp(r'\D'), '');

                                    // 1. Check local list first
                                    final localMatch = _customersList.where((c) {
                                      final cDigits = c.mobile.replaceAll(RegExp(r'\D'), '');
                                      return cDigits.isNotEmpty && (cDigits == cleanDigits || c.mobile == trimmedMobile);
                                    }).firstOrNull;

                                    if (localMatch != null) {
                                      HapticService.mediumImpact();
                                      setState(() {
                                        _selectedCustomer = localMatch;
                                        _fetchCustomerMeasurements(localMatch.id);
                                      });
                                      if (modalCtx.mounted) {
                                        Navigator.pop(modalCtx);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Found existing client "${localMatch.name}" — selected! ✨'),
                                            backgroundColor: AppColors.success,
                                          ),
                                        );
                                      }
                                      return;
                                    }

                                    try {
                                      final apiClient = ref.read(apiClientProvider);
                                      final payload = {
                                        'name': nameCtrl.text.trim(),
                                        'mobile': trimmedMobile,
                                        'city': cityCtrl.text.trim().isNotEmpty ? cityCtrl.text.trim() : null,
                                        'address': addressCtrl.text.trim().isNotEmpty ? addressCtrl.text.trim() : null,
                                      };

                                      final response = await apiClient.post(ApiEndpoints.customers, data: payload);
                                      if (response != null && response is Map<String, dynamic>) {
                                        final newCust = CustomerModel.fromJson(response);
                                        HapticService.mediumImpact();

                                        setState(() {
                                          _customersList.insert(0, newCust);
                                          _selectedCustomer = newCust;
                                          _fetchCustomerMeasurements(newCust.id);
                                        });

                                        if (modalCtx.mounted) {
                                          Navigator.pop(modalCtx);
                                        }
                                        if (mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text('Client "${newCust.name}" added and selected! ✨'),
                                              backgroundColor: AppColors.success,
                                            ),
                                          );
                                        }
                                      }
                                    } catch (e) {
                                      // If customer already exists on server, fetch and auto-select
                                      if (e.toString().contains('already exists')) {
                                        try {
                                          final apiClient = ref.read(apiClientProvider);
                                          final refreshRes = await apiClient.get(ApiEndpoints.customers);
                                          if (refreshRes != null) {
                                            final list = refreshRes is List ? refreshRes : (refreshRes['customers'] as List? ?? []);
                                            final updatedList = list.map((item) => CustomerModel.fromJson(item)).toList();
                                            final matched = updatedList.where((c) {
                                              final cDigits = c.mobile.replaceAll(RegExp(r'\D'), '');
                                              return cDigits.isNotEmpty && (cDigits == cleanDigits || c.mobile == trimmedMobile);
                                            }).firstOrNull;

                                            if (matched != null) {
                                              HapticService.mediumImpact();
                                              setState(() {
                                                _customersList = updatedList;
                                                _selectedCustomer = matched;
                                                _fetchCustomerMeasurements(matched.id);
                                              });

                                              if (modalCtx.mounted) {
                                                Navigator.pop(modalCtx);
                                              }
                                              if (mounted) {
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  SnackBar(
                                                    content: Text('Client "${matched.name}" already exists & was selected! ✨'),
                                                    backgroundColor: AppColors.success,
                                                  ),
                                                );
                                              }
                                              return;
                                            }
                                          }
                                        } catch (_) {}
                                      }

                                      setModalState(() => isSaving = false);
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Failed to create customer: $e'),
                                            backgroundColor: AppColors.error,
                                          ),
                                        );
                                      }
                                    }
                                  },
                            child: isSaving
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  )
                                : const Text('Save & Select Client', style: TextStyle(fontWeight: FontWeight.w800)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _fetchProductsForCategory(String categoryId) async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final res = await apiClient.get(
        ApiEndpoints.products,
        queryParameters: {'categoryId': categoryId},
      );
      if (res != null) {
        final list = res is List ? res : (res['products'] as List? ?? []);
        setState(() {
          _availableProducts = list.map((e) => ProductModel.fromJson(e)).toList();
          for (var p in _availableProducts) {
            _productRates[p.id] = p.sellingPrice;
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (image != null) {
      setState(() {
        _attachedImagePaths.add(image.path);
      });
    }
  }

  double get _productTotal {
    double total = 0.0;
    _selectedProductQuantities.forEach((prodId, qty) {
      final rate = _productRates[prodId] ?? 0.0;
      total += rate * qty;
    });
    return total;
  }

  double get _addOnsTotal {
    double total = 0.0;
    _selectedAddOnQuantities.forEach((addOnId, qty) {
      final addOn = _availableAddOns.firstWhere(
        (a) => a.id == addOnId,
        orElse: () => AddOnModel(id: '', name: '', price: 0.0),
      );
      total += addOn.price * qty;
    });
    return total;
  }

  double get _materialsTotal {
    double total = 0.0;
    _selectedMaterialQuantities.forEach((matId, qty) {
      final item = _availableMaterials.firstWhere(
        (m) => m.id == matId,
        orElse: () => InventoryItemModel(id: '', name: '', stockQuantity: 0),
      );
      total += item.sellingPrice * qty;
    });
    return total;
  }

  double get _deliveryCharges => double.tryParse(_deliveryChargesController.text) ?? 0.0;
  double get _discount => double.tryParse(_discountController.text) ?? 0.0;
  double get _advancePaid => double.tryParse(_advancePaidController.text) ?? 0.0;
  double get _grandTotal => (_productTotal + _addOnsTotal + _materialsTotal + _deliveryCharges - _discount).clamp(0.0, double.infinity);
  double get _balanceDue => (_grandTotal - _advancePaid).clamp(0.0, double.infinity);

  Future<void> _submitOrder() async {
    if (_selectedCustomer == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a customer first')),
      );
      return;
    }

    if (_selectedProductQuantities.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one tailoring item/service')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    final apiClient = ref.read(apiClientProvider);

    try {
      // 1. If user recorded a new measurement on the spot, save it first to get measurementId
      if (_isTakingNewMeasurement) {
        final dataMap = <String, dynamic>{
          'fitStyle': _newMeasurementFitStyle,
        };
        _measurementControllers.forEach((key, controller) {
          if (controller.text.isNotEmpty) {
            dataMap[key] = controller.text.trim();
          }
        });

        final measRes = await apiClient.post(ApiEndpoints.measurements, data: {
          'customerId': _selectedCustomer!.id,
          'type': _newMeasurementType,
          'data': dataMap,
          'notes': 'Recorded during order creation',
        });

        if (measRes != null && measRes['id'] != null) {
          _measurementId = measRes['id'].toString();
        }
      }

      // 2. Prepare Order Items
      final items = _selectedProductQuantities.entries.map((e) {
        return {
          'productId': e.key,
          'quantity': e.value,
          'rate': _productRates[e.key] ?? 0.0,
          'total': (_productRates[e.key] ?? 0.0) * e.value,
        };
      }).toList();

      // 3. Prepare Add-Ons
      final addOns = _selectedAddOnQuantities.entries.map((e) {
        final addon = _availableAddOns.firstWhere((a) => a.id == e.key);
        return {
          'addOnId': e.key,
          'quantity': e.value,
          'rate': addon.price,
          'total': addon.price * e.value,
        };
      }).toList();

      // 4. Prepare Materials
      final materials = _selectedMaterialQuantities.entries.map((e) {
        final mat = _availableMaterials.firstWhere((m) => m.id == e.key);
        return {
          'itemId': e.key,
          'quantity': e.value,
          'price': mat.sellingPrice,
          'total': mat.sellingPrice * e.value,
        };
      }).toList();

      final orderingForText = _orderingFor == 'Other'
          ? _customOrderingForController.text.trim()
          : _orderingFor;

      final payload = {
        'customerId': _selectedCustomer!.id,
        'orderingFor': orderingForText.isNotEmpty ? orderingForText : 'Self',
        'attenderId': _selectedAttender?.id,
        'measurementId': _measurementId,
        'sketchDataUrl': _sketchBase64,
        'dueDate': _selectedDueDate.toIso8601String(),
        'deliveryOption': _deliveryOption,
        'deliveryCharges': _deliveryCharges,
        'discount': _discount,
        'advancePaid': _advancePaid,
        'notes': _notesController.text.trim(),
        'items': items,
        'addOns': addOns,
        'materials': materials,
      };

      await apiClient.post(ApiEndpoints.orders, data: payload);
      await ref.read(ordersListProvider.notifier).loadOrders();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🎉 Tailoring Order created successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create order: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final steps = [
      {'title': 'Client', 'icon': Icons.person_rounded},
      {'title': 'Measures', 'icon': Icons.straighten_rounded},
      {'title': 'Services', 'icon': Icons.checkroom_rounded},
      {'title': 'Design', 'icon': Icons.draw_rounded},
      {'title': 'Payment', 'icon': Icons.receipt_long_rounded},
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text('Create Tailoring Order'),
        elevation: 0,
        backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: Column(
              children: [
                // 1. Top Horizontal Luxury Stepper Bar
                _buildTopStepper(steps, isDark),

                // 2. Active Step Content inside Elevated Studio Card
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.cardDark : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF263238).withValues(alpha: isDark ? 0.25 : 0.04),
                            blurRadius: 14,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: _buildCurrentStepContent(isDark, currencyFormatter),
                    ),
                  ),
                ),

                // 3. Bottom Sticky Action Dock
                _buildBottomActionDock(isDark, currencyFormatter),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────── Top Horizontal Stepper Bar ───────────────
  Widget _buildTopStepper(List<Map<String, dynamic>> steps, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 0.8,
          ),
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(steps.length, (i) {
              final step = steps[i];
              final isActive = _currentStep == i;
              final isDone = _currentStep > i;

              Color iconBg;
              Color iconColor;
              if (isActive) {
                iconBg = AppColors.primary;
                iconColor = Colors.white;
              } else if (isDone) {
                iconBg = AppColors.accent.withValues(alpha: 0.15);
                iconColor = AppColors.accent;
              } else {
                iconBg = isDark ? const Color(0xFF1E273D) : const Color(0xFFF0F3F8);
                iconColor = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
              }

              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    if (isDone || i <= _currentStep) {
                      HapticService.lightTap();
                      setState(() => _currentStep = i);
                    }
                  },
                  child: Column(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: iconBg,
                          shape: BoxShape.circle,
                          boxShadow: isActive
                              ? [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(alpha: 0.30),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                        ),
                        child: Icon(
                          isDone ? Icons.check_rounded : (step['icon'] as IconData),
                          color: iconColor,
                          size: 18,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        step['title'] as String,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isActive ? FontWeight.w800 : FontWeight.w500,
                          color: isActive
                              ? AppColors.primary
                              : (isDone
                                  ? (isDark ? Colors.white : AppColors.textPrimaryLight)
                                  : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          // Animated progress line
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (_currentStep + 1) / steps.length,
              backgroundColor: isDark ? const Color(0xFF1E273D) : const Color(0xFFEAEEF5),
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
              minHeight: 3,
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────── Step Content Router ───────────────
  Widget _buildCurrentStepContent(bool isDark, NumberFormat currency) {
    switch (_currentStep) {
      case 0:
        return _buildStep1Customer(isDark);
      case 1:
        return _buildStep2Measurements(isDark);
      case 2:
        return _buildStep3Products(isDark, currency);
      case 3:
        return _buildStep4Design(isDark);
      case 4:
        return _buildStep5Financials(isDark, currency);
      default:
        return const SizedBox.shrink();
    }
  }

  // ─────────────── Step 1: Customer & Ordering For ───────────────
  Widget _buildStep1Customer(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.person_outline_rounded, color: AppColors.primary, size: 18),
            ),
            const SizedBox(width: 10),
            Text(
              'Select Client & Relationship',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : AppColors.primaryDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Selected Customer Card or Search/Add Action Buttons
        if (_selectedCustomer != null)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.25),
                width: 1.0,
              ),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.primary,
                  child: Text(
                    _selectedCustomer!.initials,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _selectedCustomer!.name,
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                          color: isDark ? Colors.white : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_selectedCustomer!.mobile}${_selectedCustomer!.city != null && _selectedCustomer!.city!.isNotEmpty ? " • ${_selectedCustomer!.city}" : ""}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton.icon(
                  onPressed: () {
                    HapticService.lightTap();
                    _showCustomerSearchPicker();
                  },
                  icon: const Icon(Icons.swap_horiz_rounded, size: 16),
                  label: const Text('Change', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          )
        else
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    HapticService.lightTap();
                    _showCustomerSearchPicker();
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                  icon: const Icon(Icons.search_rounded, size: 18),
                  label: const Text('Search Client *', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                onPressed: () {
                  HapticService.lightTap();
                  _showQuickCreateCustomerSheet();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.person_add_alt_1_rounded, size: 17),
                label: const Text('+ New', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
        const SizedBox(height: 18),

        // Ordering For (Soft Segmented Pills)
        Text(
          'Garment is being stitched for:',
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _orderingForOptions.map((opt) {
            final isSelected = _orderingFor == opt;
            return GestureDetector(
              onTap: () {
                HapticService.lightTap();
                setState(() => _orderingFor = opt);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary
                      : (isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : (isDark ? AppColors.borderDark : AppColors.borderLight),
                    width: 1.0,
                  ),
                ),
                child: Text(
                  opt,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected
                        ? Colors.white
                        : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        if (_orderingFor == 'Other') ...[
          const SizedBox(height: 12),
          CustomTextField(
            controller: _customOrderingForController,
            label: 'Specify Person Name',
            hint: 'e.g. Niece - Meera',
          ),
        ],
        const SizedBox(height: 18),

        // Attender / Referral Selection
        if (_staffList.isNotEmpty) ...[
          DropdownButtonFormField<UserModel>(
            initialValue: _selectedAttender,
            decoration: const InputDecoration(
              labelText: 'Staff Attender / Referral (Optional)',
              prefixIcon: Icon(Icons.badge_outlined, size: 18),
            ),
            items: _staffList.map((st) {
              return DropdownMenuItem(
                value: st,
                child: Text('${st.fullName} (${st.staffRole ?? "Staff"})'),
              );
            }).toList(),
            onChanged: (val) => setState(() => _selectedAttender = val),
          ),
        ],
      ],
    );
  }

  // ─────────────── Step 2: Measurements ───────────────
  Widget _buildStep2Measurements(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.straighten_rounded, color: AppColors.primary, size: 18),
            ),
            const SizedBox(width: 10),
            Text(
              'Garment Measurements',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : AppColors.primaryDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Toggle: Existing vs New Measurement
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () {
                  HapticService.lightTap();
                  setState(() => _isTakingNewMeasurement = false);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: !_isTakingNewMeasurement
                        ? AppColors.primary
                        : (isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: !_isTakingNewMeasurement
                          ? AppColors.primary
                          : (isDark ? AppColors.borderDark : AppColors.borderLight),
                      width: 1.0,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      'Use Saved Record',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: !_isTakingNewMeasurement ? FontWeight.w800 : FontWeight.w600,
                        color: !_isTakingNewMeasurement
                            ? Colors.white
                            : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: GestureDetector(
                onTap: () {
                  HapticService.lightTap();
                  setState(() => _isTakingNewMeasurement = true);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: _isTakingNewMeasurement
                        ? AppColors.primary
                        : (isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _isTakingNewMeasurement
                          ? AppColors.primary
                          : (isDark ? AppColors.borderDark : AppColors.borderLight),
                      width: 1.0,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      '+ Take New Now',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: _isTakingNewMeasurement ? FontWeight.w800 : FontWeight.w600,
                        color: _isTakingNewMeasurement
                            ? Colors.white
                            : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Measurement History Compare
        if (_selectedCustomer != null) ...[
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {
                HapticService.lightTap();
                MeasurementHistoryModal.show(
                  context,
                  customerId: _selectedCustomer!.id,
                  customerName: _selectedCustomer!.name,
                  preferredGarmentType: _newMeasurementType,
                  onSelectVersion: (selected) {
                    final data = (selected['data'] ?? selected['measurements'] ?? {}) as Map<String, dynamic>;
                    setState(() {
                      _isTakingNewMeasurement = true;
                      if (selected['type'] != null) {
                        _newMeasurementType = selected['type'].toString();
                        _initMeasurementFields(_newMeasurementType);
                      }
                      data.forEach((k, v) {
                        if (_measurementControllers.containsKey(k)) {
                          _measurementControllers[k]?.text = v?.toString() ?? '';
                        }
                      });
                    });
                  },
                );
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 9),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                side: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              icon: const Icon(Icons.history_rounded, size: 16),
              label: const Text(
                'Compare / Load Previous Revisions',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],

        if (!_isTakingNewMeasurement) ...[
          if (_customerMeasurements.isEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: AppColors.warning, size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'No previous measurements on file. Select "+ Take New Now" to record measurements.',
                      style: TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            )
          else
            DropdownButtonFormField<MeasurementModel>(
              initialValue: _selectedExistingMeasurement,
              decoration: const InputDecoration(
                labelText: 'Select Saved Measurement Card',
                prefixIcon: Icon(Icons.straighten_rounded, size: 18),
              ),
              items: _customerMeasurements.map((m) {
                return DropdownMenuItem(
                  value: m,
                  child: Text('${m.type} (${m.createdAt?.split("T").first ?? "Saved"})'),
                );
              }).toList(),
              onChanged: (val) {
                setState(() {
                  _selectedExistingMeasurement = val;
                  _measurementId = val?.id;
                });
              },
            ),
        ] else ...[
          // Garment Type Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: ['BLOUSE', 'CHUDI', 'LADIES_PANT', 'GENTS_SHIRT', 'GENTS_PANT', 'KIDS'].map((t) {
                final isSelected = _newMeasurementType == t;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: () {
                      HapticService.lightTap();
                      setState(() {
                        _newMeasurementType = t;
                        _initMeasurementFields(t);
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.primary
                              : (isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                      ),
                      child: Text(
                        t,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                          color: isSelected
                              ? Colors.white
                              : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 12),
          // Fit Style
          Row(
            children: [
              _buildFitStyleChip('A_SIZE', 'Loose/Comfort', isDark),
              const SizedBox(width: 6),
              _buildFitStyleChip('B_TYPE', 'Regular', isDark),
              const SizedBox(width: 6),
              _buildFitStyleChip('C_TYPE', 'Snug/Slim', isDark),
            ],
          ),
          const SizedBox(height: 14),
          // Live measurement input grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: MeasurementModel.getFieldsForType(_newMeasurementType).length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 2.3,
            ),
            itemBuilder: (ctx, i) {
              final fieldName = MeasurementModel.getFieldsForType(_newMeasurementType)[i];
              final controller = _measurementControllers[fieldName];
              return CustomTextField(
                controller: controller,
                label: fieldName,
                hint: '0.0"',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              );
            },
          ),
        ],
      ],
    );
  }

  // ─────────────── Step 3: Products, Add-Ons & Raw Materials ───────────────
  Widget _buildStep3Products(bool isDark, NumberFormat currency) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.checkroom_rounded, color: AppColors.primary, size: 18),
            ),
            const SizedBox(width: 10),
            Text(
              'Services & Tailoring Items',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : AppColors.primaryDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        if (_categories.isNotEmpty) ...[
          DropdownButtonFormField<CategoryModel>(
            initialValue: _selectedCategory,
            decoration: const InputDecoration(
              labelText: 'Garment Category',
              prefixIcon: Icon(Icons.category_outlined, size: 18),
            ),
            items: _categories.map((cat) {
              return DropdownMenuItem(value: cat, child: Text(cat.name));
            }).toList(),
            onChanged: (val) {
              if (val != null) {
                setState(() => _selectedCategory = val);
                _fetchProductsForCategory(val.id);
              }
            },
          ),
          const SizedBox(height: 12),
        ],

        ..._availableProducts.map((product) {
          final qty = _selectedProductQuantities[product.id] ?? 0;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: qty > 0
                    ? AppColors.primary.withValues(alpha: 0.4)
                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(product.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                      const SizedBox(height: 2),
                      Text(
                        currency.format(product.sellingPrice),
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline_rounded, size: 22),
                      onPressed: qty > 0
                          ? () {
                              HapticService.lightTap();
                              setState(() {
                                if (qty == 1) {
                                  _selectedProductQuantities.remove(product.id);
                                } else {
                                  _selectedProductQuantities[product.id] = qty - 1;
                                }
                              });
                            }
                          : null,
                    ),
                    Text('$qty', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                    IconButton(
                      icon: const Icon(Icons.add_circle_rounded, color: AppColors.primary, size: 22),
                      onPressed: () {
                        HapticService.lightTap();
                        setState(() {
                          _selectedProductQuantities[product.id] = qty + 1;
                        });
                      },
                    ),
                  ],
                ),
              ],
            ),
          );
        }),

        const SizedBox(height: 12),
        Divider(height: 1, thickness: 1, color: isDark ? AppColors.dividerDark : AppColors.dividerLight),
        const SizedBox(height: 12),

        // Add-Ons (Aari, Embroidery, Latkan)
        Text('Add-On Services & Embroidery', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: isDark ? Colors.white : AppColors.primaryDark)),
        const SizedBox(height: 6),
        ..._availableAddOns.map((addon) {
          final qty = _selectedAddOnQuantities[addon.id] ?? 0;
          return CheckboxListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: Text(addon.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text(currency.format(addon.price), style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w700)),
            value: qty > 0,
            onChanged: (selected) {
              HapticService.lightTap();
              setState(() {
                if (selected == true) {
                  _selectedAddOnQuantities[addon.id] = 1;
                } else {
                  _selectedAddOnQuantities.remove(addon.id);
                }
              });
            },
          );
        }),

        if (_availableMaterials.isNotEmpty) ...[
          const SizedBox(height: 12),
          Divider(height: 1, thickness: 1, color: isDark ? AppColors.dividerDark : AppColors.dividerLight),
          const SizedBox(height: 12),
          Text('Raw Materials & Linings', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: isDark ? Colors.white : AppColors.primaryDark)),
          const SizedBox(height: 6),
          ..._availableMaterials.map((mat) {
            final qty = _selectedMaterialQuantities[mat.id] ?? 0.0;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text('${mat.name} (${currency.format(mat.sellingPrice)}/${mat.unitSymbol ?? "pc"})', style: const TextStyle(fontSize: 12.5)),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline_rounded, size: 20),
                        onPressed: qty > 0
                            ? () {
                                HapticService.lightTap();
                                setState(() => _selectedMaterialQuantities[mat.id] = (qty - 1).clamp(0, 99));
                              }
                            : null,
                      ),
                      Text('${qty.toInt()}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      IconButton(
                        icon: const Icon(Icons.add_circle_rounded, size: 20, color: AppColors.primary),
                        onPressed: () {
                          HapticService.lightTap();
                          setState(() => _selectedMaterialQuantities[mat.id] = qty + 1);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            );
          }),
        ],
      ],
    );
  }

  // ─────────────── Step 4: Design Sketch & Attachments ───────────────
  Widget _buildStep4Design(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.draw_rounded, color: AppColors.primary, size: 18),
            ),
            const SizedBox(width: 10),
            Text(
              'Design Sketches & Instructions',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : AppColors.primaryDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Design Sketch Canvas Trigger
        GestureDetector(
          onTap: () async {
            HapticService.lightTap();
            final sketch = await SketchPadModal.show(context);
            if (sketch != null) {
              setState(() => _sketchBase64 = sketch);
            }
          },
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.gesture_rounded, color: AppColors.primary, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _sketchBase64 != null ? '✅ Design Sketch Captured' : 'Draw Garment Design Sketch',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Touch canvas for neck, sleeve, and pattern drawing',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppColors.primary),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Photo Attachments
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Reference Photos', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: isDark ? Colors.white : AppColors.primaryDark)),
            TextButton.icon(
              icon: const Icon(Icons.add_a_photo_outlined, size: 16),
              label: const Text('Add Photo', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              onPressed: _pickImage,
            ),
          ],
        ),
        if (_attachedImagePaths.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text('${_attachedImagePaths.length} photo(s) attached', style: const TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w700)),
          ),
        const SizedBox(height: 12),

        // Stitching Instructions Notes
        CustomTextField(
          controller: _notesController,
          label: 'Cutting & Stitching Instructions',
          hint: 'e.g. Back potli buttons, 1.5 inch margin, side invisible zip, double stitching',
          maxLines: 3,
        ),
      ],
    );
  }

  // ─────────────── Step 5: Schedule & Financials ───────────────
  Widget _buildStep5Financials(bool isDark, NumberFormat currency) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.receipt_long_rounded, color: AppColors.primary, size: 18),
            ),
            const SizedBox(width: 10),
            Text(
              'Delivery & Payment Terms',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: isDark ? Colors.white : AppColors.primaryDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Due Delivery Date Picker Card
        GestureDetector(
          onTap: () async {
            HapticService.lightTap();
            final picked = await showDatePicker(
              context: context,
              initialDate: _selectedDueDate,
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 180)),
            );
            if (picked != null) setState(() => _selectedDueDate = picked);
          },
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Due Delivery Date', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                    const SizedBox(height: 2),
                    Text(
                      DateFormat('EEEE, dd MMMM yyyy').format(_selectedDueDate),
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: isDark ? Colors.white : AppColors.textPrimaryLight),
                    ),
                  ],
                ),
                const Icon(Icons.calendar_month_rounded, color: AppColors.primary, size: 20),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Delivery Priority Toggle
        Row(
          children: [
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _deliveryOption = 'CUSTOM'),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: BoxDecoration(
                    color: _deliveryOption == 'CUSTOM' ? AppColors.primary : (isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      'Standard Delivery',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _deliveryOption == 'CUSTOM' ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _deliveryOption = 'EXPRESS'),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: BoxDecoration(
                    color: _deliveryOption == 'EXPRESS' ? AppColors.secondary : (isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      '⚡ Express Rush',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _deliveryOption == 'EXPRESS' ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        CustomTextField(
          controller: _advancePaidController,
          label: 'Advance Payment Collected (₹)',
          keyboardType: TextInputType.number,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 10),
        CustomTextField(
          controller: _discountController,
          label: 'Discount (₹)',
          keyboardType: TextInputType.number,
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 16),

        // Consolidated Financial Summary Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
          ),
          child: Column(
            children: [
              _buildSummaryLine('Services Total:', currency.format(_productTotal)),
              if (_addOnsTotal > 0)
                _buildSummaryLine('Add-Ons Total:', currency.format(_addOnsTotal)),
              if (_materialsTotal > 0)
                _buildSummaryLine('Materials Total:', currency.format(_materialsTotal)),
              if (_discount > 0)
                _buildSummaryLine('Discount:', '- ${currency.format(_discount)}', color: AppColors.success),
              const Divider(height: 16),
              _buildSummaryLine(
                'Grand Total:',
                currency.format(_grandTotal),
                isBold: true,
                fontSize: 16,
              ),
              _buildSummaryLine('Advance Paid:', currency.format(_advancePaid)),
              _buildSummaryLine(
                'Balance Due:',
                currency.format(_balanceDue),
                isBold: true,
                color: AppColors.warning,
                fontSize: 16,
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─────────────── Bottom Sticky Action Dock ───────────────
  Widget _buildBottomActionDock(bool isDark, NumberFormat currency) {
    final isLastStep = _currentStep == 4;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 0.8,
          ),
        ),
      ),
      child: Row(
        children: [
          if (_currentStep > 0) ...[
            OutlinedButton(
              onPressed: () {
                HapticService.lightTap();
                setState(() => _currentStep -= 1);
              },
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Back', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: ElevatedButton(
              onPressed: _isSubmitting
                  ? null
                  : () {
                      HapticService.lightTap();
                      if (_currentStep < 4) {
                        setState(() => _currentStep += 1);
                      } else {
                        _submitOrder();
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: isLastStep ? AppColors.accent : AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text(
                      isLastStep
                          ? 'Create & Finalize Order (${currency.format(_grandTotal)}) ✨'
                          : 'Continue ➔',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFitStyleChip(String key, String label, bool isDark) {
    final isSelected = _newMeasurementFitStyle == key;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticService.lightTap();
          setState(() => _newMeasurementFitStyle = key);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? AppColors.primary
                : (isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected
                  ? AppColors.primary
                  : (isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected
                    ? Colors.white
                    : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryLine(String label, String value, {bool isBold = false, Color? color, double fontSize = 13.5}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: fontSize, fontWeight: isBold ? FontWeight.w700 : FontWeight.w500)),
          Text(
            value,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
