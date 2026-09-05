import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/models/work_assignment_model.dart';
import '../../../shared/models/user_model.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../../shared/widgets/loading_shimmer.dart';
import '../../auth/providers/auth_provider.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  List<AttendanceModel> _records = [];
  List<UserModel> _staffList = [];
  bool _isLoading = true;
  bool _isCheckedIn = false;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    final apiClient = ref.read(apiClientProvider);
    try {
      // 1. Fetch today's attendance
      final attRes = await apiClient.get(ApiEndpoints.attendance);
      if (attRes != null) {
        final list = attRes is List ? attRes : (attRes['attendance'] as List? ?? []);
        _records = list.map((e) => AttendanceModel.fromJson(e)).toList();
      }

      // 2. Fetch staff members
      final staffRes = await apiClient.get(ApiEndpoints.staff);
      if (staffRes != null) {
        final list = staffRes is List ? staffRes : (staffRes['staff'] as List? ?? []);
        _staffList = list.map((e) => UserModel.fromJson(e)).toList();
      }

      if (mounted) setState(() => _isLoading = false);
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleMyCheckIn() async {
    final apiClient = ref.read(apiClientProvider);
    try {
      final endpoint = _isCheckedIn ? ApiEndpoints.attendanceCheckOut : ApiEndpoints.attendanceCheckIn;
      await apiClient.post(endpoint, data: {
        'status': 'PRESENT',
        'date': DateTime.now().toIso8601String(),
      });

      setState(() => _isCheckedIn = !_isCheckedIn);
      _fetchData();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isCheckedIn ? '✅ Checked in successfully!' : '👋 Checked out successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Attendance update failed: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  void _showMarkStaffAttendanceModal(UserModel staff) {
    String selectedStatus = 'PRESENT';
    final notesController = TextEditingController();

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
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
                'Mark Attendance: ${staff.fullName}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'Role: ${staff.staffRole ?? "Staff"}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: ['PRESENT', 'HALF_DAY', 'LEAVE', 'ABSENT'].map((status) {
                  final isSelected = selectedStatus == status;
                  return ChoiceChip(
                    label: Text(status.replaceAll('_', ' ')),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) setModalState(() => selectedStatus = status);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: notesController,
                decoration: const InputDecoration(
                  labelText: 'Notes (Optional)',
                  hintText: 'e.g. Approved medical leave',
                ),
              ),
              const SizedBox(height: 20),
              CustomButton(
                text: 'Save Attendance',
                onPressed: () async {
                  Navigator.pop(ctx);
                  final apiClient = ref.read(apiClientProvider);
                  try {
                    await apiClient.post(ApiEndpoints.attendance, data: {
                      'userId': staff.id,
                      'status': selectedStatus,
                      'date': DateTime.now().toIso8601String(),
                      'notes': notesController.text.trim(),
                    });
                    _fetchData();
                  } catch (_) {}
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
    final authState = ref.watch(authStateProvider);
    final user = authState.value;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final today = DateFormat('EEEE, dd MMMM yyyy').format(DateTime.now());

    final presentCount = _records.where((r) => r.status == 'PRESENT').length;
    final leaveCount = _records.where((r) => r.status == 'LEAVE' || r.status == 'HALF_DAY').length;

    return Scaffold(
      appBar: AppBar(title: const Text('Staff Attendance')),
      body: RefreshIndicator(
        onRefresh: _fetchData,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Check-in Quick Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 15,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Text(
                      today,
                      style: const TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      user?.fullName ?? 'Staff Member',
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    Text(
                      user?.role == 'STAFF' ? (user?.staffRole ?? 'Staff') : 'Shop Admin',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    CustomButton(
                      text: _isCheckedIn ? 'Check Out for Today' : 'Mark My Attendance (Check In)',
                      backgroundColor: _isCheckedIn ? AppColors.secondary : Colors.white,
                      textColor: _isCheckedIn ? Colors.white : AppColors.primary,
                      icon: _isCheckedIn ? Icons.logout : Icons.login,
                      onPressed: _toggleMyCheckIn,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Daily Summary Row
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Present Today', style: TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text('$presentCount', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.success)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.warning.withValues(alpha: 0.2)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('On Leave / Half-day', style: TextStyle(fontSize: 12, color: AppColors.warning, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text('$leaveCount', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.warning)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Staff Roster & Marking
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Staff Team Roster", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  Text('${_staffList.length} staff members', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
              const SizedBox(height: 12),

              if (_isLoading)
                const LoadingShimmer(count: 4, height: 75)
              else if (_staffList.isEmpty)
                const Center(child: Text('No staff accounts created yet. Create staff in Admin panel.'))
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _staffList.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, i) {
                    final staff = _staffList[i];
                    final record = _records.firstWhere(
                      (r) => r.userId == staff.id,
                      orElse: () => AttendanceModel(id: '', userId: staff.id, date: '', status: 'ABSENT'),
                    );

                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.cardDark : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                            child: Text(
                              staff.fullName.isNotEmpty ? staff.fullName[0].toUpperCase() : 'S',
                              style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(staff.fullName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                Text(
                                  staff.staffRole ?? 'Staff',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          StatusBadge(status: record.status, isCompact: true),
                          IconButton(
                            icon: const Icon(Icons.edit_calendar_outlined, size: 20, color: AppColors.primary),
                            tooltip: 'Mark Attendance',
                            onPressed: () => _showMarkStaffAttendanceModal(staff),
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}
