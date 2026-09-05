import 'package:flutter/material.dart';

/// Centralized animation constants for butter-smooth UI
class AppAnimations {
  // ─────────────── Durations ───────────────
  /// Icon taps, button press feedback
  static const Duration micro = Duration(milliseconds: 120);
  /// Card press scale, badge appear, tab switch
  static const Duration short = Duration(milliseconds: 200);
  /// Page transitions, staggered list items
  static const Duration medium = Duration(milliseconds: 350);
  /// Hero banners, skeleton shimmer, count-up
  static const Duration long = Duration(milliseconds: 600);
  /// Dramatic reveals, first-load animations
  static const Duration dramatic = Duration(milliseconds: 900);

  // ─────────────── Curves ───────────────
  /// Premium deceleration — starts fast, lands soft (hero entrances)
  static const Curve premium = Curves.easeOutExpo;
  /// Gentle spring — natural feel for cards and lists
  static const Curve spring = Curves.easeOutCubic;
  /// Snappy interaction — button press/release
  static const Curve snappy = Curves.easeOutQuart;
  /// Bounce — playful but controlled (badges, counters)
  static const Curve bounce = Curves.elasticOut;
  /// Smooth ease — default for most transitions
  static const Curve smooth = Curves.easeInOutCubic;

  // ─────────────── Stagger Delays ───────────────
  /// Delay between each list item entrance
  static const Duration staggerDelay = Duration(milliseconds: 60);
  /// Delay between stat card entrances
  static const Duration statCardDelay = Duration(milliseconds: 80);

  // ─────────────── Scale Values ───────────────
  /// Card press-down scale
  static const double pressScale = 0.965;
  /// Card entrance scale (scale in from slightly smaller)
  static const double entranceScale = 0.92;
  /// Button press scale
  static const double buttonPressScale = 0.95;

  // ─────────────── Offsets ───────────────
  /// Slide-up distance for list item entrances (pixels)
  static const double slideUpOffset = 24.0;
  /// Fade+slide distance for section entrances
  static const double sectionSlideOffset = 16.0;
}
