import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Centralized haptic feedback service for premium tactile UX
class HapticService {
  /// Light tap — nav changes, toggle taps, card selection
  static void lightTap() {
    if (!kIsWeb) {
      HapticFeedback.lightImpact();
    }
  }

  /// Medium impact — status changes, swipe actions, confirm
  static void mediumImpact() {
    if (!kIsWeb) {
      HapticFeedback.mediumImpact();
    }
  }

  /// Heavy impact — delete, critical confirmations, errors
  static void heavyImpact() {
    if (!kIsWeb) {
      HapticFeedback.heavyImpact();
    }
  }

  /// Selection click — dropdown picks, radio buttons, toggles
  static void selectionClick() {
    if (!kIsWeb) {
      HapticFeedback.selectionClick();
    }
  }

  /// Vibrate pattern — for notifications, alerts
  static void vibrate() {
    if (!kIsWeb) {
      HapticFeedback.vibrate();
    }
  }
}
