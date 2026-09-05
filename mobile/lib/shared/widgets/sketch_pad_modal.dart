import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import '../../core/constants/app_colors.dart';

class SketchPadModal extends StatefulWidget {
  final String? initialSketchUrl;

  const SketchPadModal({super.key, this.initialSketchUrl});

  static Future<String?> show(BuildContext context, {String? initialSketchUrl}) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SketchPadModal(initialSketchUrl: initialSketchUrl),
    );
  }

  @override
  State<SketchPadModal> createState() => _SketchPadModalState();
}

class _SketchPadModalState extends State<SketchPadModal> {
  late SignatureController _controller;
  Color _selectedColor = Colors.black;
  double _strokeWidth = 3.0;

  @override
  void initState() {
    super.initState();
    _initController();
  }

  void _initController() {
    _controller = SignatureController(
      penStrokeWidth: _strokeWidth,
      penColor: _selectedColor,
      exportBackgroundColor: Colors.white,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _setColor(Color color) {
    setState(() {
      _selectedColor = color;
      final points = _controller.points;
      _controller.dispose();
      _controller = SignatureController(
        penStrokeWidth: _strokeWidth,
        penColor: color,
        exportBackgroundColor: Colors.white,
        points: points,
      );
    });
  }

  void _setStrokeWidth(double width) {
    setState(() {
      _strokeWidth = width;
      final points = _controller.points;
      _controller.dispose();
      _controller = SignatureController(
        penStrokeWidth: width,
        penColor: _selectedColor,
        exportBackgroundColor: Colors.white,
        points: points,
      );
    });
  }

  Future<void> _saveAndClose() async {
    if (_controller.isEmpty) {
      Navigator.pop(context, null);
      return;
    }

    final Uint8List? pngBytes = await _controller.toPngBytes();
    if (pngBytes != null) {
      final base64String = 'data:image/png;base64,${base64Encode(pngBytes)}';
      if (mounted) {
        Navigator.pop(context, base64String);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.draw, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text(
                      'Design Sketch / Drawing',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Tools Toolbar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                // Color Pickers
                _buildColorDot(Colors.black),
                _buildColorDot(AppColors.primary),
                _buildColorDot(Colors.redAccent),
                _buildColorDot(Colors.blueAccent),
                _buildColorDot(Colors.green),
                const Spacer(),

                // Stroke widths
                IconButton(
                  icon: const Icon(Icons.line_weight),
                  tooltip: 'Line Thickness',
                  onPressed: () {
                    _setStrokeWidth(_strokeWidth == 3.0 ? 6.0 : (_strokeWidth == 6.0 ? 1.5 : 3.0));
                  },
                ),

                // Undo
                IconButton(
                  icon: const Icon(Icons.undo),
                  tooltip: 'Undo',
                  onPressed: () => _controller.undo(),
                ),

                // Clear
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: AppColors.error),
                  tooltip: 'Clear Canvas',
                  onPressed: () => _controller.clear(),
                ),
              ],
            ),
          ),

          // Canvas Area
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight, width: 1.5),
              ),
              clipBehavior: Clip.antiAlias,
              child: Signature(
                controller: _controller,
                backgroundColor: Colors.white,
              ),
            ),
          ),

          // Actions
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _saveAndClose,
                    icon: const Icon(Icons.check, size: 18),
                    label: const Text('Save Sketch'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildColorDot(Color color) {
    final isSelected = _selectedColor == color;
    return GestureDetector(
      onTap: () => _setColor(color),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: isSelected ? AppColors.primary : Colors.grey.shade300,
            width: isSelected ? 2.5 : 1,
          ),
        ),
      ),
    );
  }
}
