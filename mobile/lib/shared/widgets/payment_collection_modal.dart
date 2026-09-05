import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/network/api_client.dart';
import '../../core/services/whatsapp_service.dart';
import '../../core/services/haptic_service.dart';
import '../../features/orders/providers/order_provider.dart';
import '../../features/dashboard/providers/dashboard_provider.dart';
import '../../features/workboard/providers/workboard_provider.dart';
import '../models/order_model.dart';
import 'custom_button.dart';

/// Luxury Boutique Partial Payment & Balance Collection Sheet
class PaymentCollectionModal extends ConsumerStatefulWidget {
  final OrderModel order;
  final VoidCallback? onPaymentRecorded;

  const PaymentCollectionModal({
    super.key,
    required this.order,
    this.onPaymentRecorded,
  });

  static Future<bool?> show(BuildContext context, {required OrderModel order, VoidCallback? onPaymentRecorded}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PaymentCollectionModal(
        order: order,
        onPaymentRecorded: onPaymentRecorded,
      ),
    );
  }

  @override
  ConsumerState<PaymentCollectionModal> createState() => _PaymentCollectionModalState();
}

class _PaymentCollectionModalState extends ConsumerState<PaymentCollectionModal> {
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  final _txnIdController = TextEditingController();

  String _paymentMethod = 'CASH'; // 'CASH', 'UPI', 'CARD', 'BANK_TRANSFER'
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Default to remaining balance if > 0, else 0
    final balance = widget.order.balanceDue;
    if (balance > 0) {
      _amountController.text = balance.toStringAsFixed(0);
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    _txnIdController.dispose();
    super.dispose();
  }

  Future<void> _recordPayment() async {
    final rawAmount = double.tryParse(_amountController.text.trim());
    if (rawAmount == null || rawAmount <= 0) {
      setState(() => _errorMessage = 'Please enter a valid payment amount');
      return;
    }

    if (rawAmount > widget.order.balanceDue && widget.order.balanceDue > 0) {
      setState(() => _errorMessage = 'Amount exceeds balance due (₹${widget.order.balanceDue.toStringAsFixed(0)})');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final payload = {
        'orderId': widget.order.id,
        'amount': rawAmount,
        'paymentMethod': _paymentMethod,
        'paymentDate': DateTime.now().toIso8601String(),
        'notes': _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : 'Balance collection',
        if (_txnIdController.text.trim().isNotEmpty) 'transactionId': _txnIdController.text.trim(),
      };

      await apiClient.post(ApiEndpoints.payments, data: payload);

      HapticService.heavyImpact();

      // Refresh providers
      ref.invalidate(ordersListProvider);
      ref.invalidate(dashboardProvider);
      ref.invalidate(workboardProvider);

      if (widget.onPaymentRecorded != null) {
        widget.onPaymentRecorded!();
      }

      if (mounted) {
        final remainingBalance = (widget.order.balanceDue - rawAmount).clamp(0.0, double.infinity);
        Navigator.pop(context, true);

        // Show celebration snackbar with WhatsApp receipt action
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.success,
            content: Text('Payment of ₹${rawAmount.toStringAsFixed(0)} recorded successfully! ✨'),
            action: widget.order.customer?.mobile != null
                ? SnackBarAction(
                    label: 'Send WhatsApp Receipt',
                    textColor: Colors.white,
                    onPressed: () {
                      final msg = '🧾 *Payment Receipt - KTown Aari Works*\n'
                          '───────────────────────\n'
                          '• Order: #${widget.order.orderId}\n'
                          '• Client: ${widget.order.customer!.name}\n'
                          '• Amount Received: ₹${rawAmount.toStringAsFixed(0)} ($_paymentMethod)\n'
                          '• Remaining Balance: ₹${remainingBalance.toStringAsFixed(0)}\n'
                          '• Date: ${DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.now())}\n'
                          '───────────────────────\n'
                          'Thank you for your business! 🙏';

                      WhatsAppService.sendMessage(
                        phone: widget.order.customer!.mobile,
                        message: msg,
                      );
                    },
                  )
                : null,
          ),
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
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    final methods = [
      {'key': 'CASH', 'label': 'Cash', 'icon': Icons.payments_rounded},
      {'key': 'UPI', 'label': 'UPI / GPay', 'icon': Icons.qr_code_rounded},
      {'key': 'CARD', 'label': 'Card', 'icon': Icons.credit_card_rounded},
      {'key': 'BANK_TRANSFER', 'label': 'Bank', 'icon': Icons.account_balance_rounded},
    ];

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
                      'Collect Payment',
                      style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Order #${widget.order.orderId} • ${widget.order.customer?.name ?? "Client"}',
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

            // Financial Summary Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2433) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? Colors.white.withValues(alpha: 0.06) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildSummaryItem('Total Order', currencyFormatter.format(widget.order.grandTotal), isDark, null),
                  Container(width: 1, height: 32, color: isDark ? Colors.white12 : Colors.black12),
                  _buildSummaryItem('Advance Paid', currencyFormatter.format(widget.order.advancePaid), isDark, AppColors.success),
                  Container(width: 1, height: 32, color: isDark ? Colors.white12 : Colors.black12),
                  _buildSummaryItem('Balance Due', currencyFormatter.format(widget.order.balanceDue), isDark, AppColors.error),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Quick Preset Amount Chips
            const Text(
              'Quick Preset',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.2),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                if (widget.order.balanceDue > 0)
                  _buildPresetChip('Full Balance (₹${widget.order.balanceDue.toStringAsFixed(0)})', widget.order.balanceDue, isDark),
                _buildPresetChip('₹500', 500, isDark),
                _buildPresetChip('₹1,000', 1000, isDark),
                _buildPresetChip('₹2,000', 2000, isDark),
              ],
            ),
            const SizedBox(height: 16),

            // Amount Input Field
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
              decoration: InputDecoration(
                labelText: 'Payment Amount (₹)',
                prefixIcon: const Icon(Icons.currency_rupee_rounded),
                filled: true,
                fillColor: isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),

            // Payment Method Selector
            const Text(
              'Payment Mode',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.2),
            ),
            const SizedBox(height: 8),
            Row(
              children: methods.map((m) {
                final isSelected = _paymentMethod == m['key'];
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      HapticService.selectionClick();
                      setState(() => _paymentMethod = m['key'] as String);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9)),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.primaryLight
                              : (isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                        ),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            m['icon'] as IconData,
                            size: 18,
                            color: isSelected
                                ? Colors.white
                                : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            m['label'] as String,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: isSelected ? Colors.white : (isDark ? Colors.white70 : AppColors.textPrimaryLight),
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

            // Transaction / Reference ID (Optional)
            if (_paymentMethod != 'CASH') ...[
              TextField(
                controller: _txnIdController,
                decoration: InputDecoration(
                  labelText: 'UPI / Transaction Ref ID (Optional)',
                  prefixIcon: const Icon(Icons.tag_rounded),
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Notes / Remarks
            TextField(
              controller: _notesController,
              decoration: InputDecoration(
                labelText: 'Notes / Remarks (Optional)',
                prefixIcon: const Icon(Icons.note_alt_outlined),
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
              text: 'Record Payment',
              isLoading: _isSubmitting,
              icon: Icons.check_circle_outline_rounded,
              onPressed: _recordPayment,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value, bool isDark, Color? highlight) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w900,
            color: highlight ?? (isDark ? Colors.white : AppColors.textPrimaryLight),
          ),
        ),
      ],
    );
  }

  Widget _buildPresetChip(String label, double amount, bool isDark) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
      backgroundColor: isDark ? const Color(0xFF1E2433) : const Color(0xFFE2E8F0),
      side: BorderSide.none,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      onPressed: () {
        HapticService.selectionClick();
        setState(() {
          _amountController.text = amount.toStringAsFixed(0);
        });
      },
    );
  }
}
