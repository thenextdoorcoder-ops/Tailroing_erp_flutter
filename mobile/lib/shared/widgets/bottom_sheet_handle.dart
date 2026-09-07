import 'package:flutter/material.dart';

/// Standardized drag handle for all modal bottom sheets in KTown ERP
class BottomSheetHandle extends StatelessWidget {
  final double width;
  final double height;
  final Color? color;
  final EdgeInsetsGeometry margin;

  const BottomSheetHandle({
    super.key,
    this.width = 40.0,
    this.height = 4.0,
    this.color,
    this.margin = const EdgeInsets.only(top: 8, bottom: 16),
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final handleColor = color ?? (isDark ? Colors.white.withValues(alpha: 0.24) : Colors.grey.shade300);

    return Center(
      child: Container(
        margin: margin,
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: handleColor,
          borderRadius: BorderRadius.circular(height / 2),
        ),
      ),
    );
  }
}
