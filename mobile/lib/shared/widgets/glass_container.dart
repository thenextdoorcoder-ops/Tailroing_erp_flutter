import 'package:flutter/material.dart';
import '../../core/constants/app_animations.dart';
import '../../core/services/haptic_service.dart';

/// Premium Frosted Glass Container with crisp white surfaces (light mode),
/// deep obsidian glass (dark mode), ambient specular borders, and tactile response
class GlassContainer extends StatefulWidget {
  final Widget child;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final Color? glowColor;
  final double blur;
  final double opacity;
  final Border? border;
  final VoidCallback? onTap;
  final Gradient? gradient;
  final bool enableHaptic;

  const GlassContainer({
    super.key,
    required this.child,
    this.width,
    this.height,
    this.padding,
    this.margin,
    this.borderRadius = 24,
    this.glowColor,
    this.blur = 20,
    this.opacity = 1.0,
    this.border,
    this.onTap,
    this.gradient,
    this.enableHaptic = true,
  });

  @override
  State<GlassContainer> createState() => _GlassContainerState();
}

class _GlassContainerState extends State<GlassContainer>
    with SingleTickerProviderStateMixin {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = widget.glowColor;

    Widget content = AnimatedScale(
      scale: _isPressed ? AppAnimations.pressScale : 1.0,
      duration: AppAnimations.micro,
      curve: AppAnimations.snappy,
      child: AnimatedContainer(
        duration: AppAnimations.short,
        curve: AppAnimations.spring,
        width: widget.width,
        height: widget.height,
        margin: widget.margin,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.borderRadius),
          boxShadow: [
            if (isDark) ...[
              BoxShadow(
                color: (color ?? Colors.black).withValues(alpha: _isPressed ? 0.45 : 0.25),
                blurRadius: _isPressed ? 18 : 12,
                offset: const Offset(0, 4),
              ),
              if (color != null)
                BoxShadow(
                  color: color.withValues(alpha: _isPressed ? 0.15 : 0.08),
                  blurRadius: 20,
                  spreadRadius: -4,
                  offset: const Offset(0, 6),
                ),
            ] else ...[
              BoxShadow(
                color: const Color(0xFF0F172A).withValues(alpha: _isPressed ? 0.08 : 0.04),
                blurRadius: _isPressed ? 16 : 10,
                spreadRadius: 0,
                offset: const Offset(0, 4),
              ),
              BoxShadow(
                color: const Color(0xFF4E78F0).withValues(alpha: 0.02),
                blurRadius: 2,
                spreadRadius: 0,
                offset: const Offset(0, 1),
              ),
            ],
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(widget.borderRadius),
          child: Container(
            padding: widget.padding ?? const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1C2438) : Colors.white,
              borderRadius: BorderRadius.circular(widget.borderRadius),
              gradient: widget.gradient,
              border: widget.border ??
                  Border.all(
                    color: isDark
                        ? (color != null
                            ? color.withValues(alpha: 0.30)
                            : const Color(0xFF2A3550))
                        : const Color(0xFFDCE4F7),
                    width: 1.0,
                  ),
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
          if (widget.enableHaptic) HapticService.lightTap();
          widget.onTap!();
        },
        onTapCancel: () => setState(() => _isPressed = false),
        child: content,
      );
    }

    return content;
  }
}
