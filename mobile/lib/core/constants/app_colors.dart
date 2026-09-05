import 'package:flutter/material.dart';

/// KTown Aari Works — Haute Couture & Bespoke Studio Design Tokens
/// Calibrated with exact extracted Darzee APK tokens & Nykaa/Myntra luxury standards
class AppColors {
  // ─────────────── Exact Brand Colors (From Darzee APK) ───────────────
  static const Color primary = Color(0xFF4E78F0);        // Electric Darzee Blue
  static const Color primaryLight = Color(0xFF6B8AF7);   // Soft Royal Blue
  static const Color primaryDark = Color(0xFF323A7C);    // Deep Studio Navy (Headers & Titles)

  static const Color secondary = Color(0xFFEC6689);      // Deep Bridal Coral
  static const Color secondaryLight = Color(0xFFFD7E9F); // Soft Coral Rose
  static const Color secondaryDark = Color(0xFFCD201F);  // Rich Crimson

  static const Color accent = Color(0xFF01C853);         // Pure WhatsApp Emerald Green
  static const Color success = Color(0xFF13B53E);        // Leaf Green
  static const Color warning = Color(0xFFF9A242);        // Warm Saffron Gold
  static const Color error = Color(0xFFFF4F4F);          // Vivid Coral Red
  static const Color info = Color(0xFF4474FE);           // Sky Royal

  // ─────────────── Canvas & Surfaces (Light Theme) ───────────────
  static const Color backgroundLight = Color(0xFFEDF1FB); // Soft Periwinkle Mist Canvas (from APK)
  static const Color surfaceLight = Color(0xFFFFFFFF);    // Pure Pearl White Card
  static const Color cardLight = Color(0xFFFFFFFF);       // Pure Pearl White Card
  static const Color cardTintLight = Color(0xFFF8FAFD);   // Subtle tinted container fill
  static const Color textPrimaryLight = Color(0xFF263238);// Deep Blue-Grey 900 (Softer than harsh black)
  static const Color textSecondaryLight = Color(0xFF68767F); // Medium Blue-Grey 600
  static const Color textMutedLight = Color(0xFF8596A0);   // Soft Blue-Grey 400
  static const Color borderLight = Color(0xFFEAEEF5);     // Barely visible ultra-soft separator
  static const Color dividerLight = Color(0xFFF0F3F8);    // Soft Divider

  // ─────────────── Canvas & Surfaces (Dark Theme) ───────────────
  static const Color backgroundDark = Color(0xFF0E131F); // Deep Navy Canvas
  static const Color surfaceDark = Color(0xFF141B2D);    // Smoked Studio Navy
  static const Color cardDark = Color(0xFF1C2438);       // Smoked Card Navy
  static const Color textPrimaryDark = Color(0xFFF1F5F9);// Slate 100
  static const Color textSecondaryDark = Color(0xFF94A3B8); // Slate 400
  static const Color textMutedDark = Color(0xFF64748B);   // Slate 500
  static const Color borderDark = Color(0xFF2A3550);      // Navy Border
  static const Color dividerDark = Color(0xFF1E273D);     // Deep Navy Divider

  // ─────────────── Production Status Pipeline ───────────────
  static const Color statusCreated = Color(0xFF4474FE);    // Cobalt Blue
  static const Color statusDesigning = Color(0xFF8B5CF6);  // Royal Purple
  static const Color statusCutting = Color(0xFFEC6689);    // Coral Pink
  static const Color statusStitching = Color(0xFFF9A242);  // Saffron Amber
  static const Color statusReady = Color(0xFF01C853);      // Emerald Green
  static const Color statusDelivered = Color(0xFF13B53E);  // Deep Emerald
  static const Color statusCancelled = Color(0xFFFF4F4F);  // Coral Red

  // ─────────────── Semantic Tokens ───────────────
  static const Color goldZari = Color(0xFFFDBF00);
  static const Color goldFoil = Color(0xFFFDD835);

  static const Color shimmerBase = Color(0xFF1A2234);
  static const Color shimmerHighlight = Color(0xFF2B3752);
  static const Color shimmerBaseLight = Color(0xFFE8EEF8);
  static const Color shimmerHighlightLight = Color(0xFFF8FAFD);

  // ─────────────── Refined Soft Gradients ───────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF4474FE), Color(0xFF4E78F0), Color(0xFF5578DC)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFF323A7C), Color(0xFF4E78F0)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient velvetGradient = LinearGradient(
    colors: [Color(0xFF323A7C), Color(0xFF4E78F0)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFFDD835), Color(0xFFFDBF00), Color(0xFFF9A242)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient roseGradient = LinearGradient(
    colors: [Color(0xFFFD7E9F), Color(0xFFEC6689), Color(0xFFFF4F4F)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient warmGradient = LinearGradient(
    colors: [Color(0xFFEC6689), Color(0xFFF9A242)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient emeraldGradient = LinearGradient(
    colors: [Color(0xFF01C853), Color(0xFF13B53E), Color(0xFF24B378)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cyanGradient = LinearGradient(
    colors: [Color(0xFF0284C7), Color(0xFF0EA5E9), Color(0xFF38BDF8)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
