import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/course_model.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../../shared/widgets/status_badge.dart';

// ──────────── Student Model ────────────
class StudentModel {
  final String id;
  final String studentId;
  final String name;
  final String mobile;
  final String? courseName;
  final double totalFees;
  final double advancePaid;
  final double balanceAmount;
  final String status;
  final String joiningDate;

  StudentModel({
    required this.id,
    required this.studentId,
    required this.name,
    required this.mobile,
    this.courseName,
    this.totalFees = 0,
    this.advancePaid = 0,
    this.balanceAmount = 0,
    required this.status,
    required this.joiningDate,
  });

  factory StudentModel.fromJson(Map<String, dynamic> json) => StudentModel(
        id: json['id']?.toString() ?? '',
        studentId: json['studentId']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        mobile: json['mobile']?.toString() ?? '',
        courseName: json['course']?['name']?.toString(),
        totalFees: double.tryParse(json['totalFees']?.toString() ?? '0') ?? 0,
        advancePaid: double.tryParse(json['advancePaid']?.toString() ?? '0') ?? 0,
        balanceAmount: double.tryParse(json['balanceAmount']?.toString() ?? '0') ?? 0,
        status: json['status']?.toString() ?? 'ACTIVE',
        joiningDate: json['joiningDate']?.toString() ?? '',
      );

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    if (parts.isNotEmpty && parts[0].isNotEmpty) return parts[0][0].toUpperCase();
    return 'S';
  }
}

// ──────────── Providers ────────────
final studentsProvider = FutureProvider<List<StudentModel>>((ref) async {
  final client = ref.read(apiClientProvider);
  final response = await client.get(ApiEndpoints.students);
  if (response is List) {
    return response.map((j) => StudentModel.fromJson(j as Map<String, dynamic>)).toList();
  }
  if (response is Map && response['students'] is List) {
    return (response['students'] as List)
        .map((j) => StudentModel.fromJson(j as Map<String, dynamic>))
        .toList();
  }
  return [];
});

final coursesListProvider = FutureProvider<List<CourseModel>>((ref) async {
  final client = ref.read(apiClientProvider);
  final response = await client.get(ApiEndpoints.courses);
  if (response is List) {
    return response.map((j) => CourseModel.fromJson(j as Map<String, dynamic>)).toList();
  }
  return [];
});

// ──────────── Screen ────────────
class StudentsScreen extends ConsumerStatefulWidget {
  const StudentsScreen({super.key});

  @override
  ConsumerState<StudentsScreen> createState() => _StudentsScreenState();
}

class _StudentsScreenState extends ConsumerState<StudentsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _fmt = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showPaymentModal(StudentModel student) {
    final amountCtrl =
        TextEditingController(text: student.balanceAmount.toStringAsFixed(0));
    final notesCtrl = TextEditingController();
    String method = 'CASH';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
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
              Text(
                'Collect Payment — ${student.name}',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                'Balance: ${_fmt.format(student.balanceAmount)}',
                style: const TextStyle(color: AppColors.error, fontSize: 13),
              ),
              const SizedBox(height: 16),
              CustomTextField(
                controller: amountCtrl,
                label: 'Amount (₹)',
                keyboardType: TextInputType.number,
                prefixIcon: const Icon(Icons.currency_rupee, size: 18),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'].map((m) {
                  return ChoiceChip(
                    label: Text(m),
                    selected: method == m,
                    onSelected: (v) {
                      if (v) setModal(() => method = m);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              CustomTextField(controller: notesCtrl, label: 'Notes (Optional)'),
              const SizedBox(height: 16),
              CustomButton(
                text: 'Save Payment',
                onPressed: () async {
                  final amount = double.tryParse(amountCtrl.text) ?? 0;
                  if (amount <= 0) return;
                  Navigator.pop(ctx);
                  final client = ref.read(apiClientProvider);
                  await client.post(
                    ApiEndpoints.studentPayments(student.id),
                    data: {
                      'amount': amount,
                      'paymentMethod': method,
                      'notes': notesCtrl.text.trim(),
                      'paymentDate': DateTime.now().toIso8601String(),
                    },
                  );
                  ref.invalidate(studentsProvider);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Payment recorded!'),
                        backgroundColor: AppColors.success,
                      ),
                    );
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final studentsAsync = ref.watch(studentsProvider);
    final coursesAsync = ref.watch(coursesListProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Students & Courses'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Students'),
            Tab(text: 'Courses'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── Students Tab ──
          RefreshIndicator(
            onRefresh: () async => ref.invalidate(studentsProvider),
            child: studentsAsync.when(
              loading: () => const SingleChildScrollView(
                  child: LoadingShimmer(count: 5, height: 90)),
              error: (e, _) => Center(child: Text(e.toString())),
              data: (students) {
                if (students.isEmpty) {
                  return const EmptyState(
                    title: 'No students enrolled',
                    message: 'Enroll students from the web dashboard.',
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: students.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final s = students[i];
                    return AppCard(
                      accentColor: _statusColor(s.status),
                      hasAccentBorder: true,
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                backgroundColor:
                                    AppColors.primary.withValues(alpha: 0.12),
                                child: Text(
                                  s.initials,
                                  style: const TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      s.name,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      '${s.mobile}  •  ${s.courseName ?? "No course"}',
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
                              StatusBadge(status: s.status, isCompact: true),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppColors.surfaceDark
                                  : AppColors.backgroundLight,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _feeCol('Total', _fmt.format(s.totalFees)),
                                _feeCol('Paid', _fmt.format(s.advancePaid),
                                    AppColors.success),
                                _feeCol(
                                    'Balance',
                                    _fmt.format(s.balanceAmount),
                                    s.balanceAmount > 0
                                        ? AppColors.error
                                        : AppColors.success),
                              ],
                            ),
                          ),
                          if (s.balanceAmount > 0) ...[
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                icon:
                                    const Icon(Icons.payments_outlined, size: 16),
                                label: const Text('Collect Payment'),
                                onPressed: () => _showPaymentModal(s),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.success,
                                  side: BorderSide(
                                      color:
                                          AppColors.success.withValues(alpha: 0.4)),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),

          // ── Courses Tab ──
          RefreshIndicator(
            onRefresh: () async => ref.invalidate(coursesListProvider),
            child: coursesAsync.when(
              loading: () => const SingleChildScrollView(
                  child: LoadingShimmer(count: 4, height: 80)),
              error: (e, _) => Center(child: Text(e.toString())),
              data: (courses) {
                if (courses.isEmpty) {
                  return const EmptyState(
                    title: 'No courses yet',
                    message: 'Add tailoring courses from the web dashboard.',
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: courses.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final c = courses[i];
                    return AppCard(
                      accentColor: c.isActive ? AppColors.success : AppColors.textMutedLight,
                      hasAccentBorder: true,
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.school_outlined,
                                color: AppColors.primary, size: 24),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(c.name,
                                    style: const TextStyle(
                                        fontSize: 15, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 4),
                                Text(
                                  '${c.durationDays} days  •  ₹${c.fees.toStringAsFixed(0)}',
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
                          StatusBadge(
                              status: c.isActive ? 'ACTIVE' : 'DROPPED',
                              isCompact: true),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _feeCol(String label, String value, [Color? color]) => Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontSize: 14, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(
                  fontSize: 11, color: AppColors.textMutedLight)),
        ],
      );

  Color _statusColor(String s) {
    switch (s) {
      case 'ACTIVE':
        return AppColors.success;
      case 'COMPLETED':
        return AppColors.info;
      default:
        return AppColors.error;
    }
  }
}
