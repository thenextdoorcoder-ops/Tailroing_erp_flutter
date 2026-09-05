import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/constants/app_colors.dart';

/// Premium skeleton loader with bone-structure shapes
/// and animated gradient sweep matching actual content layouts
class LoadingShimmer extends StatelessWidget {
  final int count;
  final double height;
  final bool isCard;

  const LoadingShimmer({
    super.key,
    this.count = 3,
    this.height = 100,
    this.isCard = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Shimmer.fromColors(
      baseColor: isDark ? AppColors.shimmerBase : AppColors.shimmerBaseLight,
      highlightColor: isDark ? AppColors.shimmerHighlight : AppColors.shimmerHighlightLight,
      period: const Duration(milliseconds: 1500),
      child: Column(
        children: List.generate(count, (index) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: isCard
                ? _buildCardSkeleton(height, isDark)
                : _buildLineSkeleton(isDark),
          );
        }),
      ),
    );
  }

  Widget _buildCardSkeleton(double h, bool isDark) {
    return Container(
      height: h,
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : AppColors.cardLight,
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Circle avatar skeleton
          Container(
            width: h < 80 ? 32 : 40,
            height: h < 80 ? 32 : 40,
            decoration: BoxDecoration(
              color: isDark ? AppColors.shimmerHighlight : AppColors.shimmerBaseLight,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          // Text lines skeleton
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  height: 12,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.shimmerHighlight : AppColors.shimmerBaseLight,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  height: 10,
                  width: 120,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.shimmerHighlight : AppColors.shimmerBaseLight,
                    borderRadius: BorderRadius.circular(5),
                  ),
                ),
                if (h >= 95) ...[
                  const SizedBox(height: 6),
                  Container(
                    height: 8,
                    width: 75,
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.shimmerHighlight : AppColors.shimmerBaseLight,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLineSkeleton(bool isDark) {
    return Container(
      height: 16,
      decoration: BoxDecoration(
        color: isDark ? AppColors.shimmerHighlight : AppColors.shimmerBaseLight,
        borderRadius: BorderRadius.circular(8),
      ),
    );
  }
}

/// Premium stat card skeleton matching the 2x2 KPI grid
class StatCardShimmer extends StatelessWidget {
  const StatCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Shimmer.fromColors(
      baseColor: isDark ? AppColors.shimmerBase : AppColors.shimmerBaseLight,
      highlightColor: isDark ? AppColors.shimmerHighlight : AppColors.shimmerHighlightLight,
      period: const Duration(milliseconds: 1500),
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.45,
        children: List.generate(4, (_) {
          return Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.cardDark : AppColors.cardLight,
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.shimmerHighlight : AppColors.shimmerBaseLight,
                    shape: BoxShape.circle,
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      height: 16,
                      width: 60,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.shimmerHighlight : AppColors.shimmerBaseLight,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      height: 10,
                      width: 40,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.shimmerHighlight : AppColors.shimmerBaseLight,
                        borderRadius: BorderRadius.circular(5),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }),
      ),
    );
  }
}
