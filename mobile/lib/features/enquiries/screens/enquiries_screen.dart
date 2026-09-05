import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/enquiry_model.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';

class EnquiriesScreen extends ConsumerStatefulWidget {
  const EnquiriesScreen({super.key});

  @override
  ConsumerState<EnquiriesScreen> createState() => _EnquiriesScreenState();
}

class _EnquiriesScreenState extends ConsumerState<EnquiriesScreen> {
  List<EnquiryModel> _enquiries = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchEnquiries();
  }

  Future<void> _fetchEnquiries() async {
    setState(() => _isLoading = true);
    final apiClient = ref.read(apiClientProvider);
    try {
      final res = await apiClient.get(ApiEndpoints.enquiries);
      if (res != null && mounted) {
        final list = res is List ? res : (res['enquiries'] as List? ?? []);
        setState(() {
          _enquiries = list.map((e) => EnquiryModel.fromJson(e)).toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _callPhone(String phone) async {
    final url = Uri.parse('tel:$phone');
    if (await canLaunchUrl(url)) await launchUrl(url);
  }

  Future<void> _openWhatsApp(String phone, String name) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final url = Uri.parse('https://wa.me/91$cleanPhone?text=Hello%20$name,%20thank%20you%20for%20inquiring%20at%20KTown%20Aari%20Works!');
    if (await canLaunchUrl(url)) await launchUrl(url, mode: LaunchMode.externalApplication);
  }

  void _showNewEnquiryModal() {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final reqController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
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
            const Text('New Walk-In Enquiry', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 14),
            CustomTextField(
              controller: nameController,
              label: 'Prospect Name *',
              hint: 'e.g. Deepa Lakshmi',
            ),
            const SizedBox(height: 12),
            CustomTextField(
              controller: phoneController,
              label: 'Mobile Phone *',
              hint: '10-digit number',
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            CustomTextField(
              controller: reqController,
              label: 'Requirement & Garment Details',
              hint: 'e.g. Bridal blouse with peacock grand aari work needed before 25th Nov',
              maxLines: 2,
            ),
            const SizedBox(height: 20),
            CustomButton(
              text: 'Save Enquiry',
              onPressed: () async {
                if (nameController.text.trim().isEmpty || phoneController.text.trim().isEmpty) return;

                Navigator.pop(ctx);
                final apiClient = ref.read(apiClientProvider);
                try {
                  await apiClient.post(ApiEndpoints.enquiries, data: {
                    'name': nameController.text.trim(),
                    'mobile': phoneController.text.trim(),
                    'notes': reqController.text.trim(),
                  });
                  _fetchEnquiries();
                } catch (_) {}
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

    return Scaffold(
      appBar: AppBar(title: const Text('Enquiries & Walk-in Leads')),
      body: RefreshIndicator(
        onRefresh: _fetchEnquiries,
        child: _isLoading
            ? const LoadingShimmer(count: 5, height: 100)
            : _enquiries.isEmpty
                ? const EmptyState(
                    icon: Icons.contact_phone_outlined,
                    title: 'No Pending Enquiries',
                    message: 'Record inquiries from walk-in prospects and convert them to orders with 1 tap.',
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _enquiries.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (ctx, i) {
                      final enq = _enquiries[i];
                      final isConverted = enq.status == 'CONVERTED';

                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.cardDark : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: (isConverted ? AppColors.success : AppColors.warning).withValues(alpha: 0.12),
                                  child: Icon(
                                    isConverted ? Icons.check : Icons.person_search,
                                    color: isConverted ? AppColors.success : AppColors.warning,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(enq.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                      Text(enq.mobile, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.call, color: AppColors.success, size: 20),
                                  onPressed: () => _callPhone(enq.mobile),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.chat, color: AppColors.primary, size: 20),
                                  onPressed: () => _openWhatsApp(enq.mobile, enq.name),
                                ),
                              ],
                            ),
                            if (enq.notes != null && enq.notes!.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Text(enq.notes!, style: TextStyle(fontSize: 13, color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight)),
                            ],
                            const Divider(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: (isConverted ? AppColors.success : AppColors.warning).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    enq.status,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: isConverted ? AppColors.success : AppColors.warning,
                                    ),
                                  ),
                                ),
                                if (!isConverted)
                                  ElevatedButton.icon(
                                    icon: const Icon(Icons.shopping_bag_outlined, size: 16),
                                    label: const Text('Convert to Order'),
                                    onPressed: () => context.push('/orders/new'),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showNewEnquiryModal,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Enquiry', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
    );
  }
}
