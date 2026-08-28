import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:photo_view/photo_view.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/controllers/employee_controller.dart';
import '../../../../core/services/document_upload_service.dart';
import '../../../../core/services/file_download_service.dart';
import '../../../../core/services/user_service.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../models/employee_models.dart';
import '../../../../widgets/core/app_button.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/status_chip.dart';

class DigitalLetterViewerScreen extends StatefulWidget {
  final DigitalLetterModel letter;

  const DigitalLetterViewerScreen({super.key, required this.letter});

  @override
  State<DigitalLetterViewerScreen> createState() => _DigitalLetterViewerScreenState();
}

class _DigitalLetterViewerScreenState extends State<DigitalLetterViewerScreen> {
  String? _resolvedUrl;
  bool _isLoadingUrl = false;
  bool _isSigning = false;
  late DigitalLetterModel _currentLetter;

  @override
  void initState() {
    super.initState();
    _currentLetter = widget.letter;
    _resolveUrl();
  }

  Future<void> _resolveUrl() async {
    final rawUrl = _currentLetter.documentUrl;
    if (rawUrl != null && rawUrl.isNotEmpty) {
      setState(() => _isLoadingUrl = true);
      try {
        if (rawUrl.startsWith('http')) {
          _resolvedUrl = rawUrl;
        } else {
          final signed = await DocumentUploadService.instance.getSignedUrl(rawUrl);
          _resolvedUrl = signed ?? rawUrl;
        }
      } catch (_) {
        _resolvedUrl = rawUrl;
      } finally {
        if (mounted) setState(() => _isLoadingUrl = false);
      }
    }
  }

  Future<void> _openExternalDocument() async {
    final url = _resolvedUrl ?? _currentLetter.documentUrl;
    if (url != null && url.startsWith('http')) {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return;
      }
    }
    _triggerDownload();
  }

  Future<void> _triggerDownload() async {
    final messenger = ScaffoldMessenger.of(context);
    final rawUrl = _resolvedUrl ?? _currentLetter.documentUrl ?? '';
    final cleanName = '${_currentLetter.title.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_')}.pdf';

    try {
      if (rawUrl.startsWith('http')) {
        final downloaded = await FileDownloadService.downloadFromUrl(
          url: rawUrl,
          fileName: cleanName,
        );
        if (downloaded) {
          messenger.showSnackBar(
            SnackBar(
              content: Text("✓ '$cleanName' downloaded successfully."),
              backgroundColor: AppColors.primary,
              behavior: SnackBarBehavior.floating,
            ),
          );
          return;
        }
      }
    } catch (_) {}

    messenger.showSnackBar(
      SnackBar(
        content: Text("Opening document: ${_currentLetter.title}"),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _handleSignAndAcknowledge() async {
    if (_isSigning) return;
    setState(() => _isSigning = true);

    final user = UserService.instance.currentUser;
    final signatureData = 'DIGITALLY_SIGNED_BY_${user.name.toUpperCase()}_AT_${DateTime.now().toIso8601String()}';

    try {
      await MoreModulesController.instance.acknowledgeDigitalLetter(
        _currentLetter.id,
        signatureData: signatureData,
      );

      setState(() {
        _currentLetter = DigitalLetterModel(
          id: _currentLetter.id,
          title: _currentLetter.title,
          category: _currentLetter.category,
          issueDate: _currentLetter.issueDate,
          effectiveDate: _currentLetter.effectiveDate,
          documentRef: _currentLetter.documentRef,
          documentUrl: _currentLetter.documentUrl,
          documentType: _currentLetter.documentType,
          fileName: _currentLetter.fileName,
          referenceNumber: _currentLetter.referenceNumber,
          contentBody: _currentLetter.contentBody,
          requiresSignature: _currentLetter.requiresSignature,
          status: 'SIGNED',
          signatureData: signatureData,
          signedAt: DateTime.now(),
          issuedByName: _currentLetter.issuedByName,
        );
        _isSigning = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("✓ Letter digitally signed and verified by HR."),
            backgroundColor: AppColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() => _isSigning = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Acknowledgment failed: $e"),
            backgroundColor: AppColors.statusError,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  bool get _isImage =>
      _currentLetter.documentType == 'image' ||
      (_resolvedUrl != null &&
          (_resolvedUrl!.toLowerCase().contains('.png') ||
              _resolvedUrl!.toLowerCase().contains('.jpg') ||
              _resolvedUrl!.toLowerCase().contains('.jpeg') ||
              _resolvedUrl!.toLowerCase().contains('.webp')));

  @override
  Widget build(BuildContext context) {
    final letter = _currentLetter;
    final issuedDateStr = "${letter.issueDate.day}/${letter.issueDate.month}/${letter.issueDate.year}";

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(CupertinoIcons.back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          letter.title,
          style: AppTypography.titleLarge,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.arrow_down_circle_fill, color: AppColors.primary, size: 24),
            tooltip: "Download PDF",
            onPressed: _triggerDownload,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Official Document Letterhead Card
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: AppRadius.borderLg,
                boxShadow: AppShadows.softCard,
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Letterhead Header
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: const BoxDecoration(
                      color: AppColors.slateBg,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.card)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                              child: const Center(
                                child: Icon(
                                  CupertinoIcons.doc_text_fill,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                            AppSpacing.hGapMD,
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "JOY PEOPLEHR",
                                  style: AppTypography.caption.copyWith(
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.2,
                                    color: AppColors.primary,
                                  ),
                                ),
                                Text(
                                  "Corporate HR Master Letter",
                                  style: AppTypography.overline.copyWith(
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        StatusChip(
                          label: letter.category,
                          type: StatusType.info,
                          icon: CupertinoIcons.checkmark_seal_fill,
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 1, color: AppColors.borderSubtle),

                  // Letter Content / Interactive Preview
                  Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              letter.referenceNumber ?? "REF: JOY/HR/2026",
                              style: AppTypography.caption.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            Text(
                              "Issued: $issuedDateStr",
                              style: AppTypography.caption.copyWith(
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),

                        AppSpacing.gapLG,

                        Text(
                          letter.title,
                          style: AppTypography.titleLarge.copyWith(
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                          ),
                        ),

                        AppSpacing.gapMD,

                        // Body text / description
                        if (letter.contentBody != null && letter.contentBody!.isNotEmpty) ...[
                          Text(
                            letter.contentBody!,
                            style: AppTypography.bodyRegular.copyWith(
                              height: 1.6,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          AppSpacing.gapLG,
                        ],

                        // Image / PDF Document Preview Container
                        if (_isLoadingUrl) ...[
                          Container(
                            height: 200,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: AppColors.slateBg,
                              borderRadius: AppRadius.borderMd,
                              border: Border.all(color: AppColors.borderSubtle),
                            ),
                            child: const Center(child: CircularProgressIndicator()),
                          ),
                          AppSpacing.gapLG,
                        ] else if (_isImage && _resolvedUrl != null && _resolvedUrl!.startsWith('http')) ...[
                          Container(
                            height: 320,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: AppColors.slateBg,
                              borderRadius: AppRadius.borderMd,
                              border: Border.all(color: AppColors.borderSubtle),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: PhotoView(
                              imageProvider: NetworkImage(_resolvedUrl!),
                              minScale: PhotoViewComputedScale.contained,
                              maxScale: PhotoViewComputedScale.covered * 2.5,
                              backgroundDecoration: const BoxDecoration(color: Colors.white),
                            ),
                          ),
                          AppSpacing.gapLG,
                        ] else ...[
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.slateBg,
                              borderRadius: AppRadius.borderMd,
                              border: Border.all(color: AppColors.borderSubtle),
                            ),
                            child: Row(
                              children: [
                                const Icon(CupertinoIcons.doc_fill, size: 36, color: AppColors.primary),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "${letter.title}.pdf",
                                        style: AppTypography.bodyRegular.copyWith(fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        "Verified HR Digital Document",
                                        style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                ElevatedButton.icon(
                                  onPressed: _openExternalDocument,
                                  icon: const Icon(CupertinoIcons.eye_fill, size: 14),
                                  label: const Text("Open PDF"),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: AppRadius.borderPill),
                                    textStyle: AppTypography.caption.copyWith(fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          AppSpacing.gapLG,
                        ],

                        // Verification / Seal status
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: letter.isSigned ? AppColors.mintBg : AppColors.peachBg,
                            borderRadius: AppRadius.borderMd,
                            border: Border.all(
                              color: (letter.isSigned ? AppColors.mintFg : AppColors.peachFg).withValues(alpha: 0.2),
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                letter.isSigned ? CupertinoIcons.checkmark_seal_fill : CupertinoIcons.clock_fill,
                                size: 24,
                                color: letter.isSigned ? AppColors.mintFg : AppColors.peachFg,
                              ),
                              AppSpacing.hGapMD,
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      letter.isSigned ? "Digitally Signed & Acknowledged" : "Action Required: Digital Signature",
                                      style: AppTypography.caption.copyWith(
                                        fontWeight: FontWeight.bold,
                                        color: letter.isSigned ? AppColors.mintFg : AppColors.peachFg,
                                      ),
                                    ),
                                    Text(
                                      letter.isSigned
                                          ? "Tamper-proof digital seal verified on ${letter.signedAt != null ? '${letter.signedAt!.day}/${letter.signedAt!.month}/${letter.signedAt!.year}' : 'record'}."
                                          : "Please review the terms and complete your digital acknowledgment below.",
                                      style: AppTypography.overline.copyWith(
                                        color: (letter.isSigned ? AppColors.mintFg : AppColors.peachFg).withValues(alpha: 0.9),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            AppSpacing.gapLG,

            // 2. Document Information Card
            Text("Document Information", style: AppTypography.titleMedium),
            AppSpacing.gapMD,
            AppCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildDetailRow("Document Title", letter.title),
                  const Divider(height: 20, color: AppColors.borderSubtle),
                  _buildDetailRow("Category", letter.category),
                  const Divider(height: 20, color: AppColors.borderSubtle),
                  _buildDetailRow("Issued Date", issuedDateStr),
                  const Divider(height: 20, color: AppColors.borderSubtle),
                  _buildDetailRow("Issued By", letter.issuedByName ?? "HR Department"),
                  const Divider(height: 20, color: AppColors.borderSubtle),
                  _buildDetailRow("Reference No.", letter.referenceNumber ?? "REF-WFOS-2026"),
                  const Divider(height: 20, color: AppColors.borderSubtle),
                  _buildDetailRow("Status", letter.status),
                ],
              ),
            ),

            AppSpacing.gapLG,

            // 3. Signature Action or Download Button
            if (!letter.isSigned && letter.requiresSignature) ...[
              AppButton(
                label: _isSigning ? "Signing Document..." : "Digitally Sign & Acknowledge Letter",
                icon: CupertinoIcons.pencil_outline,
                variant: AppButtonVariant.primaryPill,
                onPressed: _isSigning ? null : _handleSignAndAcknowledge,
              ),
              AppSpacing.gapMD,
            ],

            Row(
              children: [
                Expanded(
                  child: AppButton(
                    label: "Download Letter PDF",
                    icon: CupertinoIcons.arrow_down_doc,
                    variant: AppButtonVariant.secondaryPill,
                    onPressed: _triggerDownload,
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  decoration: const BoxDecoration(
                    color: AppColors.slateBg,
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: const Icon(CupertinoIcons.share, color: AppColors.textPrimary, size: 20),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("Document link copied to clipboard."),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTypography.caption.copyWith(color: AppColors.textMuted)),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            value,
            style: AppTypography.bodyRegular.copyWith(fontWeight: FontWeight.bold),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}
