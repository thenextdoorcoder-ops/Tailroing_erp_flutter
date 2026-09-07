import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/whatsapp_service.dart';
import '../../../core/services/haptic_service.dart';
import '../../../shared/models/order_model.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/staff_assignment_modal.dart';
import '../../../shared/widgets/payment_collection_modal.dart';
import '../providers/workboard_provider.dart';

class WorkboardKanbanScreen extends ConsumerStatefulWidget {
  const WorkboardKanbanScreen({super.key});

  @override
  ConsumerState<WorkboardKanbanScreen> createState() => _WorkboardKanbanScreenState();
}

class _WorkboardKanbanScreenState extends ConsumerState<WorkboardKanbanScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  // Calendar filter state
  String _selectedDateFilter = 'ALL'; // 'ALL', 'TODAY', 'TOMORROW', 'OVERDUE', 'CUSTOM'
  DateTime? _customSelectedDate;

  final List<Map<String, dynamic>> _stages = [
    {'key': 'ORDER_CREATED', 'label': 'Created', 'color': AppColors.statusCreated},
    {'key': 'DESIGNING_STARTED', 'label': 'Designing', 'color': AppColors.statusDesigning},
    {'key': 'CUTTING_STARTED', 'label': 'Cutting', 'color': AppColors.statusCutting},
    {'key': 'STITCHING_STARTED', 'label': 'Stitching', 'color': AppColors.statusStitching},
    {'key': 'READY_TO_DELIVER', 'label': 'Ready', 'color': AppColors.statusReady},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _stages.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String? _getNextStage(String current) {
    switch (current) {
      case 'ORDER_CREATED':
        return 'DESIGNING_STARTED';
      case 'DESIGNING_STARTED':
        return 'CUTTING_STARTED';
      case 'CUTTING_STARTED':
        return 'STITCHING_STARTED';
      case 'STITCHING_STARTED':
        return 'READY_TO_DELIVER';
      case 'READY_TO_DELIVER':
        return 'DELIVERED';
      default:
        return null;
    }
  }

  String _getNextStageLabel(String? nextStage) {
    if (nextStage == null) return '';
    switch (nextStage) {
      case 'DESIGNING_STARTED':
        return 'Start Designing';
      case 'CUTTING_STARTED':
        return 'Start Cutting';
      case 'STITCHING_STARTED':
        return 'Start Stitching';
      case 'READY_TO_DELIVER':
        return 'Mark Ready';
      case 'DELIVERED':
        return 'Mark Delivered';
      default:
        return 'Advance Stage';
    }
  }

  List<OrderModel> _filterOrdersByDate(List<OrderModel> orders) {
    if (_selectedDateFilter == 'ALL') return orders;

    final now = DateTime.now();
    final todayStr = DateFormat('yyyy-MM-dd').format(now);
    final tomorrowStr = DateFormat('yyyy-MM-dd').format(now.add(const Duration(days: 1)));

    return orders.where((order) {
      final orderDateStr = order.dueDate.isNotEmpty ? order.dueDate.split('T').first : '';

      switch (_selectedDateFilter) {
        case 'TODAY':
          return orderDateStr == todayStr;
        case 'TOMORROW':
          return orderDateStr == tomorrowStr;
        case 'OVERDUE':
          return order.isOverdue;
        case 'CUSTOM':
          if (_customSelectedDate == null) return true;
          final customStr = DateFormat('yyyy-MM-dd').format(_customSelectedDate!);
          return orderDateStr == customStr;
        default:
          return true;
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final workboardState = ref.watch(workboardProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Production Workboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Workboard',
            onPressed: () {
              HapticService.lightTap();
              ref.read(workboardProvider.notifier).loadWorkboard();
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(104),
          child: Column(
            children: [
              // 1. Calendar Day Filter Strip
              _buildCalendarFilterStrip(isDark),

              // 2. Solid Capsule Stage Selector Bar
              _buildStageSegmentedBar(workboardState.value, isDark),
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
              return ref.read(workboardProvider.notifier).loadWorkboard();
            },
            color: AppColors.primary,
            child: workboardState.when(
              loading: () => const SingleChildScrollView(
                padding: EdgeInsets.all(16),
                child: LoadingShimmer(count: 5, height: 130),
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
                        onPressed: () => ref.read(workboardProvider.notifier).loadWorkboard(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (data) {
                return TabBarView(
                  controller: _tabController,
                  children: _stages.map((s) {
                    final stageKey = s['key'] as String;
                    final rawOrders = data[stageKey] ?? [];
                    final orders = _filterOrdersByDate(rawOrders);

                    if (orders.isEmpty) {
                      return EmptyState(
                        icon: Icons.assignment_turned_in_outlined,
                        title: 'No jobs in ${s['label']}',
                        message: _selectedDateFilter != 'ALL'
                            ? 'No jobs match your selected calendar filter (${_selectedDateFilter.toLowerCase()}).'
                            : 'Orders will show up here as they advance in the tailoring lifecycle.',
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 80),
                      itemCount: orders.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (ctx, i) {
                        final order = orders[i];
                        final next = _getNextStage(order.status);
                        final stageColor = s['color'] as Color;

                        return _buildJobCard(context, order, next, stageColor, isDark, currencyFormatter);
                      },
                    );
                  }).toList(),
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────── Calendar Date Filter Strip ───────────────
  Widget _buildCalendarFilterStrip(bool isDark) {
    final now = DateTime.now();

    final dateFilters = [
      {'key': 'ALL', 'label': 'All Dates', 'icon': Icons.calendar_view_week_rounded},
      {'key': 'TODAY', 'label': 'Today (${DateFormat('d MMM').format(now)})', 'icon': Icons.today_rounded},
      {'key': 'TOMORROW', 'label': 'Tomorrow (${DateFormat('d MMM').format(now.add(const Duration(days: 1)))})', 'icon': Icons.event_rounded},
      {'key': 'OVERDUE', 'label': 'Overdue ⚠️', 'icon': Icons.warning_amber_rounded},
    ];

    return Container(
      height: 38,
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 6),
      child: Row(
        children: [
          Expanded(
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: dateFilters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final item = dateFilters[i];
                final isSelected = _selectedDateFilter == item['key'];

                return GestureDetector(
                  onTap: () {
                    HapticService.selectionClick();
                    setState(() {
                      _selectedDateFilter = item['key'] as String;
                      _customSelectedDate = null;
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? (isDark ? AppColors.primary : AppColors.primary)
                          : (isDark ? const Color(0xFF161B28) : const Color(0xFFE8EEF5)),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primaryLight
                            : (isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFCBD5E1)),
                        width: 1,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.35),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          item['icon'] as IconData,
                          size: 14,
                          color: isSelected
                              ? Colors.white
                              : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          item['label'] as String,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            color: isSelected
                                ? Colors.white
                                : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(width: 8),
          // Custom Date Picker button
          GestureDetector(
            onTap: () async {
              HapticService.lightTap();
              final picked = await showDatePicker(
                context: context,
                initialDate: _customSelectedDate ?? DateTime.now(),
                firstDate: DateTime.now().subtract(const Duration(days: 90)),
                lastDate: DateTime.now().add(const Duration(days: 180)),
              );
              if (picked != null) {
                setState(() {
                  _selectedDateFilter = 'CUSTOM';
                  _customSelectedDate = picked;
                });
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: _selectedDateFilter == 'CUSTOM'
                    ? AppColors.primary
                    : (isDark ? const Color(0xFF161B28) : const Color(0xFFE8EEF5)),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _selectedDateFilter == 'CUSTOM'
                      ? AppColors.primaryLight
                      : (isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFCBD5E1)),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.date_range_rounded,
                    size: 15,
                    color: _selectedDateFilter == 'CUSTOM'
                        ? Colors.white
                        : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                  ),
                  if (_selectedDateFilter == 'CUSTOM' && _customSelectedDate != null) ...[
                    const SizedBox(width: 4),
                    Text(
                      DateFormat('d MMM').format(_customSelectedDate!),
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────── Stage Segmented Bar with Live Counts ───────────────
  Widget _buildStageSegmentedBar(Map<String, List<OrderModel>>? data, bool isDark) {
    return Container(
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
        onTap: (idx) => HapticService.selectionClick(),
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        dividerColor: Colors.transparent,
        indicatorSize: TabBarIndicatorSize.tab,
        indicator: BoxDecoration(
          color: isDark ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: isDark ? AppColors.primary.withValues(alpha: 0.35) : Colors.black.withValues(alpha: 0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        labelColor: isDark ? Colors.white : AppColors.primary,
        labelStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
        unselectedLabelColor: isDark ? AppColors.textMutedDark : const Color(0xFF64748B),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        tabs: _stages.map((s) {
          final stageKey = s['key'] as String;
          final allForStage = data?[stageKey] ?? [];
          final filteredCount = _filterOrdersByDate(allForStage).length;

          return Tab(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Row(
                children: [
                  Text(s['label'] as String),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: (s['color'] as Color).withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$filteredCount',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: s['color'] as Color,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ─────────────── Luxury Job Card ───────────────
  Widget _buildJobCard(
    BuildContext context,
    OrderModel order,
    String? nextStage,
    Color stageColor,
    bool isDark,
    NumberFormat currencyFormatter,
  ) {
    final isOverdue = order.isOverdue;
    final itemsSummary = order.items.isNotEmpty
        ? order.items.map((i) => '${i.quantity}x ${i.productName ?? "Garment"}').join(' • ')
        : 'Custom Tailoring Order';

    return AppCard(
      accentColor: isOverdue ? AppColors.error : stageColor,
      hasAccentBorder: true,
      padding: const EdgeInsets.all(16),
      borderRadius: 18,
      onTap: () => context.push('/orders/${order.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Order ID + Due Date Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '#${order.orderId}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
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
                      child: const Text(
                        '⚡ EXPRESS',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.secondary),
                      ),
                    ),
                  ],
                ],
              ),
              // Due Date with urgency
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isOverdue
                      ? AppColors.error.withValues(alpha: 0.15)
                      : (isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.04)),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isOverdue ? AppColors.error.withValues(alpha: 0.4) : Colors.transparent,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.schedule_rounded,
                      size: 13,
                      color: isOverdue ? AppColors.error : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isOverdue
                          ? 'OVERDUE (${order.dueDate.split("T").first})'
                          : 'Due: ${order.dueDate.split("T").first}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: isOverdue ? AppColors.error : (isDark ? Colors.white70 : AppColors.textPrimaryLight),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Client & Items row
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                child: Text(
                  order.customer != null && order.customer!.name.isNotEmpty
                      ? order.customer!.name[0].toUpperCase()
                      : 'C',
                  style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w900, fontSize: 13),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.customer?.name ?? 'Walk-in Customer',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppColors.textPrimaryLight,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      itemsSummary,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (order.customer?.mobile != null)
                IconButton(
                  icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18, color: Color(0xFF25D366)),
                  tooltip: 'WhatsApp Customer',
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

          // Worker Assignment & Balance Quick Badges
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              GestureDetector(
                onTap: () {
                  HapticService.lightTap();
                  StaffAssignmentModal.show(context, order: order);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E2433) : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isDark ? Colors.white12 : const Color(0xFFE2E8F0)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.person_add_alt_1_rounded, size: 13, color: AppColors.primary),
                      SizedBox(width: 5),
                      Text(
                        'Assign Tailor / Master',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
                      ),
                    ],
                  ),
                ),
              ),
              if (order.balanceDue > 0)
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
                          'Due: ${currencyFormatter.format(order.balanceDue)}',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.warning),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),

          // Bottom Action Bar on Card
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total: ${currencyFormatter.format(order.grandTotal)}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.primary),
              ),
              Row(
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      visualDensity: VisualDensity.compact,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.visibility_outlined, size: 14),
                    label: const Text('View', style: TextStyle(fontSize: 12)),
                    onPressed: () => context.push('/orders/${order.id}'),
                  ),
                  if (nextStage != null) ...[
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        visualDensity: VisualDensity.compact,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.arrow_forward_rounded, size: 14),
                      label: Text(_getNextStageLabel(nextStage), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                      onPressed: () async {
                        HapticService.mediumImpact();
                        final ok = await ref
                            .read(workboardProvider.notifier)
                            .advanceOrder(order.id, nextStage);
                        if (ok && context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Order #${order.orderId} moved to ${nextStage.replaceAll("_", " ")}! ✨'),
                              backgroundColor: AppColors.success,
                            ),
                          );
                        }
                      },
                    ),
                  ],
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
