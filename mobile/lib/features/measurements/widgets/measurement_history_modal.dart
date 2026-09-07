import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/haptic_service.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/app_card.dart';

/// Luxury Boutique Measurement Version History & Comparison Modal
class MeasurementHistoryModal extends ConsumerStatefulWidget {
  final String customerId;
  final String customerName;
  final String? preferredGarmentType;
  final Function(Map<String, dynamic> selectedMeasurement)? onSelectVersion;

  const MeasurementHistoryModal({
    super.key,
    required this.customerId,
    required this.customerName,
    this.preferredGarmentType,
    this.onSelectVersion,
  });

  static Future<void> show(
    BuildContext context, {
    required String customerId,
    required String customerName,
    String? preferredGarmentType,
    Function(Map<String, dynamic> selectedMeasurement)? onSelectVersion,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => MeasurementHistoryModal(
        customerId: customerId,
        customerName: customerName,
        preferredGarmentType: preferredGarmentType,
        onSelectVersion: onSelectVersion,
      ),
    );
  }

  @override
  ConsumerState<MeasurementHistoryModal> createState() => _MeasurementHistoryModalState();
}

class _MeasurementHistoryModalState extends ConsumerState<MeasurementHistoryModal> {
  bool _isLoading = true;
  String? _error;
  List<dynamic> _measurements = [];
  int _selectedVersionIndex = 0;
  int? _comparisonVersionIndex;

  @override
  void initState() {
    super.initState();
    _fetchMeasurementHistory();
  }

  Future<void> _fetchMeasurementHistory() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final res = await apiClient.get(ApiEndpoints.customerMeasurements(widget.customerId));
      if (res != null && mounted) {
        final list = res is List ? res : (res['measurements'] as List? ?? []);
        setState(() {
          _measurements = list;
          _isLoading = false;
          if (_measurements.length > 1) {
            _comparisonVersionIndex = 1; // compare latest with 2nd latest
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle Bar
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: isDark ? Colors.white24 : Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Measurement Revisions',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${widget.customerName} • Version History',
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
          const SizedBox(height: 14),

          // Body
          Expanded(
            child: _isLoading
                ? const LoadingShimmer(count: 3, height: 100)
                : _error != null
                    ? Center(child: Text(_error!))
                    : _measurements.isEmpty
                        ? const EmptyState(
                            icon: Icons.straighten_rounded,
                            title: 'No Measurements Found',
                            message: 'No recorded measurement history for this customer yet.',
                          )
                        : _buildHistoryContent(isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryContent(bool isDark) {
    final current = _measurements[_selectedVersionIndex] as Map<String, dynamic>;
    final prev = _comparisonVersionIndex != null && _comparisonVersionIndex! < _measurements.length
        ? _measurements[_comparisonVersionIndex!] as Map<String, dynamic>
        : null;

    final currentData = (current['data'] ?? current['measurements'] ?? {}) as Map<String, dynamic>;
    final prevData = prev != null ? ((prev['data'] ?? prev['measurements'] ?? {}) as Map<String, dynamic>) : null;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Revision Timeline Pills
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _measurements.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final m = _measurements[i] as Map<String, dynamic>;
                final dateStr = m['createdAt'] != null
                    ? DateFormat('d MMM yyyy').format(DateTime.parse(m['createdAt']))
                    : 'Rev ${i + 1}';
                final isSelected = _selectedVersionIndex == i;
                final type = (m['type'] ?? 'GARMENT').toString().replaceAll('_', ' ');

                return GestureDetector(
                  onTap: () {
                    HapticService.selectionClick();
                    setState(() {
                      _selectedVersionIndex = i;
                      if (_measurements.length > 1) {
                        _comparisonVersionIndex = i == 0 ? 1 : 0;
                      }
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary
                          : (isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9)),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected ? AppColors.primaryLight : Colors.transparent,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.history_rounded,
                          size: 14,
                          color: isSelected ? Colors.white : AppColors.primary,
                        ),
                        const SizedBox(width: 6),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              dateStr,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: isSelected ? Colors.white : (isDark ? Colors.white : AppColors.textPrimaryLight),
                              ),
                            ),
                            Text(
                              type,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w600,
                                color: isSelected ? Colors.white70 : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // 2. Comparison Banner
          if (prev != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2433) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.compare_arrows_rounded, size: 18, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Comparing Active Rev with Rev of ${DateFormat('d MMM yyyy').format(DateTime.parse(prev['createdAt']))}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white70 : AppColors.textPrimaryLight,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
          ],

          // 3. Side-by-Side Parameter Matrix
          AppCard(
            padding: const EdgeInsets.all(16),
            borderRadius: 18,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Measurement Parameter', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                    Row(
                      children: [
                        if (prevData != null)
                          const Text('Previous', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey)),
                        if (prevData != null) const SizedBox(width: 24),
                        const Text('Active (Inches)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.primary)),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 20),
                ...currentData.entries.map((entry) {
                  final key = entry.key;
                  final currentVal = entry.value?.toString() ?? '-';
                  final prevVal = prevData?[key]?.toString();

                  double? delta;
                  if (prevVal != null) {
                    final cNum = double.tryParse(currentVal);
                    final pNum = double.tryParse(prevVal);
                    if (cNum != null && pNum != null) {
                      delta = cNum - pNum;
                    }
                  }

                  final label = key.replaceAll('_', ' ').toUpperCase();

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.white70 : AppColors.textPrimaryLight,
                          ),
                        ),
                        Row(
                          children: [
                            if (prevVal != null)
                              Text(
                                '$prevVal"',
                                style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600),
                              ),
                            if (delta != null && delta != 0) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: (delta > 0 ? AppColors.success : AppColors.error).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '${delta > 0 ? "+" : ""}${delta.toStringAsFixed(1)}"',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    color: delta > 0 ? AppColors.success : AppColors.error,
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(width: 16),
                            Text(
                              '$currentVal"',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 4. "Apply This Version to Order" Action
          if (widget.onSelectVersion != null)
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: AppColors.primaryGradient,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton.icon(
                onPressed: () {
                  HapticService.heavyImpact();
                  widget.onSelectVersion!(current);
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                icon: const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                label: const Text(
                  'Apply This Version to Order',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
