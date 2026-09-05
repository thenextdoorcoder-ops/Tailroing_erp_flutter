import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import 'package:image_picker/image_picker.dart';
import 'package:photo_view/photo_view.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/loading_shimmer.dart';

// ──────────── Gallery Image Model ────────────
class GalleryImageModel {
  final String id;
  final String imageUrl;
  final bool isDesign;

  GalleryImageModel(
      {required this.id, required this.imageUrl, this.isDesign = false});

  factory GalleryImageModel.fromJson(Map<String, dynamic> json) =>
      GalleryImageModel(
        id: json['id']?.toString() ?? '',
        imageUrl: json['imagePath']?.toString() ??
            json['imageUrl']?.toString() ??
            '',
        isDesign: json['isDesign'] as bool? ?? false,
      );
}

// ──────────── Shop Gallery Provider ────────────
final shopGalleryProvider = FutureProvider<List<GalleryImageModel>>((ref) async {
  final client = ref.read(apiClientProvider);
  final response = await client.get(ApiEndpoints.shopGallery);
  if (response is List) {
    return response
        .map((j) => GalleryImageModel.fromJson(j as Map<String, dynamic>))
        .toList();
  }
  return [];
});

// ──────────── Blouse Gallery Model ────────────
class BlouseGalleryGroup {
  final String id;
  final double price;
  final String? label;
  final List<String> imageUrls;

  BlouseGalleryGroup(
      {required this.id,
      required this.price,
      this.label,
      required this.imageUrls});

  factory BlouseGalleryGroup.fromJson(Map<String, dynamic> json) =>
      BlouseGalleryGroup(
        id: json['id']?.toString() ?? '',
        price: double.tryParse(json['price']?.toString() ?? '0') ?? 0,
        label: json['label']?.toString(),
        imageUrls: (json['images'] as List?)
                ?.map((i) => i['imageUrl']?.toString() ?? '')
                .where((u) => u.isNotEmpty)
                .toList() ??
            [],
      );
}

final blouseGalleryProvider =
    FutureProvider<List<BlouseGalleryGroup>>((ref) async {
  final client = ref.read(apiClientProvider);
  final response = await client.get(ApiEndpoints.blouseGallery);
  if (response is List) {
    return response
        .map((j) => BlouseGalleryGroup.fromJson(j as Map<String, dynamic>))
        .toList();
  }
  return [];
});

// ──────────── Screen ────────────
class GalleryScreen extends ConsumerStatefulWidget {
  const GalleryScreen({super.key});

  @override
  ConsumerState<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends ConsumerState<GalleryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _picker = ImagePicker();
  bool _showDesignOnly = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUpload() async {
    await _picker.pickImage(source: ImageSource.gallery);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Upload via web dashboard for now')),
    );
  }

  void _openFullscreen(List<String> urls, int index) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _FullscreenGallery(urls: urls, initialIndex: index),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final galleryAsync = ref.watch(shopGalleryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gallery'),
        actions: [
          IconButton(
            icon: Icon(
              _showDesignOnly ? Icons.filter_alt : Icons.filter_alt_outlined,
              color: _showDesignOnly ? AppColors.primary : null,
            ),
            tooltip: 'Designs only',
            onPressed: () => setState(() => _showDesignOnly = !_showDesignOnly),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Shop Portfolio'),
            Tab(text: 'Blouse Catalog'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── Shop Gallery ──
          RefreshIndicator(
            onRefresh: () async => ref.invalidate(shopGalleryProvider),
            child: galleryAsync.when(
              loading: () => const SingleChildScrollView(
                  child: LoadingShimmer(count: 6, height: 120)),
              error: (e, _) => Center(child: Text(e.toString())),
              data: (images) {
                final filtered = _showDesignOnly
                    ? images.where((i) => i.isDesign).toList()
                    : images;
                if (filtered.isEmpty) {
                  return const EmptyState(
                    title: 'Gallery is empty',
                    message: 'Add shop portfolio images from the web dashboard.',
                  );
                }
                final urls = filtered.map((i) => i.imageUrl).toList();
                return MasonryGridView.count(
                  padding: const EdgeInsets.all(12),
                  crossAxisCount: 2,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  itemCount: filtered.length,
                  itemBuilder: (ctx, i) {
                    final img = filtered[i];
                    return GestureDetector(
                      onTap: () => _openFullscreen(urls, i),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Stack(
                          children: [
                            CachedNetworkImage(
                              imageUrl: img.imageUrl,
                              fit: BoxFit.cover,
                              placeholder: (_, __) => Container(
                                height: 150,
                                color: AppColors.borderLight,
                                child: const Center(
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                ),
                              ),
                              errorWidget: (_, __, ___) => Container(
                                height: 150,
                                color: AppColors.borderLight,
                                child: const Icon(
                                    Icons.broken_image_outlined),
                              ),
                            ),
                            if (img.isDesign)
                              Positioned(
                                top: 6,
                                right: 6,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'Design',
                                    style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w700),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),

          // ── Blouse Catalog ──
          RefreshIndicator(
            onRefresh: () async => ref.invalidate(blouseGalleryProvider),
            child: Consumer(builder: (ctx, ref, _) {
              final isDark = Theme.of(ctx).brightness == Brightness.dark;
              final blouseAsync = ref.watch(blouseGalleryProvider);
              return blouseAsync.when(
                loading: () => const SingleChildScrollView(
                    child: LoadingShimmer(count: 4, height: 200)),
                error: (e, _) => Center(child: Text(e.toString())),
                data: (groups) {
                  if (groups.isEmpty) {
                    return const EmptyState(
                      title: 'No blouse catalog yet',
                      message: 'Add blouse designs from the web dashboard.',
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: groups.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 20),
                    itemBuilder: (ctx, i) {
                      final g = groups[i];
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 4),
                                decoration: BoxDecoration(
                                  gradient: AppColors.primaryGradient,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '₹${g.price.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                              if (g.label != null) ...[
                                const SizedBox(width: 8),
                                Text(g.label!,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13)),
                              ],
                            ],
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 160,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: g.imageUrls.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: 10),
                              itemBuilder: (ctx, j) => ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: CachedNetworkImage(
                                  imageUrl: g.imageUrls[j],
                                  width: 120,
                                  height: 160,
                                  fit: BoxFit.cover,
                                  errorWidget: (_, __, ___) => Container(
                                    width: 120,
                                    color: isDark
                                        ? AppColors.cardDark
                                        : AppColors.backgroundLight,
                                    child: const Icon(
                                        Icons.broken_image_outlined),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      );
                    },
                  );
                },
              );
            }),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _pickAndUpload,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_photo_alternate, color: Colors.white),
      ),
    );
  }
}

// ──────────── Full Screen Viewer ────────────
class _FullscreenGallery extends StatefulWidget {
  final List<String> urls;
  final int initialIndex;
  const _FullscreenGallery(
      {required this.urls, required this.initialIndex});

  @override
  State<_FullscreenGallery> createState() => _FullscreenGalleryState();
}

class _FullscreenGalleryState extends State<_FullscreenGallery> {
  late PageController _pageCtrl;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageCtrl = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          '${_currentIndex + 1} / ${widget.urls.length}',
          style: const TextStyle(color: Colors.white),
        ),
      ),
      body: PageView.builder(
        controller: _pageCtrl,
        itemCount: widget.urls.length,
        onPageChanged: (i) => setState(() => _currentIndex = i),
        itemBuilder: (_, i) => PhotoView(
          imageProvider: CachedNetworkImageProvider(widget.urls[i]),
          backgroundDecoration: const BoxDecoration(color: Colors.black),
          minScale: PhotoViewComputedScale.contained,
          maxScale: PhotoViewComputedScale.covered * 3,
        ),
      ),
    );
  }
}
