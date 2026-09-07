import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/services/haptic_service.dart';
import '../../features/workboard/providers/workboard_provider.dart';
import '../models/order_model.dart';
import 'custom_button.dart';
import 'bottom_sheet_handle.dart';
import 'premium_snackbar.dart';

/// Luxury Boutique Staff & Tailor Work Assignment Modal
class StaffAssignmentModal extends ConsumerStatefulWidget {
  final OrderModel order;
  final VoidCallback? onAssigned;

  const StaffAssignmentModal({
    super.key,
    required this.order,
    this.onAssigned,
  });

  static Future<bool?> show(BuildContext context, {required OrderModel order, VoidCallback? onAssigned}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StaffAssignmentModal(
        order: order,
        onAssigned: onAssigned,
      ),
    );
  }

  @override
  ConsumerState<StaffAssignmentModal> createState() => _StaffAssignmentModalState();
}

class _StaffAssignmentModalState extends ConsumerState<StaffAssignmentModal> {
  final _workerNameController = TextEditingController();
  final _pieceRateController = TextEditingController();
  final _notesController = TextEditingController();

  String _selectedWorkType = 'STITCHING'; // 'CUTTING', 'STITCHING', 'EMBROIDERY', 'FINISHING', 'IRONING'
  DateTime _dueDate = DateTime.now().add(const Duration(days: 2));
  bool _isSubmitting = false;
  String? _errorMessage;

  // Predefined boutique masters for quick 1-tap selection
  final List<Map<String, String>> _quickWorkers = [
    {'name': 'Master Ramesh', 'role': 'Cutting Master'},
    {'name': 'Tailor Priya', 'role': 'Blouse Specialist'},
    {'name': 'Anbu Master', 'role': 'Aari Work / Embroidery'},
    {'name': 'Kavitha', 'role': 'Finishing & Hemming'},
  ];

  final List<Map<String, dynamic>> _workTypes = [
    {'key': 'CUTTING', 'label': 'Cutting', 'icon': Icons.content_cut_rounded, 'color': AppColors.statusCutting},
    {'key': 'STITCHING', 'label': 'Stitching', 'icon': Icons.precision_manufacturing_rounded, 'color': AppColors.statusStitching},
    {'key': 'EMBROIDERY', 'label': 'Aari Work', 'icon': Icons.auto_awesome_rounded, 'color': AppColors.secondary},
    {'key': 'FINISHING', 'label': 'Finishing', 'icon': Icons.check_circle_outline_rounded, 'color': AppColors.accent},
  ];

  @override
  void dispose() {
    _workerNameController.dispose();
    _pieceRateController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitAssignment() async {
    final workerName = _workerNameController.text.trim();
    if (workerName.isEmpty) {
      setState(() => _errorMessage = 'Please enter or select a master/tailor name');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final pieceRate = double.tryParse(_pieceRateController.text.trim()) ?? 0.0;

      final payload = {
        'orderId': widget.order.id,
        'workType': _selectedWorkType,
        'pieceRate': pieceRate,
        'assignedDate': DateTime.now().toIso8601String(),
        'dueDate': _dueDate.toIso8601String(),
        'notes': 'Assigned to $workerName. ${_notesController.text.trim()}',
      };

      await apiClient.post(ApiEndpoints.workAssignments, data: payload);

      HapticService.heavyImpact();
      ref.invalidate(workboardProvider);

      if (widget.onAssigned != null) {
        widget.onAssigned!();
      }

      if (mounted) {
        Navigator.pop(context, true);
        PremiumSnackbar.showSuccess(
          context,
          'Assigned Order #${widget.order.orderId} to $workerName (${_selectedWorkType.toLowerCase()})! ✨',
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, bottomInset + 24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF141824) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 30,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            const BottomSheetHandle(margin: EdgeInsets.only(bottom: 16)),

            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Assign Work to Tailor',
                      style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Order #${widget.order.orderId} • ${widget.order.customer?.name ?? "Customer"}',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Work Stage Selector
            const Text(
              'Select Production Stage',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.2),
            ),
            const SizedBox(height: 8),
            Row(
              children: _workTypes.map((wt) {
                final isSelected = _selectedWorkType == wt['key'];
                final color = wt['color'] as Color;

                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      HapticService.selectionClick();
                      setState(() => _selectedWorkType = wt['key'] as String);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? color.withValues(alpha: isDark ? 0.25 : 0.15)
                            : (isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9)),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? color : (isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            wt['icon'] as IconData,
                            size: 18,
                            color: isSelected ? color : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            wt['label'] as String,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: isSelected ? color : (isDark ? Colors.white70 : AppColors.textPrimaryLight),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // Quick Master Suggestions
            const Text(
              'Quick Select Master / Tailor',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.2),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: _quickWorkers.map((w) {
                final isSelected = _workerNameController.text == w['name'];
                return ChoiceChip(
                  label: Text('${w['name']} (${w['role']})', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                  selected: isSelected,
                  selectedColor: AppColors.primary.withValues(alpha: 0.2),
                  backgroundColor: isDark ? const Color(0xFF1E2433) : const Color(0xFFE2E8F0),
                  side: BorderSide(color: isSelected ? AppColors.primary : Colors.transparent),
                  onSelected: (selected) {
                    HapticService.selectionClick();
                    setState(() {
                      _workerNameController.text = selected ? w['name']! : '';
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 14),

            // Worker Name Input
            TextField(
              controller: _workerNameController,
              decoration: InputDecoration(
                labelText: 'Tailor / Master Name *',
                hintText: 'e.g. Master Ramesh',
                prefixIcon: const Icon(Icons.person_outline_rounded),
                filled: true,
                fillColor: isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 14),

            // Piece Rate & Target Date Row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _pieceRateController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      labelText: 'Piece Rate (₹)',
                      hintText: 'e.g. 350',
                      prefixIcon: const Icon(Icons.currency_rupee_rounded),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () async {
                      HapticService.lightTap();
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _dueDate,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 90)),
                      );
                      if (picked != null) {
                        setState(() => _dueDate = picked);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Target Due Date',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(Icons.event_rounded, size: 14, color: AppColors.primary),
                              const SizedBox(width: 6),
                              Text(
                                DateFormat('d MMM yyyy').format(_dueDate),
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Notes / Special Instructions
            TextField(
              controller: _notesController,
              decoration: InputDecoration(
                labelText: 'Special Cutting / Stitching Notes (Optional)',
                hintText: 'e.g. Princess cut blouse with potli buttons',
                prefixIcon: const Icon(Icons.description_outlined),
                filled: true,
                fillColor: isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, size: 16, color: AppColors.error),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),

            // Submit Button
            CustomButton(
              text: 'Assign & Notify Tailor',
              isLoading: _isSubmitting,
              icon: Icons.assignment_ind_rounded,
              onPressed: _submitAssignment,
            ),
          ],
        ),
      ),
    );
  }
}
