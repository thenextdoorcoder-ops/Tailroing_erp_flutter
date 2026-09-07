import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/customer_model.dart';
import '../../../shared/models/order_model.dart';
import '../../../shared/models/measurement_model.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/loading_shimmer.dart';

class CustomerProfileScreen extends ConsumerStatefulWidget {
  final String customerId;

  const CustomerProfileScreen({super.key, required this.customerId});

  @override
  ConsumerState<CustomerProfileScreen> createState() => _CustomerProfileScreenState();
}

class _CustomerProfileScreenState extends ConsumerState<CustomerProfileScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  CustomerModel? _customer;
  List<OrderModel> _orders = [];
  List<MeasurementModel> _measurements = [];
  bool _isLoading = true;

  static final List<Color> _avatarPalette = [
    const Color(0xFF4E78F0), // Darzee Blue
    const Color(0xFFEC6689), // Coral Rose
    const Color(0xFF8B5CF6), // Royal Purple
    const Color(0xFF01C853), // Emerald Green
    const Color(0xFFF9A242), // Saffron Amber
    const Color(0xFF0EA5E9), // Sky Cyan
    const Color(0xFFE11D48), // Ruby Red
    const Color(0xFF10B981), // Teal Green
    const Color(0xFFD97706), // Golden Amber
    const Color(0xFF6366F1), // Indigo
  ];

  Color _getCustomerColor(String name) {
    if (name.isEmpty) return _avatarPalette[0];
    final hash = name.codeUnits.fold<int>(0, (prev, elem) => prev + elem);
    return _avatarPalette[hash % _avatarPalette.length];
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchCustomerProfile();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchCustomerProfile() async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final res = await apiClient.get(ApiEndpoints.customerDetail(widget.customerId));
      if (res != null && mounted) {
        setState(() {
          _customer = CustomerModel.fromJson(res);
          if (res['orders'] is List) {
            _orders = (res['orders'] as List).map((e) => OrderModel.fromJson(e)).toList();
          }
          if (res['measurements'] is List) {
            _measurements = (res['measurements'] as List).map((e) => MeasurementModel.fromJson(e)).toList();
          }
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _callCustomer(String phone) async {
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) await launchUrl(url);
  }

  Future<void> _whatsAppCustomer(String phone, String name) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final url = Uri.parse('https://wa.me/91$clean?text=Hello%20$name,%20greetings%20from%20KTown%20Aari%20Works!');
    if (await canLaunchUrl(url)) await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyFormatter = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Customer Profile')),
        body: const SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            children: [
              LoadingShimmer(count: 1, height: 110),
              SizedBox(height: 16),
              LoadingShimmer(count: 4, height: 70),
            ],
          ),
        ),
      );
    }

    if (_customer == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Customer Profile')),
        body: const Center(child: Text('Customer not found')),
      );
    }

    final cust = _customer!;
    final custColor = _getCustomerColor(cust.name);

    return Scaffold(
      appBar: AppBar(
        title: Text(cust.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            tooltip: 'Take New Measurement',
            onPressed: () => context.push('/measurements/new?customerId=${cust.id}'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Profile Header Card
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.cardDark : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF263238).withValues(alpha: isDark ? 0.20 : 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        custColor.withValues(alpha: 0.20),
                        custColor.withValues(alpha: 0.07),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    border: Border.all(
                      color: custColor.withValues(alpha: 0.35),
                      width: 1.8,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      cust.initials,
                      style: TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: custColor,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cust.name,
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                      ),
                      Text(
                        cust.mobile,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                        ),
                      ),
                      if (cust.address != null && cust.address!.isNotEmpty)
                        Text(
                          cust.address!,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.call, color: AppColors.success),
                  onPressed: () => _callCustomer(cust.mobile),
                ),
                IconButton(
                  icon: const Icon(Icons.chat, color: AppColors.primary),
                  onPressed: () => _whatsAppCustomer(cust.mobile, cust.name),
                ),
              ],
            ),
          ),

          // Tabs
          TabBar(
            controller: _tabController,
            indicatorColor: AppColors.primary,
            labelColor: AppColors.primary,
            unselectedLabelColor: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            tabs: const [
              Tab(text: 'Orders'),
              Tab(text: 'Measurements'),
              Tab(text: 'Preferences'),
            ],
          ),

          // Tab Views
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // 1. Orders Tab
                _orders.isEmpty
                    ? const Center(child: Text('No orders yet'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (ctx, i) {
                          final o = _orders[i];
                          return ListTile(
                            tileColor: isDark ? AppColors.cardDark : Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            title: Text('#${o.orderId} — ${currencyFormatter.format(o.grandTotal)}'),
                            subtitle: Text('Due: ${o.dueDate.split("T").first}'),
                            trailing: StatusBadge(status: o.status, isCompact: true),
                            onTap: () => context.push('/orders/${o.id}'),
                          );
                        },
                      ),

                // 2. Measurements Tab
                _measurements.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('No measurement records yet'),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: () => context.push('/measurements/new?customerId=${cust.id}'),
                              child: const Text('Add Measurement'),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _measurements.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (ctx, i) {
                          final m = _measurements[i];
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        m.type,
                                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                                      ),
                                      if (m.fitStyle != null)
                                        Chip(
                                          label: Text(m.fitStyle!),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Wrap(
                                    spacing: 12,
                                    runSpacing: 4,
                                    children: m.data.entries.map((e) {
                                      return Text(
                                        '${e.key}: ${e.value}"',
                                        style: const TextStyle(fontSize: 12),
                                      );
                                    }).toList(),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),

                // 3. Preferences Tab
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildInfoTile('Preferred Style', cust.preferredStyle ?? 'Not specified'),
                      _buildInfoTile('Special Occasion', cust.specialOccasion ?? 'Not specified'),
                      _buildInfoTile('Profession', cust.profession ?? 'Not specified'),
                      _buildInfoTile('City', cust.city ?? 'Not specified'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTile(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
