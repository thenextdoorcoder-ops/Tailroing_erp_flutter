import 'package:flutter/material.dart';
import '../../core/constants/app_animations.dart';

/// Staggered entrance animation wrapper for list items
/// Provides a smooth slide-up + fade-in with configurable delay per index
class AnimatedListItem extends StatefulWidget {
  final Widget child;
  final int index;
  final Duration? delay;
  final Duration? duration;
  final Curve? curve;

  const AnimatedListItem({
    super.key,
    required this.child,
    required this.index,
    this.delay,
    this.duration,
    this.curve,
  });

  @override
  State<AnimatedListItem> createState() => _AnimatedListItemState();
}

class _AnimatedListItemState extends State<AnimatedListItem>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration ?? AppAnimations.medium,
    );

    final curve = CurvedAnimation(
      parent: _controller,
      curve: widget.curve ?? AppAnimations.premium,
    );

    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(curve);

    const endOffset = Offset(0, 0);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, AppAnimations.slideUpOffset / 300),
      end: endOffset,
    ).animate(curve);

    final delay = widget.delay ?? AppAnimations.staggerDelay;
    Future.delayed(delay * widget.index, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnim,
      child: SlideTransition(
        position: _slideAnim,
        child: widget.child,
      ),
    );
  }
}
