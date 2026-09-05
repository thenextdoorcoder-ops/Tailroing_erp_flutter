import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/measurement_model.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';

class MeasurementEntryScreen extends ConsumerStatefulWidget {
  final String? customerId;
  final String? orderId;

  const MeasurementEntryScreen({super.key, this.customerId, this.orderId});

  @override
  ConsumerState<MeasurementEntryScreen> createState() => _MeasurementEntryScreenState();
}

class _MeasurementEntryScreenState extends ConsumerState<MeasurementEntryScreen> {
  String _selectedGarment = 'BLOUSE';
  String _selectedFitStyle = 'B_TYPE';
  final Map<String, TextEditingController> _controllers = {};
  final TextEditingController _notesController = TextEditingController();
  bool _isSaving = false;

  final List<Map<String, dynamic>> _garmentTypes = [
    {'type': 'BLOUSE', 'label': 'Blouse', 'icon': Icons.checkroom},
    {'type': 'CHUDI', 'label': 'Churidar', 'icon': Icons.dry_cleaning},
    {'type': 'LADIES_PANT', 'label': 'Ladies Pant', 'icon': Icons.woman},
    {'type': 'GENTS_SHIRT', 'label': 'Gents Shirt', 'icon': Icons.man},
    {'type': 'GENTS_PANT', 'label': 'Gents Pant', 'icon': Icons.straighten},
    {'type': 'KIDS', 'label': 'Kids Wear', 'icon': Icons.child_care},
  ];

  @override
  void initState() {
    super.initState();
    _initFieldsForType(_selectedGarment);
  }

  @override
  void dispose() {
    for (var c in _controllers.values) {
      c.dispose();
    }
    _notesController.dispose();
    super.dispose();
  }

  void _initFieldsForType(String type) {
    for (var c in _controllers.values) {
      c.dispose();
    }
    _controllers.clear();

    final fields = MeasurementModel.getFieldsForType(type);
    for (var f in fields) {
      _controllers[f] = TextEditingController();
    }
  }

  Future<void> _saveMeasurements() async {
    if (widget.customerId == null || widget.customerId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Customer ID is required')),
      );
      return;
    }

    setState(() => _isSaving = true);

    final dataMap = <String, dynamic>{
      'fitStyle': _selectedFitStyle,
    };
    _controllers.forEach((key, controller) {
      if (controller.text.isNotEmpty) {
        dataMap[key] = controller.text.trim();
      }
    });

    final payload = {
      'customerId': widget.customerId,
      'orderId': widget.orderId,
      'type': _selectedGarment,
      'data': dataMap,
      'notes': _notesController.text.trim(),
    };

    try {
      final apiClient = ref.read(apiClientProvider);
      await apiClient.post(ApiEndpoints.measurements, data: payload);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Measurements saved successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save measurements: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fields = MeasurementModel.getFieldsForType(_selectedGarment);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Record Measurements'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Garment Type Chips
            const Text(
              'Select Garment Type',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _garmentTypes.map((g) {
                  final isSelected = _selectedGarment == g['type'];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      avatar: Icon(
                        g['icon'] as IconData,
                        size: 16,
                        color: isSelected ? Colors.white : AppColors.primary,
                      ),
                      label: Text(g['label'] as String),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() {
                            _selectedGarment = g['type'] as String;
                            _initFieldsForType(_selectedGarment);
                          });
                        }
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 20),

            // Fit Style Selector
            const Text(
              'Fitting Style',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildFitChip('A_SIZE', 'Comfort (Loose)'),
                const SizedBox(width: 8),
                _buildFitChip('B_TYPE', 'Regular Fit'),
                const SizedBox(width: 8),
                _buildFitChip('C_TYPE', 'Slim / Snug'),
              ],
            ),
            const SizedBox(height: 24),

            // Measurement Fields Grid
            Text(
              '$_selectedGarment Measurement Points (inches)',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: fields.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 2.2,
              ),
              itemBuilder: (ctx, i) {
                final fieldName = fields[i];
                final controller = _controllers[fieldName];

                return CustomTextField(
                  controller: controller,
                  label: fieldName,
                  hint: '0.0"',
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                );
              },
            ),
            const SizedBox(height: 20),

            // Notes
            CustomTextField(
              controller: _notesController,
              label: 'Fitting & Style Notes',
              hint: 'e.g. Deep back neck with potli buttons, 1.5 inch margin inside',
              maxLines: 2,
            ),
            const SizedBox(height: 32),

            // Submit Button
            CustomButton(
              text: 'Save Measurement Record',
              icon: Icons.check,
              isLoading: _isSaving,
              onPressed: _saveMeasurements,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFitChip(String key, String label) {
    final isSelected = _selectedFitStyle == key;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedFitStyle = key),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.primary : Colors.grey.shade400,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.white : null,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
