import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_animations.dart';
import '../../../core/services/haptic_service.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/animated_list_item.dart';
import '../../dashboard/screens/dashboard_screen.dart';
import '../../orders/screens/orders_list_screen.dart';
import '../../customers/screens/customers_list_screen.dart';
import '../../workboard/screens/workboard_kanban_screen.dart';

class MainShellScreen extends StatefulWidget {
  final int initialIndex;

  const MainShellScreen({super.key, this.initialIndex = 0});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  final List<Widget> _screens = [
    const DashboardScreen(),
    const OrdersListScreen(),
    const CustomersListScreen(),
    const WorkboardKanbanScreen(),
    const _MoreMenuScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: AnimatedSwitcher(
        duration: AppAnimations.short,
        switchInCurve: AppAnimations.smooth,
        switchOutCurve: AppAnimations.smooth,
        transitionBuilder: (child, animation) {
          return FadeTransition(opacity: animation, child: child);
        },
        child: KeyedSubtree(
          key: ValueKey<int>(_currentIndex),
          child: _screens[_currentIndex],
        ),
      ),
      bottomNavigationBar: _buildPremiumNavBar(isDark),
    );
  }

  Widget _buildPremiumNavBar(bool isDark) {
    return Center(
      heightFactor: 1.0,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 680),
        child: Container(
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            border: Border(
              top: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                width: 1.0,
              ),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.05),
                blurRadius: 16,
                offset: const Offset(0, -3),
              ),
            ],
          ),
          child: SafeArea(
            child: SizedBox(
              height: 62,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(0, Icons.dashboard_outlined, Icons.dashboard_rounded, 'Home', isDark),
                  _buildNavItem(1, Icons.receipt_long_outlined, Icons.receipt_long_rounded, 'Orders', isDark),
                  _buildNavItem(2, Icons.people_outline_rounded, Icons.people_rounded, 'Clients', isDark),
                  _buildNavItem(3, Icons.assignment_outlined, Icons.assignment_rounded, 'Workboard', isDark),
                  _buildNavItem(4, Icons.grid_view_outlined, Icons.grid_view_rounded, 'Hub', isDark),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label, bool isDark) {
    final isActive = _currentIndex == index;
    final activeColor = isDark ? AppColors.primaryLight : AppColors.primary;
    final inactiveColor = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        if (_currentIndex != index) {
          HapticService.lightTap();
          setState(() => _currentIndex = index);
        }
      },
      child: AnimatedContainer(
        duration: AppAnimations.short,
        curve: AppAnimations.spring,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isActive
              ? activeColor.withValues(alpha: 0.10)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedSwitcher(
              duration: AppAnimations.micro,
              child: Icon(
                isActive ? activeIcon : icon,
                key: ValueKey('nav_${index}_$isActive'),
                size: 22,
                color: isActive ? activeColor : inactiveColor,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                color: isActive ? activeColor : inactiveColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MoreMenuScreen extends StatelessWidget {
  const _MoreMenuScreen();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final items = [
      {'title': 'Blouse & Design Catalog', 'subtitle': 'Browse bridal portfolio', 'icon': Icons.photo_library_outlined, 'color': AppColors.primaryLight, 'route': '/gallery'},
      {'title': 'Staff Attendance', 'subtitle': 'Check-in & monthly logs', 'icon': Icons.how_to_reg_outlined, 'color': AppColors.secondary, 'route': '/attendance'},
      {'title': 'Raw Materials / Inventory', 'subtitle': 'Fabrics, threads & laces', 'icon': Icons.inventory_2_outlined, 'color': AppColors.info, 'route': '/inventory'},
      {'title': 'Shop Expenses', 'subtitle': 'Daily overheads & bills', 'icon': Icons.account_balance_wallet_outlined, 'color': AppColors.error, 'route': '/expenses'},
      {'title': 'Business Reports & Charts', 'subtitle': 'P&L, revenue & GST', 'icon': Icons.bar_chart_outlined, 'color': AppColors.success, 'route': '/reports'},
      {'title': 'Academy & Students', 'subtitle': 'Courses & fees ledger', 'icon': Icons.school_outlined, 'color': const Color(0xFFA855F7), 'route': '/students'},
      {'title': 'Enquiries & Leads', 'subtitle': 'Customer inquiries CRM', 'icon': Icons.contact_phone_outlined, 'color': AppColors.warning, 'route': '/enquiries'},
      {'title': 'Shop & App Settings', 'subtitle': 'Printers, theme & URL', 'icon': Icons.settings_outlined, 'color': AppColors.textMutedDark, 'route': '/settings'},
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('ERP Modules & Tools'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 680),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (ctx, i) {
              final item = items[i];
              final color = item['color'] as Color;

              return AnimatedListItem(
                index: i,
                child: AppCard(
                  accentColor: color,
                  hasAccentBorder: true,
                  padding: const EdgeInsets.all(14),
                  borderRadius: 18,
                  onTap: () => context.push(item['route'] as String),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                          border: Border.all(color: color.withValues(alpha: 0.25)),
                        ),
                        child: Icon(item['icon'] as IconData, color: color, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['title'] as String,
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item['subtitle'] as String,
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.chevron_right_rounded,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        size: 20,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
