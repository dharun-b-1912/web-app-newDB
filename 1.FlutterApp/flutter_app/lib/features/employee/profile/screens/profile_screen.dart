import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/services/sensitive_data_auth_service.dart';
import '../../../../core/services/user_service.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../core/utils/secure_log.dart';
import '../../../../widgets/core/app_button.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/app_header.dart';
import '../../../../widgets/core/avatar_image_helper.dart';
import '../../../../widgets/core/status_chip.dart';
import '../../../profile/dialogs/change_password_modal.dart';
import '../../../../repositories/supabase/supabase_auth_repository.dart';
import '../../../../core/services/avatar_service.dart';
import '../widgets/profile_photo_editor_dialog.dart';
import '../dialogs/emergency_contact_dialog.dart';
import '../dialogs/documents_summary_dialog.dart';
import '../dialogs/assets_summary_dialog.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final Map<String, bool> _revealedFields = {
    'account': false,
    'pf': false,
    'esi': false,
  };
  final Map<String, Timer?> _revealTimers = {};
  bool _isUploadingPhoto = false;

  @override
  void dispose() {
    for (final timer in _revealTimers.values) {
      timer?.cancel();
    }
    super.dispose();
  }

  void _toggleSensitiveField(
      String fieldKey, String fieldTitle, String? rawValue) {
    if (_revealedFields[fieldKey] == true) {
      setState(() {
        _revealedFields[fieldKey] = false;
        _revealTimers[fieldKey]?.cancel();
      });
    } else {
      _showPasswordVerificationDialog(fieldKey, fieldTitle, rawValue);
    }
  }

  void _showPasswordVerificationDialog(
      String fieldKey, String fieldTitle, String? rawValue) {
    final passwordController = TextEditingController();
    bool isObscured = true;
    String? errorMessage;
    bool isLoading = false;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return Dialog(
              backgroundColor: AppColors.surfaceWhite,
              shape: RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: AppColors.mintBg,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(CupertinoIcons.lock_shield_fill,
                          color: AppColors.primary, size: 24),
                    ),
                    AppSpacing.gapMD,
                    Text(
                      "Verify Your Identity",
                      style: AppTypography.titleLarge,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "Enter your JOY PeopleHR password to view $fieldTitle.",
                      style: AppTypography.caption
                          .copyWith(color: AppColors.textMuted),
                      textAlign: TextAlign.center,
                    ),
                    AppSpacing.gapLG,
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.slateBg,
                        borderRadius: AppRadius.borderMd,
                        border: Border.all(
                          color: errorMessage != null
                              ? AppColors.statusError
                              : AppColors.borderSubtle,
                        ),
                      ),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 2),
                      child: TextField(
                        controller: passwordController,
                        obscureText: isObscured,
                        autofocus: true,
                        style: AppTypography.bodyRegular,
                        decoration: InputDecoration(
                          hintText: "Enter password",
                          hintStyle: AppTypography.bodyRegular
                              .copyWith(color: AppColors.textMuted),
                          border: InputBorder.none,
                          suffixIcon: IconButton(
                            icon: Icon(
                              isObscured
                                  ? CupertinoIcons.eye
                                  : CupertinoIcons.eye_slash,
                              size: 18,
                              color: AppColors.textMuted,
                            ),
                            onPressed: () {
                              setDialogState(() {
                                isObscured = !isObscured;
                              });
                            },
                          ),
                        ),
                        onSubmitted: (_) async {
                          await _processVerification(
                            dialogCtx,
                            passwordController.text,
                            fieldKey,
                            setDialogState,
                            (msg) => errorMessage = msg,
                            (loading) => isLoading = loading,
                          );
                        },
                      ),
                    ),
                    if (errorMessage != null) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(CupertinoIcons.exclamationmark_circle,
                              size: 14, color: AppColors.statusError),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              errorMessage!,
                              style: AppTypography.caption
                                  .copyWith(color: AppColors.statusError),
                            ),
                          ),
                        ],
                      ),
                    ],
                    AppSpacing.gapLG,
                    Row(
                      children: [
                        Expanded(
                          child: AppButton(
                            label: "Cancel",
                            variant: AppButtonVariant.secondaryPill,
                            onPressed: () => Navigator.pop(dialogCtx),
                          ),
                        ),
                        AppSpacing.hGapMD,
                        Expanded(
                          child: AppButton(
                            label: isLoading ? "Verifying..." : "Verify",
                            variant: AppButtonVariant.primaryPill,
                            onPressed: isLoading
                                ? null
                                : () async {
                                    await _processVerification(
                                      dialogCtx,
                                      passwordController.text,
                                      fieldKey,
                                      setDialogState,
                                      (msg) => errorMessage = msg,
                                      (loading) => isLoading = loading,
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
          },
        );
      },
    );
  }

  Future<void> _processVerification(
    BuildContext dialogCtx,
    String password,
    String fieldKey,
    StateSetter setDialogState,
    Function(String?) setErrorMessage,
    Function(bool) setLoading,
  ) async {
    if (password.trim().isEmpty) {
      setDialogState(() {
        setErrorMessage("Please enter your password.");
      });
      return;
    }
    setDialogState(() {
      setLoading(true);
      setErrorMessage(null);
    });

    final success =
        await SensitiveDataAuthService.instance.verifyPassword(password);
    if (!mounted) return;

    if (success) {
      if (dialogCtx.mounted) Navigator.pop(dialogCtx);
      setState(() {
        _revealedFields[fieldKey] = true;
        _revealTimers[fieldKey]?.cancel();
        _revealTimers[fieldKey] = Timer(const Duration(seconds: 45), () {
          if (mounted) {
            setState(() {
              _revealedFields[fieldKey] = false;
            });
          }
        });
      });
    } else {
      setDialogState(() {
        setLoading(false);
        setErrorMessage("Incorrect password. Please try again.");
      });
    }
  }

  Future<void> _showPhotoPickerOptions() async {
    final hasPhoto =
        UserService.instance.currentUser.profileImage?.isNotEmpty == true;

    showCupertinoModalPopup(
      context: context,
      builder: (actionCtx) => CupertinoActionSheet(
        title: Text("Change Profile Photo", style: AppTypography.titleMedium),
        message: const Text(
            "Select photo source for your official HR profile picture."),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () async {
              Navigator.pop(actionCtx);
              await _pickImage(ImageSource.gallery);
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(CupertinoIcons.photo,
                    color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                Text("Choose from Gallery",
                    style: AppTypography.bodyRegular.copyWith(
                        color: AppColors.primary, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          CupertinoActionSheetAction(
            onPressed: () async {
              Navigator.pop(actionCtx);
              await _pickImage(ImageSource.camera);
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(CupertinoIcons.camera,
                    color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                Text("Take a Photo",
                    style: AppTypography.bodyRegular.copyWith(
                        color: AppColors.primary, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          if (hasPhoto)
            CupertinoActionSheetAction(
              isDestructiveAction: true,
              onPressed: () async {
                Navigator.pop(actionCtx);
                setState(() => _isUploadingPhoto = true);
                try {
                  await AvatarService.instance.removeAvatar();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                            "Profile photo removed. Showing initials avatar."),
                        backgroundColor: AppColors.primary,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("Failed to remove photo: $e"),
                        backgroundColor: Colors.red,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                } finally {
                  if (mounted) setState(() => _isUploadingPhoto = false);
                }
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(CupertinoIcons.trash,
                      color: AppColors.statusError, size: 20),
                  const SizedBox(width: 8),
                  Text("Remove Current Photo",
                      style: AppTypography.bodyRegular.copyWith(
                          color: AppColors.statusError,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(actionCtx),
          child: Text("Cancel",
              style: AppTypography.bodyRegular.copyWith(
                  color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }

  static const int _maxImageSizeBytes = 12 * 1024 * 1024; // 12 MB

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final XFile? picked = await picker.pickImage(
        source: source,
        maxWidth: 2400,
        maxHeight: 2400,
        imageQuality: 98,
      );
      if (picked != null && mounted) {
        final bytes = await picked.readAsBytes();
        if (bytes.length > _maxImageSizeBytes) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Image is too large. Maximum size is 12 MB.'),
                backgroundColor: Colors.red,
              ),
            );
          }
          return;
        }
        _showImagePreviewDialog(bytes, fileName: picked.name);
      }
    } catch (e) {
      secureLog("Error picking image: $e");
    }
  }

  void _showImagePreviewDialog(Uint8List imageBytes, {String? fileName}) {
    ProfilePhotoEditorDialog.show(
      context: context,
      imageBytes: imageBytes,
      onChooseAnother: _showPhotoPickerOptions,
      onPhotoSaved: (bytes) async {
        setState(() => _isUploadingPhoto = true);
        try {
          await AvatarService.instance
              .uploadAndActivateAvatarBytes(bytes, fileName: fileName);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    const Icon(CupertinoIcons.checkmark_circle_fill,
                        color: Colors.white, size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        "Profile photo updated and synced successfully.",
                        style: AppTypography.bodyLarge.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                backgroundColor: AppColors.primary,
                duration: const Duration(seconds: 3),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
              ),
            );
          }
        } catch (e) {
          secureLog("Error saving avatar: $e");
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                    "We couldn't save the new profile photo. Your existing photo is safe. ($e)"),
                backgroundColor: Colors.red,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        } finally {
          if (mounted) setState(() => _isUploadingPhoto = false);
        }
      },
    );
  }

  Widget _buildSectionTitle(String title, {IconData? icon, Widget? trailing}) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.md, bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 16, color: AppColors.primary),
                const SizedBox(width: 6),
              ],
              Text(
                title,
                style: AppTypography.titleMedium.copyWith(fontSize: 16),
              ),
            ],
          ),
          if (trailing != null) trailing,
        ],
      ),
    );
  }

  Widget _buildKeyValueRow(String label, String value,
      {bool showDivider = true, Widget? trailingAction}) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                flex: 4,
                child: Text(
                  label,
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.textMuted,
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 5,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Flexible(
                      child: Text(
                        value,
                        textAlign: TextAlign.right,
                        style: AppTypography.bodyRegular.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                    if (trailingAction != null) ...[
                      const SizedBox(width: 6),
                      trailingAction,
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        if (showDivider)
          const Divider(height: 1, color: AppColors.borderSubtle),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: UserService.instance,
      builder: (context, _) {
        final user = UserService.instance.currentUser;
        final initials = user.name.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join();

        final payroll = user.payrollStatutory;

        final isAccountRevealed = _revealedFields['account'] == true;
        final rawAcc = payroll?.rawAccountNumber;
        final maskedAcc = payroll?.accountNumber;
        final accountDisplay = isAccountRevealed
            ? (rawAcc ?? maskedAcc ?? "—")
            : (maskedAcc ?? (rawAcc != null ? '•••• •••• ${rawAcc.substring(rawAcc.length > 4 ? rawAcc.length - 4 : 0)}' : "—"));

        final isPfRevealed = _revealedFields['pf'] == true;
        final rawPf = payroll?.rawPfNumber;
        final maskedPf = payroll?.pfNumber;
        final pfDisplay = isPfRevealed
            ? (rawPf ?? maskedPf ?? "—")
            : (maskedPf ?? (rawPf != null ? '•••• •••• ${rawPf.substring(rawPf.length > 4 ? rawPf.length - 4 : 0)}' : "—"));

        final isEsiRevealed = _revealedFields['esi'] == true;
        final rawEsi = payroll?.rawEsiNumber;
        final maskedEsi = payroll?.esiNumber;
        final esiDisplay = isEsiRevealed
            ? (rawEsi ?? maskedEsi ?? "—")
            : (maskedEsi ?? (rawEsi != null ? '•••• •••• ${rawEsi.substring(rawEsi.length > 4 ? rawEsi.length - 4 : 0)}' : "—"));

        final managerName = user.reportsToName?.isNotEmpty == true
            ? user.reportsToName!
            : '—';

        final campusName = user.campus.isNotEmpty
            ? user.campus
            : '—';

        final addressDisplay = user.address.isNotEmpty
            ? user.address
            : '—';

        final phoneDisplay = user.contactNumber.isNotEmpty
            ? user.contactNumber
            : '—';

        final dojDisplay = user.joiningDate?.isNotEmpty == true
            ? user.joiningDate!
            : '—';

        final empIdDisplay = user.employeeId.isNotEmpty
            ? user.employeeId
            : '—';

        final deptDisplay = user.department.isNotEmpty
            ? user.department
            : '—';

        final desigDisplay = user.designation.isNotEmpty
            ? user.designation
            : '—';

        final workEmailDisplay = user.officeEmail?.isNotEmpty == true
            ? user.officeEmail!
            : '—';

        final personalEmailDisplay = user.personalEmail.isNotEmpty
            ? user.personalEmail
            : '—';

        final hasEmergencyContact = user.emergencyContact != null &&
            (user.emergencyContact!.name.isNotEmpty || user.emergencyContact!.phone.isNotEmpty);

        final shiftDisplay = (user.shiftStart.isNotEmpty && user.shiftEnd.isNotEmpty)
            ? "${user.shiftStart} – ${user.shiftEnd}"
            : (user.shiftName?.isNotEmpty == true ? user.shiftName! : "General Shift (09:30 AM – 06:30 PM)");

        return Scaffold(
          backgroundColor: AppColors.scaffoldBg,
          body: SafeArea(
            bottom: true,
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.only(
                bottom: AppSpacing.bottomNavClearance + 48,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppHeader(
                    subtitle: deptDisplay != '—' ? deptDisplay : 'Joy PeopleHR',
                    title: "Profile",
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.screenHorizontal,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppSpacing.gapMD,

                        // ── 1. COMPACT IDENTITY HERO ──────────────────────────────
                        AppCard(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                          child: Column(
                            children: [
                              Stack(
                                children: [
                                  Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      WorkforceAvatar(
                                        pathOrUrl: user.profileImage,
                                        fallbackInitials: initials.isNotEmpty ? initials : 'EM',
                                        size: 80,
                                        variant: AvatarVariant.large,
                                        backgroundColor: AppColors.primary,
                                        textStyle: AppTypography.displayHeader.copyWith(
                                          color: Colors.white,
                                          fontSize: 26,
                                        ),
                                      ),
                                      if (_isUploadingPhoto)
                                        Container(
                                          width: 80,
                                          height: 80,
                                          decoration: const BoxDecoration(
                                            color: Colors.black45,
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Center(
                                            child: CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2.5,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  Positioned(
                                    bottom: 0,
                                    right: 0,
                                    child: GestureDetector(
                                      onTap: _isUploadingPhoto ? null : _showPhotoPickerOptions,
                                      child: Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary,
                                          shape: BoxShape.circle,
                                          border: Border.all(color: Colors.white, width: 2),
                                          boxShadow: const [
                                            BoxShadow(
                                              color: Colors.black12,
                                              blurRadius: 4,
                                              offset: Offset(0, 2),
                                            ),
                                          ],
                                        ),
                                        child: const Icon(
                                          CupertinoIcons.camera_fill,
                                          size: 13,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                user.name.isNotEmpty ? user.name : 'Employee',
                                style: AppTypography.titleLarge.copyWith(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              if (desigDisplay != '—') ...[
                                const SizedBox(height: 2),
                                Text(
                                  desigDisplay,
                                  style: AppTypography.bodyRegular.copyWith(
                                    color: AppColors.textMuted,
                                    fontWeight: FontWeight.w500,
                                    fontSize: 13.5,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (empIdDisplay != '—') ...[
                                    StatusChip(
                                      label: empIdDisplay,
                                      type: StatusType.info,
                                    ),
                                    const SizedBox(width: 8),
                                    Text("•", style: AppTypography.caption.copyWith(color: AppColors.textMuted)),
                                    const SizedBox(width: 8),
                                  ],
                                  StatusChip(
                                    label: user.role.isNotEmpty ? user.role : 'EMPLOYEE',
                                    type: StatusType.neutral,
                                  ),
                                  const SizedBox(width: 8),
                                  Text("•", style: AppTypography.caption.copyWith(color: AppColors.textMuted)),
                                  const SizedBox(width: 8),
                                  StatusChip(
                                    label: (user.status?.isNotEmpty == true) ? user.status!.toUpperCase() : 'ACTIVE',
                                    type: StatusType.success,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        AppSpacing.gapMD,

                        // ── 2. TODAY'S WORK CARD ──────────────────────────────────
                        AppCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: AppColors.mintBg,
                                  borderRadius: AppRadius.borderSquircle,
                                ),
                                child: const Icon(CupertinoIcons.clock_fill, color: AppColors.primary, size: 22),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          "TODAY'S WORK",
                                          style: AppTypography.caption.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                            letterSpacing: 0.5,
                                            fontSize: 11,
                                          ),
                                        ),
                                        const Spacer(),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.mintBg,
                                            borderRadius: AppRadius.borderPill,
                                          ),
                                          child: Text(
                                            user.shiftName?.isNotEmpty == true ? user.shiftName! : "General Shift",
                                            style: AppTypography.caption.copyWith(
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primary,
                                              fontSize: 11,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      shiftDisplay,
                                      style: AppTypography.titleMedium.copyWith(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    if (campusName != '—') ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        campusName,
                                        style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                        AppSpacing.gapLG,

                        // ── 3. WORK IDENTITY ──────────────────────────────────────
                        _buildSectionTitle(
                          "Work Identity",
                          icon: CupertinoIcons.briefcase_fill,
                        ),
                        AppCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: Column(
                            children: [
                              _buildKeyValueRow("Employee ID", empIdDisplay),
                              _buildKeyValueRow("Department / Unit", deptDisplay),
                              _buildKeyValueRow("Designation / Role", desigDisplay),
                              _buildKeyValueRow("Employment Type", user.employmentType.isNotEmpty ? user.employmentType : '—'),
                              _buildKeyValueRow("Supervisor / Manager", managerName),
                              _buildKeyValueRow("Plant / Campus", campusName),
                              _buildKeyValueRow("Date of Joining", dojDisplay, showDivider: false),
                            ],
                          ),
                        ),

                        AppSpacing.gapLG,

                        // ── 4. CONTACT INFORMATION ────────────────────────────────
                        _buildSectionTitle(
                          "Contact Information",
                          icon: CupertinoIcons.mail_solid,
                        ),
                        AppCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: Column(
                            children: [
                              _buildKeyValueRow(
                                "Mobile Number",
                                phoneDisplay,
                                trailingAction: phoneDisplay != '—'
                                    ? Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: AppColors.mintBg,
                                          borderRadius: AppRadius.borderPill,
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(CupertinoIcons.phone_fill, size: 10, color: AppColors.primary),
                                            const SizedBox(width: 4),
                                            Text("Call", style: AppTypography.caption.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 11)),
                                          ],
                                        ),
                                      )
                                    : null,
                              ),
                              _buildKeyValueRow(
                                "Official Work Email",
                                workEmailDisplay,
                              ),
                              _buildKeyValueRow(
                                "Personal Email",
                                personalEmailDisplay,
                              ),
                              _buildKeyValueRow("Residential Address", addressDisplay, showDivider: false),
                            ],
                          ),
                        ),

                        AppSpacing.gapLG,

                        // ── 5. EMERGENCY CONTACT ──────────────────────────────────
                        _buildSectionTitle(
                          "Emergency Contact",
                          icon: CupertinoIcons.phone_fill,
                          trailing: InkWell(
                            onTap: () => EmergencyContactDialog.show(context, currentContact: user.emergencyContact),
                            borderRadius: BorderRadius.circular(8),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    hasEmergencyContact ? CupertinoIcons.pencil : CupertinoIcons.plus_circle_fill,
                                    size: 13,
                                    color: AppColors.primary,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    hasEmergencyContact ? "Edit" : "Add Contact",
                                    style: AppTypography.caption.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        AppCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                          child: hasEmergencyContact
                              ? Column(
                                  children: [
                                    _buildKeyValueRow(
                                      "Contact Name",
                                      user.emergencyContact!.name.isNotEmpty ? user.emergencyContact!.name : '—',
                                    ),
                                    _buildKeyValueRow(
                                      "Relationship",
                                      user.emergencyContact!.relationship.isNotEmpty ? user.emergencyContact!.relationship : '—',
                                    ),
                                    _buildKeyValueRow(
                                      "Phone Number",
                                      user.emergencyContact!.phone.isNotEmpty ? user.emergencyContact!.phone : '—',
                                      showDivider: false,
                                      trailingAction: user.emergencyContact!.phone.isNotEmpty
                                          ? Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(
                                                color: AppColors.mintBg,
                                                borderRadius: AppRadius.borderPill,
                                              ),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  const Icon(CupertinoIcons.phone_fill, size: 10, color: AppColors.primary),
                                                  const SizedBox(width: 4),
                                                  Text("Call", style: AppTypography.caption.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 11)),
                                                ],
                                              ),
                                            )
                                          : null,
                                    ),
                                  ],
                                )
                              : Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: const BoxDecoration(
                                          color: AppColors.roseBg,
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(CupertinoIcons.exclamationmark_shield_fill, color: AppColors.roseFg, size: 18),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              "No Emergency Contact Added",
                                              style: AppTypography.bodyRegular.copyWith(fontWeight: FontWeight.bold),
                                            ),
                                            Text(
                                              "Add a primary family contact for critical urgencies.",
                                              style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      AppButton(
                                        label: "+ Add",
                                        variant: AppButtonVariant.primaryPill,
                                        onPressed: () => EmergencyContactDialog.show(context),
                                      ),
                                    ],
                                  ),
                                ),
                        ),

                        AppSpacing.gapLG,

                        // ── 6. DOCUMENTS SHORTCUT ─────────────────────────────────
                        _buildSectionTitle(
                          "Documents & Records",
                          icon: CupertinoIcons.folder_fill,
                        ),
                        AppCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: AppColors.mintBg,
                                  borderRadius: AppRadius.borderSquircle,
                                ),
                                child: const Icon(CupertinoIcons.doc_text_fill, color: AppColors.primary, size: 20),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "Official Documents & Records",
                                      style: AppTypography.bodyRegular.copyWith(fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      "Identity, Appointment Letter, Compliance & Certificates",
                                      style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              InkWell(
                                onTap: () => DocumentsSummaryDialog.show(context),
                                borderRadius: AppRadius.borderPill,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppColors.slateBg,
                                    borderRadius: AppRadius.borderPill,
                                    border: Border.all(color: AppColors.borderSubtle),
                                  ),
                                  child: Text(
                                    "View",
                                    style: AppTypography.caption.copyWith(fontWeight: FontWeight.bold, color: AppColors.primary),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        AppSpacing.gapLG,

                        // ── 7. ASSETS & HARDWARE ──────────────────────────────────
                        _buildSectionTitle(
                          "Assigned Assets",
                          icon: CupertinoIcons.device_laptop,
                        ),
                        AppCard(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: AppColors.lavenderBg,
                                  borderRadius: AppRadius.borderSquircle,
                                ),
                                child: const Icon(CupertinoIcons.cube_box_fill, color: AppColors.lavenderFg, size: 20),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      user.assignedAssets.isNotEmpty
                                          ? "${user.assignedAssets.length} Assets Assigned"
                                          : "Equipment & Hardware",
                                      style: AppTypography.bodyRegular.copyWith(fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      user.assignedAssets.isNotEmpty
                                          ? user.assignedAssets.map((a) => a.assetName).join(', ')
                                          : "Hardware, tools, uniform & access badges assigned to you",
                                      style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              InkWell(
                                onTap: () => AssetsSummaryDialog.show(context),
                                borderRadius: AppRadius.borderPill,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppColors.slateBg,
                                    borderRadius: AppRadius.borderPill,
                                    border: Border.all(color: AppColors.borderSubtle),
                                  ),
                                  child: Text(
                                    "View",
                                    style: AppTypography.caption.copyWith(fontWeight: FontWeight.bold, color: AppColors.lavenderFg),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        AppSpacing.gapLG,

                        // ── 8. PAYROLL & STATUTORY ────────────────────────────────
                        _buildSectionTitle(
                          "Payroll & Statutory",
                          icon: CupertinoIcons.building_2_fill,
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.mintBg,
                              borderRadius: AppRadius.borderPill,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(CupertinoIcons.lock_shield_fill, size: 12, color: AppColors.primary),
                                const SizedBox(width: 4),
                                Text("Protected", style: AppTypography.caption.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 11)),
                              ],
                            ),
                          ),
                        ),
                        AppCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildKeyValueRow(
                                "Disbursement Bank",
                                payroll?.bankName?.isNotEmpty == true ? payroll!.bankName! : "—",
                              ),
                              _buildKeyValueRow(
                                "Branch & IFSC",
                                (payroll?.branchName?.isNotEmpty == true || payroll?.ifscCode?.isNotEmpty == true)
                                    ? "${payroll?.branchName ?? ''} (${payroll?.ifscCode ?? ''})".trim()
                                    : "—",
                              ),
                              _buildKeyValueRow(
                                "Account Number",
                                accountDisplay,
                                trailingAction: (payroll?.rawAccountNumber?.isNotEmpty == true || payroll?.accountNumber?.isNotEmpty == true)
                                    ? InkWell(
                                        onTap: () => _toggleSensitiveField(
                                          'account',
                                          'Account Number',
                                          payroll?.rawAccountNumber ?? payroll?.accountNumber ?? '',
                                        ),
                                        borderRadius: BorderRadius.circular(12),
                                        child: Padding(
                                          padding: const EdgeInsets.all(4),
                                          child: Icon(
                                            isAccountRevealed ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
                                            size: 18,
                                            color: isAccountRevealed ? AppColors.statusError : AppColors.primary,
                                          ),
                                        ),
                                      )
                                    : null,
                              ),
                              _buildKeyValueRow(
                                "PAN Number",
                                payroll?.panNumber?.isNotEmpty == true
                                    ? payroll!.panNumber!
                                    : (payroll?.rawPanNumber?.isNotEmpty == true ? payroll!.rawPanNumber! : "—"),
                              ),
                              _buildKeyValueRow(
                                "PF / UAN Number",
                                pfDisplay,
                                trailingAction: (payroll?.rawPfNumber?.isNotEmpty == true || payroll?.pfNumber?.isNotEmpty == true)
                                    ? InkWell(
                                        onTap: () => _toggleSensitiveField(
                                          'pf',
                                          'PF Number',
                                          payroll?.rawPfNumber ?? payroll?.pfNumber ?? '',
                                        ),
                                        borderRadius: BorderRadius.circular(12),
                                        child: Padding(
                                          padding: const EdgeInsets.all(4),
                                          child: Icon(
                                            isPfRevealed ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
                                            size: 18,
                                            color: isPfRevealed ? AppColors.statusError : AppColors.primary,
                                          ),
                                        ),
                                      )
                                    : null,
                              ),
                              _buildKeyValueRow(
                                "ESI Number",
                                esiDisplay,
                                trailingAction: (payroll?.rawEsiNumber?.isNotEmpty == true || payroll?.esiNumber?.isNotEmpty == true)
                                    ? InkWell(
                                        onTap: () => _toggleSensitiveField(
                                          'esi',
                                          'ESI Number',
                                          payroll?.rawEsiNumber ?? payroll?.esiNumber ?? '',
                                        ),
                                        borderRadius: BorderRadius.circular(12),
                                        child: Padding(
                                          padding: const EdgeInsets.all(4),
                                          child: Icon(
                                            isEsiRevealed ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
                                            size: 18,
                                            color: isEsiRevealed ? AppColors.statusError : AppColors.primary,
                                          ),
                                        ),
                                      )
                                    : null,
                              ),
                              _buildKeyValueRow(
                                "Tax Regime",
                                payroll?.taxRegime?.isNotEmpty == true ? payroll!.taxRegime! : "—",
                                showDivider: false,
                              ),
                            ],
                          ),
                        ),

                        AppSpacing.gapLG,

                        // ── 9. SECURITY & PASSWORD ────────────────────────────────
                        _buildSectionTitle(
                          "Security & Login",
                          icon: CupertinoIcons.shield_lefthalf_fill,
                        ),
                        AppCard(
                          padding: const EdgeInsets.all(16),
                          child: InkWell(
                            onTap: () => showChangePasswordModal(context),
                            borderRadius: AppRadius.borderCard,
                            child: Row(
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: AppColors.mintBg,
                                    borderRadius: AppRadius.borderSquircle,
                                  ),
                                  child: const Icon(CupertinoIcons.lock_shield_fill, color: AppColors.primary, size: 18),
                                ),
                                AppSpacing.hGapMD,
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "Security & Password",
                                        style: AppTypography.bodyRegular.copyWith(fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        "Change password • 1 Active Session (This Device)",
                                        style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(CupertinoIcons.chevron_forward, size: 16, color: AppColors.textMuted),
                              ],
                            ),
                          ),
                        ),

                        AppSpacing.gapLG,

                        // ── 10. DANGER ZONE: SIGN OUT ─────────────────────────────
                        AppCard(
                          padding: const EdgeInsets.all(16),
                          child: InkWell(
                            onTap: () => _showSignOutConfirmation(context),
                            borderRadius: AppRadius.borderCard,
                            child: Row(
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: AppColors.roseBg,
                                    borderRadius: AppRadius.borderSquircle,
                                  ),
                                  child: const Icon(CupertinoIcons.arrow_right_square_fill, color: AppColors.roseFg, size: 18),
                                ),
                                AppSpacing.hGapMD,
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "Sign Out",
                                        style: AppTypography.bodyRegular.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.roseFg,
                                        ),
                                      ),
                                      Text(
                                        "Log out of your WorkForceOS account safely",
                                        style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(CupertinoIcons.chevron_forward, size: 16, color: AppColors.roseFg),
                              ],
                            ),
                          ),
                        ),

                        // Extra bottom breathing room to guarantee 0 navigation bar overlap
                        const SizedBox(height: 36),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _showSignOutConfirmation(BuildContext context) {
    showCupertinoDialog(
      context: context,
      builder: (dialogCtx) => CupertinoAlertDialog(
        title: const Text("Sign Out"),
        content: const Text("Are you sure you want to sign out of your WorkForceOS session?"),
        actions: [
          CupertinoDialogAction(
            child: const Text("Cancel"),
            onPressed: () => Navigator.pop(dialogCtx),
          ),
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () async {
              Navigator.pop(dialogCtx);
              await SupabaseAuthRepository().signOut();
            },
            child: const Text("Sign Out"),
          ),
        ],
      ),
    );
  }
}
