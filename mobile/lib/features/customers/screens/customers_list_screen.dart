import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/whatsapp_service.dart';
import '../../../core/services/haptic_service.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/animated_list_item.dart';
import '../providers/customer_provider.dart';

class CustomersListScreen extends ConsumerStatefulWidget {
  const CustomersListScreen({super.key});

  @override
  ConsumerState<CustomersListScreen> createState() => _CustomersListScreenState();
}

class _CustomersListScreenState extends ConsumerState<CustomersListScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String query) {
    ref.read(customersListProvider.notifier).loadCustomers(search: query.trim());
  }

  Future<void> _callCustomer(String phone) async {
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    final customersState = ref.watch(customersListProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Clients & Customers'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: 'Search client by name, mobile, city...',
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
        ),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 680),
          child: RefreshIndicator(
            onRefresh: () {
              HapticService.mediumImpact();
              return ref.read(customersListProvider.notifier).loadCustomers();
            },
            color: AppColors.primary,
            child: customersState.when(
              loading: () => const SingleChildScrollView(
                padding: EdgeInsets.all(16),
                child: LoadingShimmer(count: 6, height: 80),
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
                        onPressed: () => ref.read(customersListProvider.notifier).loadCustomers(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
              data: (customers) {
                if (customers.isEmpty) {
                  return EmptyState(
                    icon: Icons.people_outline,
                    title: 'No Clients Found',
                    message: _searchController.text.isNotEmpty
                        ? 'No client matched "${_searchController.text}"'
                        : 'Add your first customer to start tracking tailoring orders & measurements.',
                    actionText: 'Add Client',
                    onAction: () => context.push('/customers/new'),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: customers.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, index) {
                    final customer = customers[index];

                    return AnimatedListItem(
                      index: index,
                      child: AppCard(
                      accentColor: AppColors.primary,
                      hasAccentBorder: true,
                      padding: const EdgeInsets.all(14),
                      borderRadius: 18,
                      onTap: () => context.push('/customers/${customer.id}'),
                      child: Row(
                        children: [
                          // Gradient ring avatar
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.primary.withValues(alpha: 0.15),
                                  AppColors.primaryLight.withValues(alpha: 0.08),
                                ],
                              ),
                              border: Border.all(
                                color: AppColors.primary.withValues(alpha: 0.25),
                                width: 1.5,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                customer.initials,
                                style: TextStyle(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),

                          // Customer Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  customer.name,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  customer.mobile,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: isDark
                                        ? AppColors.textSecondaryDark
                                        : AppColors.textSecondaryLight,
                                  ),
                                ),
                                if (customer.city != null && customer.city!.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                      customer.city!,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark
                                            ? AppColors.textMutedDark
                                            : AppColors.textMutedLight,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),

                          // Actions: WhatsApp & Call
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF25D366), size: 20),
                                tooltip: 'WhatsApp',
                                onPressed: () {
                                  WhatsAppService.sendMessage(
                                    phone: customer.mobile,
                                    message: 'Hello ${customer.name}, greetings from KTown Aari Works! 👗✨',
                                  );
                                },
                              ),
                              IconButton(
                                icon: const Icon(Icons.phone_outlined, color: AppColors.success, size: 20),
                                tooltip: 'Call Client',
                                onPressed: () => _callCustomer(customer.mobile),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ),
      floatingActionButton: Container(
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
            context.push('/customers/new');
          },
          backgroundColor: Colors.transparent,
          elevation: 0,
          hoverElevation: 0,
          focusElevation: 0,
          highlightElevation: 0,
          icon: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 20),
          label: const Text(
            'Add Client',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
          ),
        ),
      ),
    );
  }
}
