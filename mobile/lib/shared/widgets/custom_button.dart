import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_animations.dart';
import '../../core/services/haptic_service.dart';

/// Premium button with press-scale animation, gradient background,
/// haptic feedback, and smooth loading state transition
class CustomButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isOutlined;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final double? width;
  final double height;
  final double borderRadius;

  const CustomButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.isOutlined = false,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.width,
    this.height = 50,
    this.borderRadius = 14,
  });

  @override
  State<CustomButton> createState() => _CustomButtonState();
}

class _CustomButtonState extends State<CustomButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final isEnabled = widget.onPressed != null && !widget.isLoading;

    if (widget.isOutlined) {
      return AnimatedScale(
        scale: _isPressed ? AppAnimations.buttonPressScale : 1.0,
        duration: AppAnimations.micro,
        curve: AppAnimations.snappy,
        child: SizedBox(
          width: widget.width ?? double.infinity,
          height: widget.height,
          child: GestureDetector(
            onTapDown: isEnabled ? (_) => setState(() => _isPressed = true) : null,
            onTapUp: isEnabled ? (_) {
              setState(() => _isPressed = false);
              HapticService.lightTap();
              widget.onPressed!();
            } : null,
            onTapCancel: () => setState(() => _isPressed = false),
            child: OutlinedButton(
              onPressed: isEnabled ? widget.onPressed : null,
              style: OutlinedButton.styleFrom(
                side: BorderSide(
                  color: widget.backgroundColor ?? AppColors.primary,
                  width: 1.5,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(widget.borderRadius),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              child: _buildChild(
                context,
                widget.textColor ?? widget.backgroundColor ?? AppColors.primary,
              ),
            ),
          ),
        ),
      );
    }

    return GestureDetector(
      onTapDown: isEnabled ? (_) => setState(() => _isPressed = true) : null,
      onTapUp: isEnabled ? (_) {
        setState(() => _isPressed = false);
        HapticService.mediumImpact();
        widget.onPressed!();
      } : null,
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedScale(
        scale: _isPressed ? AppAnimations.buttonPressScale : 1.0,
        duration: AppAnimations.micro,
        curve: AppAnimations.snappy,
        child: AnimatedContainer(
          duration: AppAnimations.short,
          width: widget.width ?? double.infinity,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: widget.backgroundColor == null && isEnabled
                ? AppColors.primaryGradient
                : null,
            color: widget.backgroundColor ??
                (isEnabled ? AppColors.primary : Colors.grey.shade400),
            boxShadow: isEnabled
                ? [
                    BoxShadow(
                      color: (widget.backgroundColor ?? AppColors.primary)
                          .withValues(alpha: _isPressed ? 0.45 : 0.25),
                      blurRadius: _isPressed ? 18 : 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: ElevatedButton(
            onPressed: widget.isLoading ? null : widget.onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              disabledBackgroundColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(widget.borderRadius),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            child: AnimatedSwitcher(
              duration: AppAnimations.short,
              switchInCurve: AppAnimations.spring,
              child: _buildChild(context, widget.textColor ?? Colors.white),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChild(BuildContext context, Color color) {
    if (widget.isLoading) {
      return SizedBox(
        key: const ValueKey('loading'),
        width: 22,
        height: 22,
        child: CircularProgressIndicator(
          strokeWidth: 2.5,
          valueColor: AlwaysStoppedAnimation<Color>(color),
        ),
      );
    }

    if (widget.icon != null) {
      return Row(
        key: const ValueKey('icon_text'),
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(widget.icon, size: 20, color: color),
          const SizedBox(width: 8),
          Text(
            widget.text,
            style: TextStyle(
              color: color,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      );
    }

    return Text(
      widget.text,
      key: const ValueKey('text'),
      style: TextStyle(
        color: color,
        fontSize: 15,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}
