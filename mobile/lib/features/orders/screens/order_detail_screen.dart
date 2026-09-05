import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/whatsapp_service.dart';
import '../../../core/services/bluetooth_printer_service.dart';
import '../../../core/services/a4_invoice_print_service.dart';
import '../../../shared/models/order_model.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/sketch_pad_modal.dart';
import '../../../shared/widgets/voice_note_widget.dart';
import '../providers/order_provider.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  OrderModel? _order;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchOrderDetail();
  }

  Future<void> _fetchOrderDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.get(ApiEndpoints.orderDetail(widget.orderId));
      if (response != null && mounted) {
        setState(() {
          _order = OrderModel.fromJson(response);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  String? _getNextStatus(String currentStatus) {
    switch (currentStatus) {
      case 'ORDER_CREATED':
        return 'DESIGNING_STARTED';
      case 'DESIGNING_STARTED':
        return 'DESIGNING_COMPLETED';
      case 'DESIGNING_COMPLETED':
        return 'CUTTING_STARTED';
      case 'CUTTING_STARTED':
        return 'CUTTING_COMPLETED';
      case 'CUTTING_COMPLETED':
        return 'STITCHING_STARTED';
      case 'STITCHING_STARTED':
        return 'STITCHING_COMPLETED';
      case 'STITCHING_COMPLETED':
        return 'READY_TO_DELIVER';
      case 'READY_TO_DELIVER':
        return 'DELIVERED';
      default:
        return null;
    }
  }

  Future<void> _advanceStage(String nextStatus) async {
    final success = await ref
        .read(ordersListProvider.notifier)
        .updateOrderStatus(widget.orderId, nextStatus);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order advanced to ${nextStatus.replaceAll('_', ' ')}'),
          backgroundColor: AppColors.success,
        ),
      );
      _fetchOrderDetail();
    }
  }

  Future<void> _openWhatsApp(String phone, String customerName) async {
    if (_order == null) return;
    // Show template picker
    if (!mounted) return;
    await _showWhatsAppTemplateSheet(phone, customerName);
  }

  Future<void> _showWhatsAppTemplateSheet(String phone, String customerName) async {
    final order = _order!;
    final statusesRaw = [
      order.status,
      if (order.status != 'DELIVERED') 'READY_TO_DELIVER',
      'DELIVERED',
    ];
    final seen = <String>{};
    final statuses = statusesRaw.where((s) => seen.add(s)).toList();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF25D366).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.chat, color: Color(0xFF25D366), size: 20),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Send WhatsApp Update',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Send a status update to $customerName',
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).brightness == Brightness.dark
                    ? AppColors.textSecondaryDark
                    : AppColors.textSecondaryLight,
              ),
            ),
            const SizedBox(height: 16),
            ...statuses.map((status) {
              final message = WhatsAppService.buildOrderMessage(
                customerName: customerName,
                orderId: order.orderId,
                status: status,
                shopName: 'KTown Aari Works',
                itemNames: order.items.map((i) => i.productName ?? 'Item').toList(),
              );
              final isCurrent = status == order.status;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: () {
                    Navigator.pop(ctx);
                    WhatsAppService.sendMessage(phone: phone, message: message);
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isCurrent
                          ? const Color(0xFF25D366).withValues(alpha: 0.08)
                          : null,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isCurrent
                            ? const Color(0xFF25D366).withValues(alpha: 0.4)
                            : Colors.grey.shade200,
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    status.replaceAll('_', ' '),
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  if (isCurrent) ...[                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF25D366)
                                            .withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Text(
                                        'Current',
                                        style: TextStyle(
                                          fontSize: 9,
                                          color: Color(0xFF25D366),
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                message.length > 80
                                    ? '${message.substring(0, 80)}...'
                                    : message,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Theme.of(context).brightness ==
                                          Brightness.dark
                                      ? AppColors.textSecondaryDark
                                      : AppColors.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(Icons.send_rounded,
                            color: Color(0xFF25D366), size: 20),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Future<void> _callPhone(String phone) async {
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  void _showAddPaymentModal() {
    final amountController = TextEditingController(text: _order?.balanceDue.toStringAsFixed(0));
    final notesController = TextEditingController();
    String selectedMethod = 'CASH';

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
              const Text(
                'Record Payment',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 16),
              CustomTextField(
                controller: amountController,
                label: 'Payment Amount (₹)',
                keyboardType: TextInputType.number,
                prefixIcon: const Icon(Icons.currency_rupee, size: 18),
              ),
              const SizedBox(height: 14),
              const Text(
                'Payment Method',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'].map((method) {
                  final isSelected = selectedMethod == method;
                  return ChoiceChip(
                    label: Text(method),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) {
                        setModalState(() => selectedMethod = method);
                      }
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),
              CustomTextField(
                controller: notesController,
                label: 'Notes (Optional)',
                hint: 'e.g. GPay ref #1234',
              ),
              const SizedBox(height: 20),
              CustomButton(
                text: 'Save Payment',
                onPressed: () async {
                  final amount = double.tryParse(amountController.text) ?? 0.0;
                  if (amount <= 0) return;

                  Navigator.pop(ctx);
                  final ok = await ref.read(ordersListProvider.notifier).addPayment(
                        widget.orderId,
                        amount,
                        selectedMethod,
                        notes: notesController.text.trim(),
                      );

                  if (ok && mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Payment recorded successfully!'),
                        backgroundColor: AppColors.success,
                      ),
                    );
                    _fetchOrderDetail();
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPrintOptions() async {
    final isBtConnected = !kIsWeb && await BluetoothPrinterService.isConnected();
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Print & Export Options',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Print to office Wi-Fi printers (Brother/Epson/HP) or Bluetooth thermal printers',
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).brightness == Brightness.dark
                    ? AppColors.textSecondaryDark
                    : AppColors.textSecondaryLight,
              ),
            ),
            const SizedBox(height: 16),

            // 1. Full A4 / Wi-Fi Document Printing
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.print, color: AppColors.primary, size: 22),
              ),
              title: const Text('Print Full A4 Invoice (Wi-Fi)',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text('Direct to Brother, Epson, HP on Wi-Fi / AirPrint'),
              trailing: const Icon(Icons.wifi, size: 18, color: AppColors.primary),
              onTap: () async {
                Navigator.pop(ctx);
                await A4InvoicePrintService.printA4Invoice(
                  order: _order!,
                  shopName: 'KTown Aari Works',
                );
              },
            ),
            const Divider(height: 1),

            // 2. Share PDF File
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.info.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.share_outlined, color: AppColors.info, size: 22),
              ),
              title: const Text('Share / Save A4 PDF',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text('Export invoice PDF to WhatsApp, Email, Drive'),
              onTap: () async {
                Navigator.pop(ctx);
                await A4InvoicePrintService.sharePdfInvoice(
                  order: _order!,
                  shopName: 'KTown Aari Works',
                );
              },
            ),
            const Divider(height: 1),

            // 3. Thermal Receipt Bill
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.receipt_long, color: AppColors.success, size: 22),
              ),
              title: const Text('Print Thermal POS Receipt (58/80mm)',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(
                isBtConnected
                    ? 'Bluetooth Thermal Printer Ready'
                    : 'Requires Bluetooth Thermal Printer',
                style: TextStyle(
                  color: isBtConnected ? AppColors.success : AppColors.warning,
                ),
              ),
              trailing: const Icon(Icons.bluetooth, size: 18, color: AppColors.success),
              onTap: () async {
                Navigator.pop(ctx);
                if (kIsWeb) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Bluetooth POS printing is supported on Android')),
                  );
                  return;
                }
                if (!isBtConnected) {
                  context.push('/printer-settings');
                  return;
                }
                final ok = await BluetoothPrinterService.printOrderReceipt(
                  order: _order!,
                  shopName: 'KTown Aari Works',
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(ok ? 'Receipt printed!' : 'Failed to print receipt'),
                      backgroundColor: ok ? AppColors.success : AppColors.error,
                    ),
                  );
                }
              },
            ),
            const Divider(height: 1),

            // 4. Garment Tag
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.label_outline, color: AppColors.secondary, size: 22),
              ),
              title: const Text('Print Garment Tag & Barcode',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text('Cloth slip for cutting & stitching masters'),
              onTap: () async {
                Navigator.pop(ctx);
                if (kIsWeb) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Bluetooth tag printing is supported on Android')),
                  );
                  return;
                }
                if (!isBtConnected) {
                  context.push('/printer-settings');
                  return;
                }
                final ok = await BluetoothPrinterService.printGarmentTag(
                  order: _order!,
                  shopName: 'KTown Aari Works',
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(ok ? 'Garment tag printed!' : 'Failed to print tag'),
                      backgroundColor: ok ? AppColors.success : AppColors.error,
                    ),
                  );
                }
              },
            ),
            const Divider(height: 1),

            // 5. Bluetooth Settings
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.settings_bluetooth, color: AppColors.warning, size: 22),
              ),
              title: const Text('Bluetooth Thermal Printer Settings',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text('Scan, pair, connect & test thermal printers'),
              onTap: () {
                Navigator.pop(ctx);
                context.push('/printer-settings');
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

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order Details')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_errorMessage != null || _order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order Details')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 12),
              Text(_errorMessage ?? 'Order not found'),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _fetchOrderDetail, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final order = _order!;
    final nextStatus = _getNextStatus(order.status);

    return Scaffold(
      appBar: AppBar(
        title: Text('Order #${order.orderId}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.print_outlined),
            tooltip: 'Print Options (Wi-Fi A4 & Thermal POS)',
            onPressed: _showPrintOptions,
          ),
          IconButton(
            icon: const Icon(Icons.draw_outlined),
            tooltip: 'Design Sketch',
            onPressed: () async {
              final sketch = await SketchPadModal.show(context, initialSketchUrl: order.sketchDataUrl);
              if (sketch != null && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Sketch updated')),
                );
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.cardDark : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      StatusBadge(status: order.status),
                      Text(
                        'Due: ${order.dueDate.split("T").first}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: order.isOverdue ? AppColors.error : AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  if (nextStatus != null) ...[
                    const SizedBox(height: 14),
                    CustomButton(
                      text: 'Advance to ${nextStatus.replaceAll("_", " ")}',
                      icon: Icons.fast_forward_rounded,
                      onPressed: () => _advanceStage(nextStatus),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Customer Contact Card
            if (order.customer != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.cardDark : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Customer Information',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                          child: Text(
                            order.customer!.initials,
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                order.customer!.name,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                order.customer!.mobile,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark
                                      ? AppColors.textSecondaryDark
                                      : AppColors.textSecondaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.call, color: AppColors.success),
                          onPressed: () => _callPhone(order.customer!.mobile),
                        ),
                        IconButton(
                          icon: const Icon(Icons.chat, color: AppColors.primary),
                          onPressed: () => _openWhatsApp(
                            order.customer!.mobile,
                            order.customer!.name,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Order Items List Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.cardDark : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Order Items & Services',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  if (order.items.isEmpty)
                    const Text('No products listed')
                  else
                    ...order.items.map((item) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  '${item.quantity}x ${item.productName ?? "Service"}',
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                                ),
                              ),
                              Text(
                                currencyFormatter.format(item.total),
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        )),
                  if (order.addOns.isNotEmpty) ...[
                    const Divider(height: 16),
                    const Text(
                      'Add-On Services',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    ...order.addOns.map((addOn) => Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '+ ${addOn.quantity}x ${addOn.name ?? "Add-On"}',
                              style: const TextStyle(fontSize: 13, color: AppColors.secondary),
                            ),
                            Text(
                              currencyFormatter.format(addOn.total),
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                        )),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Financial Summary Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.cardDark : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Payment Summary',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  _buildSummaryRow('Products Total', currencyFormatter.format(order.productTotal)),
                  if (order.addOnsTotal > 0)
                    _buildSummaryRow('Add-Ons Total', currencyFormatter.format(order.addOnsTotal)),
                  if (order.discount > 0)
                    _buildSummaryRow('Discount', '- ${currencyFormatter.format(order.discount)}'),
                  if (order.deliveryCharges > 0)
                    _buildSummaryRow('Delivery Charges', currencyFormatter.format(order.deliveryCharges)),
                  const Divider(height: 20),
                  _buildSummaryRow(
                    'Grand Total',
                    currencyFormatter.format(order.grandTotal),
                    isBold: true,
                    fontSize: 16,
                  ),
                  _buildSummaryRow('Advance Paid', currencyFormatter.format(order.advancePaid)),
                  _buildSummaryRow(
                    'Balance Due',
                    currencyFormatter.format(order.balanceDue),
                    isBold: true,
                    color: order.balanceDue > 0 ? AppColors.error : AppColors.success,
                    fontSize: 16,
                  ),
                  const SizedBox(height: 16),
                  if (order.balanceDue > 0)
                    CustomButton(
                      text: 'Collect Payment',
                      icon: Icons.payments_outlined,
                      backgroundColor: AppColors.success,
                      onPressed: _showAddPaymentModal,
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Voice Note Section
            VoiceNoteWidget(
              existingUrl: order.voiceNoteUrl,
              onRecordingComplete: (filePath) async {
                try {
                  final apiClient = ref.read(apiClientProvider);
                  await apiClient.put(
                    ApiEndpoints.orderDetail(order.id),
                    data: {'voiceNoteUrl': filePath},
                  );
                  _fetchOrderDetail();
                  return true;
                } catch (_) {
                  return false;
                }
              },
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(
    String label,
    String value, {
    bool isBold = false,
    Color? color,
    double fontSize = 14,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: isBold ? FontWeight.w700 : FontWeight.w500,
            ),
          ),
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
