import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/haptic_service.dart';
import '../../../core/services/whatsapp_service.dart';
import '../../../shared/models/order_model.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/barcode_scanner_modal.dart';
import '../../../shared/widgets/animated_list_item.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final dashboardState = ref.watch(dashboardProvider);
    final user = authState.value;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: RefreshIndicator(
              onRefresh: () {
                HapticService.mediumImpact();
                return ref.read(dashboardProvider.notifier).refresh();
              },
              color: AppColors.primary,
              backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
              child: dashboardState.when(
                loading: () => const SingleChildScrollView(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    children: [
                      LoadingShimmer(count: 1, height: 90),
                      SizedBox(height: 14),
                      LoadingShimmer(count: 1, height: 140),
                      SizedBox(height: 14),
                      LoadingShimmer(count: 1, height: 75),
                      SizedBox(height: 14),
                      LoadingShimmer(count: 2, height: 110),
                    ],
                  ),
                ),
                error: (error, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: AppColors.error.withValues(alpha: 0.10),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.wifi_off_rounded, size: 36, color: AppColors.error),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Connection Issue',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : AppColors.primaryDark,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          error.toString(),
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 18),
                        ElevatedButton.icon(
                          onPressed: () => ref.read(dashboardProvider.notifier).refresh(),
                          icon: const Icon(Icons.refresh_rounded, size: 18),
                          label: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
                data: (DashboardData data) {
                  return CustomScrollView(
                    physics: const BouncingScrollPhysics(
                      parent: AlwaysScrollableScrollPhysics(),
                    ),
                    slivers: [
                      // 1. Studio Header Bar
                      SliverToBoxAdapter(
                        child: _buildHeader(context, user, isDark),
                      ),

                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                        sliver: SliverList(
                          delegate: SliverChildListDelegate([
                            // 2. Quick Action Dock (4 Clean Pastel Buttons)
                            _buildQuickActionDock(context, isDark),
                            const SizedBox(height: 14),

                            // 3. Consolidated Studio Financial & Operations Summary (Single unified card)
                            _buildStudioSummaryCard(context, data, isDark, currencyFormatter),
                            const SizedBox(height: 18),

                            // 4. Production Workflow Pipeline (Live stage counts)
                            _buildProductionPipeline(context, data, isDark),
                            const SizedBox(height: 18),

                            // 5. Overdue Deliveries Section (if any)
                            _buildOverdueSection(context, data, user, isDark, currencyFormatter),

                            // 6. Recent Client Orders (Clean editorial list with inspiring empty state)
                            _buildRecentOrdersSection(context, data, user, isDark, currencyFormatter),
                          ]),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────── 1. Studio Header Bar ───────────────
  Widget _buildHeader(BuildContext context, dynamic user, bool isDark) {
    final now = DateTime.now();
    final greeting = _getGreeting(now.hour);
    final shopName = user?.shopName ?? 'KTown Aari Works';
    final userInitial = (user != null && user.firstName != null && user.firstName.isNotEmpty)
        ? user.firstName[0].toUpperCase()
        : 'K';

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Monogram + Shop Title
          Expanded(
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(13),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      userInitial,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              shopName,
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                                color: isDark ? Colors.white : AppColors.primaryDark,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Text(
                              'STUDIO',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                                letterSpacing: 0.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$greeting, ${user?.fullName ?? "Master Tailor"}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Barcode Scan Button
          GestureDetector(
            onTap: () async {
              HapticService.lightTap();
              final code = await BarcodeScannerModal.scan(context);
              if (code != null && context.mounted) {
                _handleScannedBarcode(context, code);
              }
            },
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isDark ? AppColors.cardDark : Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.20 : 0.04),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.qr_code_scanner_rounded,
                color: AppColors.primary,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─────────────── 2. Quick Action Dock (4 Clean Pastel Buttons) ───────────────
  Widget _buildQuickActionDock(BuildContext context, bool isDark) {
    final actions = [
      {
        'title': 'New Order',
        'icon': Icons.add_circle_outline_rounded,
        'color': AppColors.primary,
        'bg': AppColors.primary.withValues(alpha: 0.10),
        'route': '/orders/new',
      },
      {
        'title': 'Add Client',
        'icon': Icons.person_add_alt_rounded,
        'color': AppColors.secondary,
        'bg': AppColors.secondary.withValues(alpha: 0.10),
        'route': '/customers/new',
      },
      {
        'title': 'Workboard',
        'icon': Icons.view_kanban_outlined,
        'color': const Color(0xFF8B5CF6),
        'bg': const Color(0xFF8B5CF6).withValues(alpha: 0.10),
        'route': '/workboard',
      },
      {
        'title': 'Catalog',
        'icon': Icons.photo_library_outlined,
        'color': AppColors.warning,
        'bg': AppColors.warning.withValues(alpha: 0.12),
        'route': '/gallery',
      },
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF263238).withValues(alpha: isDark ? 0.20 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: actions.map((a) {
          final color = a['color'] as Color;
          final bg = a['bg'] as Color;

          return Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                HapticService.lightTap();
                context.push(a['route'] as String);
              },
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: bg,
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Icon(a['icon'] as IconData, color: color, size: 22),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    a['title'] as String,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : AppColors.textPrimaryLight,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ─────────────── 3. Consolidated Studio Financial & Operations Summary ───────────────
  Widget _buildStudioSummaryCard(
      BuildContext context, DashboardData data, bool isDark, NumberFormat currency) {
    final todayOrders = data.totalOrdersToday;
    final todayRev = data.revenueToday;
    final balanceDue = data.balanceDueTotal;
    final inProduction = data.activeOrdersCount;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF263238).withValues(alpha: isDark ? 0.20 : 0.04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Banner: Today's Revenue & Total Orders
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "TODAY'S OVERVIEW",
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.6,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    currency.format(todayRev),
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                      color: isDark ? Colors.white : AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    todayRev == 0 ? 'Advance collections will appear here' : 'Advance received today',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: AppColors.success,
                    ),
                  ),
                ],
              ),

              // Orders Pill
              GestureDetector(
                onTap: () => context.push('/orders'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '$todayOrders',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                      const Text(
                        'Orders',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          Divider(
            height: 1,
            thickness: 1,
            color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
          ),
          const SizedBox(height: 12),

          // Bottom Metrics: Balance Due & In Production
          Row(
            children: [
              // Balance Due
              Expanded(
                child: GestureDetector(
                  onTap: () => context.push('/orders'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppColors.warning.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.hourglass_top_rounded, color: AppColors.warning, size: 16),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Balance Due',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 1),
                              Text(
                                currency.format(balanceDue),
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : AppColors.textPrimaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // In Production
              Expanded(
                child: GestureDetector(
                  onTap: () => context.push('/workboard'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF141B2D) : AppColors.cardTintLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.precision_manufacturing_rounded, color: Color(0xFF8B5CF6), size: 16),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'In Production',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 1),
                              Text(
                                '$inProduction active',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: isDark ? Colors.white : AppColors.textPrimaryLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─────────────── 4. Production Workflow Pipeline ───────────────
  Widget _buildProductionPipeline(
      BuildContext context, DashboardData data, bool isDark) {
    final stages = [
      {
        'label': 'Created',
        'count': data.ordersByStage['CREATED'] ?? 0,
        'color': AppColors.statusCreated,
        'icon': Icons.add_circle_outline_rounded,
      },
      {
        'label': 'Designing',
        'count': data.ordersByStage['DESIGNING'] ?? 0,
        'color': AppColors.statusDesigning,
        'icon': Icons.palette_outlined,
      },
      {
        'label': 'Cutting',
        'count': data.ordersByStage['CUTTING'] ?? 0,
        'color': AppColors.statusCutting,
        'icon': Icons.content_cut_rounded,
      },
      {
        'label': 'Stitching',
        'count': data.ordersByStage['STITCHING'] ?? 0,
        'color': AppColors.statusStitching,
        'icon': Icons.precision_manufacturing_outlined,
      },
      {
        'label': 'Ready',
        'count': data.ordersByStage['READY'] ?? 0,
        'color': AppColors.statusReady,
        'icon': Icons.check_circle_outline_rounded,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 2),
              child: Text(
                'Production Workflow',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : AppColors.primaryDark,
                ),
              ),
            ),
            GestureDetector(
              onTap: () {
                HapticService.lightTap();
                context.push('/workboard');
              },
              child: const Row(
                children: [
                  Text(
                    'Workboard',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  SizedBox(width: 2),
                  Icon(Icons.chevron_right_rounded, size: 16, color: AppColors.primary),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 64,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: stages.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (ctx, i) {
              final stage = stages[i];
              final color = stage['color'] as Color;
              final count = stage['count'] as int;

              return GestureDetector(
                onTap: () {
                  HapticService.lightTap();
                  context.push('/workboard');
                },
                child: Container(
                  width: 114,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.cardDark : Colors.white,
                    borderRadius: BorderRadius.circular(13),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF263238).withValues(alpha: isDark ? 0.15 : 0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 30,
                        height: 30,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(stage['icon'] as IconData, color: color, size: 15),
                      ),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              stage['label'] as String,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 1),
                            Text(
                              '$count orders',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: count > 0 ? color : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ─────────────── 5. Overdue Deliveries Section ───────────────
  Widget _buildOverdueSection(BuildContext context, DashboardData data,
      dynamic user, bool isDark, NumberFormat currency) {
    final overdueOrders = data.overdueOrders;
    if (overdueOrders.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 2, bottom: 8),
          child: Row(
            children: [
              const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 16),
              const SizedBox(width: 6),
              Text(
                'Urgent / Overdue Deliveries',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : AppColors.primaryDark,
                ),
              ),
            ],
          ),
        ),
        ...overdueOrders.take(2).map((order) {
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isDark ? AppColors.cardDark : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppColors.error.withValues(alpha: 0.30),
                width: 0.8,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.error.withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                _buildGarmentThumbnail(order, isDark, isAlert: true),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              order.customer?.name ?? 'Client Order',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : AppColors.textPrimaryLight,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: AppColors.error.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Text(
                              'OVERDUE',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: AppColors.error,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '#${order.orderId.substring(0, order.orderId.length > 8 ? 8 : order.orderId.length).toUpperCase()} • Due: ${_formatDueDate(order.dueDate)}',
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _buildWhatsAppButton(order, user),
              ],
            ),
          );
        }),
        const SizedBox(height: 10),
      ],
    );
  }

  // ─────────────── 6. Recent Client Orders & Inspiring Empty State ───────────────
  Widget _buildRecentOrdersSection(BuildContext context, DashboardData data,
      dynamic user, bool isDark, NumberFormat currency) {
    final recentOrders = data.recentOrders;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Padding(
              padding: const EdgeInsets.only(left: 2),
              child: Text(
                'Recent Client Orders',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : AppColors.primaryDark,
                ),
              ),
            ),
            if (recentOrders.isNotEmpty)
              GestureDetector(
                onTap: () {
                  HapticService.lightTap();
                  context.push('/orders');
                },
                child: const Row(
                  children: [
                    Text(
                      'View All',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                    SizedBox(width: 2),
                    Icon(Icons.chevron_right_rounded, size: 16, color: AppColors.primary),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (recentOrders.isEmpty)
          // Clean Boutique Studio Empty State
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: isDark ? AppColors.cardDark : Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF263238).withValues(alpha: isDark ? 0.20 : 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Icon(Icons.checkroom_rounded, color: AppColors.primary, size: 24),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Studio Workspace Active',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: isDark ? Colors.white : AppColors.primaryDark,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'Capture bespoke client measurements, book custom stitching orders, and monitor your workflow.',
                            style: TextStyle(
                              fontSize: 12,
                              height: 1.35,
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  height: 42,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      HapticService.lightTap();
                      context.push('/orders/new');
                    },
                    icon: const Icon(Icons.add_rounded, size: 17),
                    label: const Text(
                      'Create First Order',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: recentOrders.length > 5 ? 5 : recentOrders.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) {
              final order = recentOrders[i];
              return AnimatedListItem(
                index: i,
                child: _buildVisualOrderCard(context, order, user, isDark, currency),
              );
            },
          ),
      ],
    );
  }

  Widget _buildVisualOrderCard(BuildContext context, OrderModel order, dynamic user,
      bool isDark, NumberFormat currency) {
    final clientName = order.customer?.name ?? 'Bespoke Client';
    final shortId = order.orderId.length > 8 ? order.orderId.substring(0, 8).toUpperCase() : order.orderId.toUpperCase();
    final isPaid = order.balanceDue <= 0;

    return GestureDetector(
      onTap: () {
        HapticService.lightTap();
        context.push('/orders/${order.orderId}');
      },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.cardDark : Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF263238).withValues(alpha: isDark ? 0.20 : 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildGarmentThumbnail(order, isDark),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Text(
                              clientName,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : AppColors.textPrimaryLight,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          StatusBadge(status: order.status),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '#$shortId • ${_getGarmentSubtitle(order)}',
                        style: TextStyle(
                          fontSize: 11.5,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.calendar_today_outlined,
                            size: 11,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Due: ${_formatDueDate(order.dueDate)}',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),
            Divider(
              height: 1,
              thickness: 1,
              color: isDark ? AppColors.dividerDark : AppColors.dividerLight,
            ),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      currency.format(order.grandTotal),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : AppColors.primaryDark,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: isPaid
                            ? AppColors.success.withValues(alpha: 0.10)
                            : AppColors.warning.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        isPaid ? 'PAID' : 'Due: ${currency.format(order.balanceDue)}',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          color: isPaid ? AppColors.success : AppColors.warning,
                        ),
                      ),
                    ),
                  ],
                ),
                _buildWhatsAppButton(order, user),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────── Helper Components ───────────────
  Widget _buildGarmentThumbnail(OrderModel order, bool isDark, {bool isAlert = false}) {
    final hasImage = order.sketchDataUrl != null && order.sketchDataUrl!.isNotEmpty;

    return Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
        color: isAlert
            ? AppColors.error.withValues(alpha: 0.10)
            : (isDark ? const Color(0xFF141B2D) : AppColors.backgroundLight),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: hasImage
            ? CachedNetworkImage(
                imageUrl: order.sketchDataUrl!,
                fit: BoxFit.cover,
                placeholder: (_, __) => _buildPlaceholderIcon(order, isDark, isAlert),
                errorWidget: (_, __, ___) => _buildPlaceholderIcon(order, isDark, isAlert),
              )
            : _buildPlaceholderIcon(order, isDark, isAlert),
      ),
    );
  }

  Widget _buildPlaceholderIcon(OrderModel order, bool isDark, bool isAlert) {
    final iconColor = isAlert
        ? AppColors.error
        : (isDark ? AppColors.primaryLight : AppColors.primary);

    return Center(
      child: Icon(
        Icons.checkroom_rounded,
        size: 22,
        color: iconColor,
      ),
    );
  }

  Widget _buildWhatsAppButton(OrderModel order, dynamic user) {
    final hasPhone = order.customer != null &&
        ((order.customer!.whatsapp != null && order.customer!.whatsapp!.isNotEmpty) ||
            order.customer!.mobile.isNotEmpty);

    return GestureDetector(
      onTap: () {
        HapticService.lightTap();
        if (!hasPhone) return;
        final phone = (order.customer!.whatsapp?.isNotEmpty ?? false)
            ? order.customer!.whatsapp!
            : order.customer!.mobile;
        final shopName = user?.shopName ?? 'KTown Aari Works';
        final itemNames = order.items.map((e) => e.productName ?? 'Bridal Aari Blouse').toList();
        final msg = WhatsAppService.buildOrderMessage(
          status: order.status,
          customerName: order.customer?.name ?? 'Valued Client',
          orderId: order.orderId.length > 8 ? order.orderId.substring(0, 8).toUpperCase() : order.orderId.toUpperCase(),
          shopName: shopName,
          itemNames: itemNames.isNotEmpty ? itemNames : ['Bridal Aari Blouse'],
        );
        WhatsAppService.sendMessage(phone: phone, message: msg);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.accent.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(7),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chat_bubble_rounded, color: AppColors.accent, size: 12),
            SizedBox(width: 4),
            Text(
              'WhatsApp',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                color: AppColors.accent,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getGarmentSubtitle(OrderModel order) {
    if (order.items.isNotEmpty) {
      return order.items.map((e) => e.productName ?? 'Bridal Aari Blouse').join(', ');
    }
    return 'Bridal Aari Blouse & Embroidery';
  }

  String _formatDueDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'No due date';
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = date.difference(now).inDays;
      final formatted = DateFormat('dd MMM').format(date);
      if (diff < 0) return '$formatted (${diff.abs()}d overdue)';
      if (diff == 0) return '$formatted (Today)';
      if (diff == 1) return '$formatted (Tomorrow)';
      return '$formatted (in ${diff}d)';
    } catch (_) {
      return dateStr;
    }
  }

  String _getGreeting(int hour) {
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  void _handleScannedBarcode(BuildContext context, String code) {
    if (code.startsWith('ORD-') || code.length >= 6) {
      context.push('/orders/$code');
    }
  }
}
