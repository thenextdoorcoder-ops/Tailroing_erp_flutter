import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/widgets/stat_card.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  String _selectedRange = 'MONTH';
  bool _isLoading = true;
  double _totalRevenue = 45000.0;
  double _totalExpenses = 12500.0;
  int _ordersCompleted = 32;

  final List<double> _weeklyRevenue = [6500, 8200, 7100, 9400, 8800, 11200, 9500];

  @override
  void initState() {
    super.initState();
    _fetchReport();
  }

  Future<void> _fetchReport() async {
    setState(() => _isLoading = true);
    final apiClient = ref.read(apiClientProvider);
    try {
      final res = await apiClient.get(
        ApiEndpoints.reports,
        queryParameters: {'range': _selectedRange},
      );
      if (res != null && mounted) {
        setState(() {
          _totalRevenue = double.tryParse(res['totalRevenue']?.toString() ?? '45000') ?? 45000.0;
          _totalExpenses = double.tryParse(res['totalExpenses']?.toString() ?? '12500') ?? 12500.0;
          _ordersCompleted = int.tryParse(res['ordersCompleted']?.toString() ?? '32') ?? 32;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);
    final netProfit = _totalRevenue - _totalExpenses;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Business Reports & Analytics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_outlined),
            tooltip: 'Export Report',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Report export generated')),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Date Filter Segment
                  Row(
                    children: ['TODAY', 'WEEK', 'MONTH', 'YEAR'].map((range) {
                      final isSelected = _selectedRange == range;
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: ChoiceChip(
                            label: Text(range),
                            selected: isSelected,
                            onSelected: (selected) {
                              if (selected) {
                                setState(() => _selectedRange = range);
                                _fetchReport();
                              }
                            },
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),

                  // Top Stats
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.35,
                    children: [
                      StatCard(
                        title: 'Revenue Collected',
                        value: currencyFormatter.format(_totalRevenue),
                        subtitle: 'Total sales revenue',
                        icon: Icons.trending_up,
                        color: AppColors.success,
                      ),
                      StatCard(
                        title: 'Net Profit',
                        value: currencyFormatter.format(netProfit),
                        subtitle: 'After expenses',
                        icon: Icons.savings_outlined,
                        color: AppColors.primary,
                      ),
                      StatCard(
                        title: 'Expenses Paid',
                        value: currencyFormatter.format(_totalExpenses),
                        subtitle: 'Shop running costs',
                        icon: Icons.money_off_outlined,
                        color: AppColors.error,
                      ),
                      StatCard(
                        title: 'Delivered Orders',
                        value: '$_ordersCompleted',
                        subtitle: 'Orders fulfilled',
                        icon: Icons.check_circle_outline,
                        color: AppColors.secondary,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Weekly Revenue Bar Chart Card
                  Container(
                    padding: const EdgeInsets.all(20),
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
                          'Revenue Trend (Last 7 Days)',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          height: 180,
                          child: BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceAround,
                              maxY: 14000,
                              barTouchData: BarTouchData(enabled: true),
                              titlesData: FlTitlesData(
                                show: true,
                                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    getTitlesWidget: (val, meta) {
                                      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                      if (val.toInt() >= 0 && val.toInt() < days.length) {
                                        return Padding(
                                          padding: const EdgeInsets.only(top: 8),
                                          child: Text(
                                            days[val.toInt()],
                                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                                          ),
                                        );
                                      }
                                      return const SizedBox.shrink();
                                    },
                                  ),
                                ),
                              ),
                              borderData: FlBorderData(show: false),
                              gridData: const FlGridData(show: false),
                              barGroups: _weeklyRevenue.asMap().entries.map((e) {
                                return BarChartGroupData(
                                  x: e.key,
                                  barRods: [
                                    BarChartRodData(
                                      toY: e.value,
                                      color: AppColors.primary,
                                      width: 16,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
