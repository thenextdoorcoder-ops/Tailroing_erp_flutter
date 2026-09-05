import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';

// ──────────── Attender Model ────────────
class AttenderModel {
  final String id;
  final String name;
  final bool isActive;
  final int orderCount;

  AttenderModel({
    required this.id,
    required this.name,
    this.isActive = true,
    this.orderCount = 0,
  });

  factory AttenderModel.fromJson(Map<String, dynamic> json) => AttenderModel(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        isActive: json['isActive'] as bool? ?? true,
        orderCount: (json['_count']?['orders'] as int?) ?? 0,
      );
}

// ──────────── Provider ────────────
final attendersProvider = FutureProvider<List<AttenderModel>>((ref) async {
  final client = ref.read(apiClientProvider);
  final response = await client.get(ApiEndpoints.attenders);
  if (response is List) {
    return response.map((j) => AttenderModel.fromJson(j as Map<String, dynamic>)).toList();
  }
  return [];
});

// ──────────── Screen ────────────
class AttendersScreen extends ConsumerStatefulWidget {
  const AttendersScreen({super.key});

  @override
  ConsumerState<AttendersScreen> createState() => _AttendersScreenState();
}

class _AttendersScreenState extends ConsumerState<AttendersScreen> {
  final _nameCtrl = TextEditingController();

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  void _showAddDialog() {
    _nameCtrl.clear();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Add Attender / Referral Source'),
        content: TextField(
          controller: _nameCtrl,
          decoration: const InputDecoration(
            labelText: 'Name',
            hintText: 'e.g. Sunita Sharma',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
          textCapitalization: TextCapitalization.words,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              final name = _nameCtrl.text.trim();
              if (name.isEmpty) return;
              Navigator.pop(ctx);
              final client = ref.read(apiClientProvider);
              await client.post(ApiEndpoints.attenders, data: {'name': name});
              ref.invalidate(attendersProvider);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final attendersAsync = ref.watch(attendersProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attenders & Referrals'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Add Attender',
            onPressed: _showAddDialog,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(attendersProvider),
        child: attendersAsync.when(
          loading: () =>
              const SingleChildScrollView(child: LoadingShimmer(count: 6, height: 72)),
          error: (e, _) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                const SizedBox(height: 12),
                Text(e.toString(), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(attendersProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
          data: (attenders) {
            if (attenders.isEmpty) {
              return const EmptyState(
                title: 'No attenders yet',
                message: 'Attenders track who referred customers to your shop. Add your first one!',
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: attenders.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (ctx, i) {
                final a = attenders[i];
                final color = _colorForIndex(i);
                return AppCard(
                  accentColor: color,
                  hasAccentBorder: true,
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            a.name.isNotEmpty ? a.name[0].toUpperCase() : '?',
                            style: TextStyle(
                              color: color,
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
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
                              a.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${a.orderCount} order${a.orderCount == 1 ? '' : 's'} referred',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark
                                    ? AppColors.textSecondaryDark
                                    : AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: a.isActive
                              ? AppColors.success.withValues(alpha: 0.12)
                              : AppColors.textMutedLight.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          a.isActive ? 'Active' : 'Inactive',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: a.isActive ? AppColors.success : AppColors.textMutedLight,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Color _colorForIndex(int i) {
    final colors = [
      AppColors.primary,
      AppColors.secondary,
      AppColors.accent,
      AppColors.warning,
      AppColors.info,
      AppColors.statusDesigning,
    ];
    return colors[i % colors.length];
  }
}
