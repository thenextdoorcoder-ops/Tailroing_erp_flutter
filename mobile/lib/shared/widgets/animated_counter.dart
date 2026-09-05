import 'package:flutter/material.dart';
import '../../core/constants/app_animations.dart';

/// Animated counter that rolls digits from 0 to target value
/// Used in stat cards, dashboard totals, order summaries
class AnimatedCounter extends StatelessWidget {
  final num value;
  final String prefix;
  final String suffix;
  final Duration duration;
  final Curve curve;
  final TextStyle? style;

  const AnimatedCounter({
    super.key,
    required this.value,
    this.prefix = '',
    this.suffix = '',
    this.duration = const Duration(milliseconds: 600),
    this.curve = Curves.easeOutExpo,
    this.style,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<num>(
      tween: Tween<num>(begin: 0, end: value),
      duration: duration,
      curve: curve,
      builder: (context, animatedValue, child) {
        String displayValue;
        if (value is int) {
          displayValue = animatedValue.toInt().toString();
        } else {
          displayValue = animatedValue.toStringAsFixed(2);
        }

        return Text(
          '$prefix$displayValue$suffix',
          style: style ?? DefaultTextStyle.of(context).style,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        );
      },
    );
  }
}

/// Animated counter specifically for currency values
class AnimatedCurrencyCounter extends StatelessWidget {
  final num value;
  final String symbol;
  final Duration duration;
  final TextStyle? style;

  const AnimatedCurrencyCounter({
    super.key,
    required this.value,
    this.symbol = '₹',
    this.duration = const Duration(milliseconds: 700),
    this.style,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<num>(
      tween: Tween<num>(begin: 0, end: value),
      duration: duration,
      curve: AppAnimations.premium,
      builder: (context, animatedValue, child) {
        // Format with commas: 1,23,456
        final intVal = animatedValue.toInt();
        final formatted = _formatIndianCurrency(intVal);

        return Text(
          '$symbol$formatted',
          style: style ?? DefaultTextStyle.of(context).style,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        );
      },
    );
  }

  String _formatIndianCurrency(int value) {
    if (value < 1000) return value.toString();
    final str = value.toString();
    final len = str.length;
    if (len <= 3) return str;

    String result = str.substring(len - 3);
    String remaining = str.substring(0, len - 3);

    while (remaining.length > 2) {
      result = '${remaining.substring(remaining.length - 2)},$result';
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.isNotEmpty) {
      result = '$remaining,$result';
    }
    return result;
  }
}
