import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/whatsapp_service.dart';
import '../../../core/services/haptic_service.dart';
import '../../../shared/models/order_model.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/barcode_scanner_modal.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/animated_list_item.dart';
import '../../../shared/widgets/payment_collection_modal.dart';
import '../providers/order_provider.dart';

class OrdersListScreen extends ConsumerStatefulWidget {
  final String? initialSearch;

  const OrdersListScreen({super.key, this.initialSearch});

  @override
  ConsumerState<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends ConsumerState<OrdersListScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, String>> _tabs = [
    {'label': 'All Orders', 'status': 'ALL'},
    {'label': 'In Progress', 'status': 'CUTTING_STARTED'},
    {'label': 'Ready', 'status': 'READY_TO_DELIVER'},
    {'label': 'Delivered', 'status': 'DELIVERED'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    if (widget.initialSearch != null) {
      _searchController.text = widget.initialSearch!;
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onTabChanged(int index) {
    final status = _tabs[index]['status']!;
    ref.read(ordersListProvider.notifier).loadOrders(status: status);
  }

  void _onSearch(String query) {
    ref.read(ordersListProvider.notifier).loadOrders(search: query.trim());
  }

  @override
  Widget build(BuildContext context) {
    final ordersState = ref.watch(ordersListProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan Barcode',
            onPressed: () async {
              final scanned = await BarcodeScannerModal.scan(context);
              if (scanned != null) {
                _searchController.text = scanned;
                _onSearch(scanned);
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.filter_list_rounded),
            onPressed: () => _showFilterBottomSheet(context),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(108),
          child: Column(
            children: [
              // Search Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: TextField(
                  controller: _searchController,
                  onChanged: _onSearch,
                  decoration: InputDecoration(
                    hintText: 'Search by Order ID, Customer, Mobile...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              _onSearch('');
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    filled: true,
                    fillColor: isDark ? AppColors.surfaceDark : Colors.grey.shade100,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),

              // Status Filter Tabs (Solid Capsule Segmented Control)
              Container(
                height: 42,
                margin: const EdgeInsets.fromLTRB(16, 4, 16, 10),
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF141824) : const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFCBD5E1),
                    width: 1,
                  ),
                ),
                child: TabBar(
                  controller: _tabController,
                  onTap: (idx) {
                    HapticService.selectionClick();
                    _onTabChanged(idx);
                  },
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  dividerColor: Colors.transparent,
                  indicatorSize: TabBarIndicatorSize.tab,
                  indicator: BoxDecoration(
                    color: isDark ? AppColors.primary : Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: isDark
                            ? AppColors.primary.withValues(alpha: 0.35)
                            : Colors.black.withValues(alpha: 0.08),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  labelColor: isDark ? Colors.white : AppColors.primary,
                  labelStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                  unselectedLabelColor: isDark ? AppColors.textMutedDark : const Color(0xFF64748B),
                  unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  tabs: _tabs.map((t) {
                    return Tab(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        child: Text(t['label']!),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 680),
          child: RefreshIndicator(
            onRefresh: () {
              HapticService.mediumImpact();
              return ref.read(ordersListProvider.notifier).loadOrders();
            },
            color: AppColors.primary,
            child: ordersState.when(
              loading: () => const SingleChildScrollView(
                padding: EdgeInsets.all(16),
                child: LoadingShimmer(count: 5, height: 110),
              ),
              error: (error, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                      const SizedBox(height: 12),
                      Text(error.toString(), textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.read(ordersListProvider.notifier).loadOrders(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (orders) {
                if (orders.isEmpty) {
                  return EmptyState(
                    icon: Icons.receipt_long_outlined,
                    title: 'No Orders Found',
                    message: _searchController.text.isNotEmpty
                        ? 'No matching orders found for "${_searchController.text}"'
                        : 'Create your first tailoring order to get started.',
                    actionText: 'Create New Order',
                    onAction: () => context.push('/orders/new'),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: orders.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, index) {
                    final order = orders[index];
                    return AnimatedListItem(
                      index: index,
                      child: _buildOrderCard(context, order, isDark, currencyFormatter),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ),
      floatingActionButton: (ordersState.value != null && ordersState.value!.isNotEmpty)
          ? Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: AppColors.primaryGradient,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.35),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: FloatingActionButton.extended(
                onPressed: () {
                  HapticService.mediumImpact();
                  context.push('/orders/new');
                },
                backgroundColor: Colors.transparent,
                elevation: 0,
                hoverElevation: 0,
                focusElevation: 0,
                highlightElevation: 0,
                icon: const Icon(Icons.add_rounded, color: Colors.white, size: 20),
                label: const Text(
                  'New Order',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildOrderCard(
    BuildContext context,
    OrderModel order,
    bool isDark,
    NumberFormat currencyFormatter,
  ) {
    final isOverdue = order.isOverdue;
    final color = isOverdue
        ? AppColors.error
        : (order.status == 'DELIVERED'
            ? AppColors.statusDelivered
            : (order.status == 'READY_TO_DELIVER' ? AppColors.statusReady : AppColors.primary));

    return AppCard(
      accentColor: color,
      hasAccentBorder: true,
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/orders/${order.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Order ID + Express Tag + Grand Total
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '#${order.orderId}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  if (order.deliveryOption == 'EXPRESS') ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.bolt, size: 12, color: AppColors.secondary),
                          Text(
                            'EXPRESS',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              Text(
                currencyFormatter.format(order.grandTotal),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Row 2: Customer Initial Avatar + Name + Mobile + WhatsApp Quick Button
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                child: Text(
                  order.customer != null && order.customer!.name.isNotEmpty
                      ? order.customer!.name[0].toUpperCase()
                      : 'C',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.customer?.name ?? 'Walk-in Client',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (order.customer?.mobile != null)
                      Text(
                        order.customer!.mobile,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                  ],
                ),
              ),
              if (order.customer?.mobile != null)
                IconButton(
                  icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18, color: Color(0xFF25D366)),
                  tooltip: 'WhatsApp Client',
                  onPressed: () {
                    final msg = WhatsAppService.buildOrderMessage(
                      customerName: order.customer!.name,
                      orderId: order.orderId,
                      status: order.status,
                      shopName: 'KTown Aari Works',
                      itemNames: order.items.map((i) => i.productName ?? 'Item').toList(),
                    );
                    WhatsAppService.sendMessage(phone: order.customer!.mobile, message: msg);
                  },
                ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 10),

          // Row 3: Status Badge + Balance Due + Due Date
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              StatusBadge(status: order.status, isCompact: true),
              Row(
                children: [
                  if (order.balanceDue > 0) ...[
                    GestureDetector(
                      onTap: () {
                        HapticService.lightTap();
                        PaymentCollectionModal.show(context, order: order);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.add_card_rounded, size: 12, color: AppColors.warning),
                            const SizedBox(width: 4),
                            Text(
                              'Collect: ${currencyFormatter.format(order.balanceDue)}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: AppColors.warning,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Row(
                    children: [
                      Icon(
                        Icons.event_outlined,
                        size: 14,
                        color: isOverdue ? AppColors.error : Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        order.dueDate.isNotEmpty ? order.dueDate.split('T').first : '-',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isOverdue ? FontWeight.w700 : FontWeight.w500,
                          color: isOverdue
                              ? AppColors.error
                              : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showFilterBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Filter Orders by Stage',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                'ALL',
                'ORDER_CREATED',
                'DESIGNING_STARTED',
                'CUTTING_STARTED',
                'STITCHING_STARTED',
                'READY_TO_DELIVER',
                'DELIVERED',
              ].map((stage) {
                return ActionChip(
                  label: Text(stage.replaceAll('_', ' ')),
                  onPressed: () {
                    Navigator.pop(ctx);
                    ref.read(ordersListProvider.notifier).loadOrders(status: stage);
                  },
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
