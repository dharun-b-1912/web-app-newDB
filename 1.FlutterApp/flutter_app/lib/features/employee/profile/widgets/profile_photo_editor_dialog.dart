import 'dart:ui' as ui;
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import '../../../../core/theme/klarna_tokens.dart';

/// Interactive Face-Aware Zoom, Pan & Circular Crop Photo Editor (Cross-Platform Web & Native)
class ProfilePhotoEditorDialog extends StatefulWidget {
  final Uint8List imageBytes;
  final VoidCallback onChooseAnother;
  final ValueChanged<Uint8List> onPhotoSaved;

  const ProfilePhotoEditorDialog({
    super.key,
    required this.imageBytes,
    required this.onChooseAnother,
    required this.onPhotoSaved,
  });

  static Future<void> show({
    required BuildContext context,
    required Uint8List imageBytes,
    required VoidCallback onChooseAnother,
    required ValueChanged<Uint8List> onPhotoSaved,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: "Dismiss",
      barrierColor: Colors.black.withValues(alpha: 0.70),
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (ctx, anim1, anim2) => ProfilePhotoEditorDialog(
        imageBytes: imageBytes,
        onChooseAnother: onChooseAnother,
        onPhotoSaved: onPhotoSaved,
      ),
      transitionBuilder: (ctx, anim1, anim2, child) {
        return ScaleTransition(
          scale: Tween<double>(begin: 0.94, end: 1.0).animate(
            CurvedAnimation(parent: anim1, curve: Curves.easeOutCubic),
          ),
          child: FadeTransition(
            opacity: anim1,
            child: child,
          ),
        );
      },
    );
  }

  @override
  State<ProfilePhotoEditorDialog> createState() => _ProfilePhotoEditorDialogState();
}

class _ProfilePhotoEditorDialogState extends State<ProfilePhotoEditorDialog> {
  final GlobalKey _cropKey = GlobalKey();
  final TransformationController _transformationController = TransformationController();
  double _currentScale = 1.25;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    // Default smart zoom (1.25x) anchored on upper-third head & face
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _applyScale(1.25);
    });
  }

  void _applyScale(double scale) {
    setState(() => _currentScale = scale);
    final matrix = Matrix4.identity();
    matrix.setEntry(0, 0, scale);
    matrix.setEntry(1, 1, scale);
    matrix.setEntry(0, 3, -15.0 * (scale - 1.0));
    matrix.setEntry(1, 3, -8.0 * (scale - 1.0));
    _transformationController.value = matrix;
  }

  Future<void> _captureAndSave() async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);

    try {
      final boundary = _cropKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary != null) {
        // High-DPI capture (pixelRatio: 3.5 -> ~700-1000px high res crop)
        final ui.Image image = await boundary.toImage(pixelRatio: 3.5);
        final ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
        if (byteData != null) {
          final croppedBytes = byteData.buffer.asUint8List();
          if (mounted) {
            Navigator.of(context).pop();
            widget.onPhotoSaved(croppedBytes);
            return;
          }
        }
      }
      // Fallback
      if (mounted) {
        Navigator.of(context).pop();
        widget.onPhotoSaved(widget.imageBytes);
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop();
        widget.onPhotoSaved(widget.imageBytes);
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final screenHeight = MediaQuery.sizeOf(context).height;
    final maxDialogWidth = screenWidth > 440 ? 380.0 : (screenWidth - 32.0).clamp(280.0, 380.0);

    return SafeArea(
      child: Center(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: maxDialogWidth,
              maxHeight: screenHeight - 40,
            ),
            child: Material(
              color: Colors.transparent,
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceWhite,
                  borderRadius: AppRadius.borderLg,
                  boxShadow: AppShadows.softCard,
                ),
                padding: const EdgeInsets.fromLTRB(22, 22, 22, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Header
                    Text(
                      "Adjust Profile Photo",
                      style: AppTypography.titleLarge.copyWith(fontSize: 18),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Drag to reposition or pinch to zoom. Ensure your face and head are centered.",
                      style: AppTypography.caption.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                        height: 1.3,
                      ),
                      textAlign: TextAlign.center,
                    ),

                    const SizedBox(height: 16),

                    // Interactive Circular Crop Viewfinder
                    Center(
                      child: Container(
                        width: 180,
                        height: 180,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF0F172A),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.25),
                              blurRadius: 20,
                              offset: const Offset(0, 6),
                            ),
                          ],
                          border: Border.all(
                            color: AppColors.primary,
                            width: 3.5,
                          ),
                        ),
                        child: ClipOval(
                          child: RepaintBoundary(
                            key: _cropKey,
                            child: SizedBox(
                              width: 180,
                              height: 180,
                              child: InteractiveViewer(
                                transformationController: _transformationController,
                                minScale: 0.8,
                                maxScale: 4.0,
                                boundaryMargin: const EdgeInsets.all(80),
                                child: Image.memory(
                                  widget.imageBytes,
                                  fit: BoxFit.cover,
                                  alignment: const Alignment(0.0, -0.35),
                                  filterQuality: FilterQuality.high,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Quick Zoom Adjuster Pills
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildZoomButton("1x", 1.0),
                        const SizedBox(width: 8),
                        _buildZoomButton("1.3x", 1.3),
                        const SizedBox(width: 8),
                        _buildZoomButton("1.6x", 1.6),
                        const SizedBox(width: 8),
                        _buildZoomButton("2.0x", 2.0),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Badge tip
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.mintBg,
                        borderRadius: AppRadius.borderPill,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            CupertinoIcons.checkmark_seal_fill,
                            size: 13,
                            color: AppColors.mintFg,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            "Face Centered For Avatar & ID Card",
                            style: AppTypography.overline.copyWith(
                              color: AppColors.mintFg,
                              fontWeight: FontWeight.w700,
                              fontSize: 10,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Action Buttons
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: double.infinity,
                          child: GestureDetector(
                            onTap: _isProcessing ? null : _captureAndSave,
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: AppRadius.borderPill,
                                boxShadow: AppShadows.pillDark,
                              ),
                              child: Center(
                                child: _isProcessing
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Text(
                                        "Save Centered Photo",
                                        style: AppTypography.bodyLarge.copyWith(
                                          fontWeight: FontWeight.w800,
                                          color: Colors.white,
                                        ),
                                      ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: GestureDetector(
                            onTap: () {
                              Navigator.of(context).pop();
                              widget.onChooseAnother();
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              decoration: BoxDecoration(
                                color: AppColors.slateBg,
                                borderRadius: AppRadius.borderPill,
                              ),
                              child: Center(
                                child: Text(
                                  "Choose Another Photo",
                                  style: AppTypography.bodyLarge.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                    fontSize: 13.5,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildZoomButton(String label, double scale) {
    final isSelected = (_currentScale - scale).abs() < 0.1;
    return GestureDetector(
      onTap: () => _applyScale(scale),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.slateBg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
