import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_animations.dart';
import '../../core/services/haptic_service.dart';

/// Unified Studio Card with tactile press response and smooth soft elevation
class AppCard extends StatefulWidget {
  final Widget child;
  final EdgeInsets? padding;
  final Color? accentColor;
  final bool hasAccentBorder;
  final VoidCallback? onTap;
  final double borderRadius;
  final bool isGlass;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.accentColor,
    this.hasAccentBorder = false,
    this.onTap,
    this.borderRadius = 16,
    this.isGlass = false,
  });

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = widget.accentColor;

    Widget card = AnimatedScale(
      scale: _isPressed ? AppAnimations.pressScale : 1.0,
      duration: AppAnimations.micro,
      curve: AppAnimations.snappy,
      child: AnimatedContainer(
        duration: AppAnimations.short,
        curve: AppAnimations.spring,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.borderRadius),
          boxShadow: [
            if (color != null && widget.hasAccentBorder)
              BoxShadow(
                color: color.withValues(alpha: _isPressed
                    ? (isDark ? 0.25 : 0.12)
                    : (isDark ? 0.10 : 0.04)),
                blurRadius: _isPressed ? 18 : 12,
                offset: const Offset(0, 3),
              )
            else
              BoxShadow(
                color: const Color(0xFF263238).withValues(alpha: _isPressed
                    ? (isDark ? 0.35 : 0.08)
                    : (isDark ? 0.20 : 0.04)),
                blurRadius: _isPressed ? 14 : 10,
                offset: const Offset(0, 3),
              ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(widget.borderRadius),
          child: Container(
            padding: widget.padding ?? const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(widget.borderRadius),
              color: isDark
                  ? (color != null && widget.hasAccentBorder
                      ? color.withValues(alpha: 0.08)
                      : AppColors.cardDark)
                  : Colors.white,
              border: widget.hasAccentBorder && color != null
                  ? Border.all(
                      color: color.withValues(alpha: isDark ? 0.35 : 0.25),
                      width: 1.0,
                    )
                  : null,
            ),
            child: widget.child,
          ),
        ),
      ),
    );

    if (widget.onTap != null) {
      return GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) {
          setState(() => _isPressed = false);
          HapticService.lightTap();
          widget.onTap!();
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: card,
      );
    }

    return card;
  }
}
