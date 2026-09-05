import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// Active "in progress" statuses get a pulsing dot
const _activeStatuses = {
  'ORDER_CREATED',
  'DESIGNING_STARTED',
  'CUTTING_STARTED',
  'STITCHING_STARTED',
  'READY_TO_DELIVER',
};

class StatusBadge extends StatefulWidget {
  final String status;
  final bool isCompact;

  const StatusBadge({
    super.key,
    required this.status,
    this.isCompact = false,
  });

  @override
  State<StatusBadge> createState() => _StatusBadgeState();
}

class _StatusBadgeState extends State<StatusBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _pulseAnim;

  bool get _isActive => _activeStatuses.contains(widget.status.toUpperCase());

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _pulseAnim = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    if (_isActive) _controller.repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final config = _getStatusConfig(widget.status);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: widget.isCompact ? 8 : 12,
        vertical: widget.isCompact ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: config.color.withValues(alpha: 0.25),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Pulsing dot for active statuses
          if (_isActive)
            AnimatedBuilder(
              animation: _pulseAnim,
              builder: (_, child) => Opacity(
                opacity: _pulseAnim.value,
                child: Container(
                  width: widget.isCompact ? 6 : 8,
                  height: widget.isCompact ? 6 : 8,
                  decoration: BoxDecoration(
                    color: config.color,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: config.color.withValues(alpha: 0.5),
                        blurRadius: 4,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                ),
              ),
            )
          else
            Container(
              width: widget.isCompact ? 6 : 8,
              height: widget.isCompact ? 6 : 8,
              decoration: BoxDecoration(
                color: config.color,
                shape: BoxShape.circle,
              ),
            ),
          SizedBox(width: widget.isCompact ? 4 : 6),
          Text(
            config.label,
            style: TextStyle(
              color: config.color,
              fontSize: widget.isCompact ? 11 : 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.1,
            ),
          ),
        ],
      ),
    );
  }

  _StatusConfig _getStatusConfig(String status) {
    switch (status.toUpperCase()) {
      case 'ORDER_CREATED':
        return _StatusConfig(label: 'Created', color: AppColors.statusCreated);
      case 'DESIGNING_STARTED':
        return _StatusConfig(label: 'Designing', color: AppColors.statusDesigning);
      case 'DESIGNING_COMPLETED':
        return _StatusConfig(label: 'Design Ready', color: AppColors.statusDesigning);
      case 'CUTTING_STARTED':
        return _StatusConfig(label: 'Cutting', color: AppColors.statusCutting);
      case 'CUTTING_COMPLETED':
        return _StatusConfig(label: 'Cutting Done', color: AppColors.statusCutting);
      case 'STITCHING_STARTED':
        return _StatusConfig(label: 'Stitching', color: AppColors.statusStitching);
      case 'STITCHING_COMPLETED':
        return _StatusConfig(label: 'Stitching Done', color: AppColors.statusStitching);
      case 'READY_TO_DELIVER':
        return _StatusConfig(label: 'Ready ✓', color: AppColors.statusReady);
      case 'DELIVERED':
        return _StatusConfig(label: 'Delivered', color: AppColors.statusDelivered);
      case 'CANCELLED':
        return _StatusConfig(label: 'Cancelled', color: AppColors.statusCancelled);
      case 'PRESENT':
        return _StatusConfig(label: 'Present', color: AppColors.success);
      case 'ABSENT':
        return _StatusConfig(label: 'Absent', color: AppColors.error);
      case 'HALF_DAY':
        return _StatusConfig(label: 'Half Day', color: AppColors.warning);
      case 'LEAVE':
        return _StatusConfig(label: 'Leave', color: AppColors.info);
      case 'OPEN':
        return _StatusConfig(label: 'Open', color: AppColors.primary);
      case 'CLOSED':
        return _StatusConfig(label: 'Closed', color: AppColors.textMutedLight);
      case 'ACTIVE':
        return _StatusConfig(label: 'Active', color: AppColors.success);
      case 'COMPLETED':
        return _StatusConfig(label: 'Completed', color: AppColors.statusDelivered);
      case 'DROPPED':
        return _StatusConfig(label: 'Dropped', color: AppColors.error);
      default:
        return _StatusConfig(
          label: status
              .replaceAll('_', ' ')
              .toLowerCase()
              .split(' ')
              .map((s) => s.isNotEmpty ? '${s[0].toUpperCase()}${s.substring(1)}' : '')
              .join(' '),
          color: AppColors.primary,
        );
    }
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  _StatusConfig({required this.label, required this.color});
}
