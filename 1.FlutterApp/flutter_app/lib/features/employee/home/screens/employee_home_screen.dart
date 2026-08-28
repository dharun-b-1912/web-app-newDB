import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../../../core/controllers/employee_controller.dart';
import '../../../../core/services/attendance_service.dart';
import '../../../../core/services/location_service.dart';
import '../../../../core/services/user_service.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../models/app_services_catalog.dart';
import '../../../../models/hrms_models.dart';
import '../../../../widgets/applet_tile.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/avatar_image_helper.dart';
import '../../../../widgets/core/status_chip.dart';
import '../../../../widgets/core/workspace_team_switcher.dart';
import '../../../../widgets/location/geofence_map_dialog.dart';
import '../../attendance/dialogs/regularization_modal.dart';
import '../../claims/screens/expense_claims_screen.dart';
import '../../communication/screens/communication_screen.dart';
import '../../helpdesk/screens/helpdesk_screen.dart';
import '../../leave/dialogs/apply_leave_modal.dart';
import '../../payslips/screens/payslips_screen.dart';
import '../../profile/screens/profile_screen.dart';
import '../../services/screens/employee_services_screen.dart';
import '../../virtual_id/dialogs/virtual_id_card_dialog.dart';
import '../../../../models/employee_models.dart';
import '../../../../widgets/attendance/attendance_live_timer.dart';
import 'notifications_screen.dart';

class HomeDashboardScreen extends StatefulWidget {
  final VoidCallback onOpenServices;

  const HomeDashboardScreen({
    super.key,
    required this.onOpenServices,
  });

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> with WidgetsBindingObserver {
  UserModel get currentUser => UserService.instance.currentUser;
  WorkspaceMode _mode = WorkspaceMode.myWorkspace;
  StreamSubscription<ApprovedWorkLocation>? _geofenceSubscription;

  String get _timeBasedGreeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return "Good morning,";
    if (hour < 17) return "Good afternoon,";
    return "Good evening,";
  }

  String get _userInitials {
    final name = currentUser.name;
    final parts = name.split(' ');
    if (parts.length >= 2) {
      return "${parts[0][0]}${parts[1][0]}".toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    LocationService.instance.addListener(_onStateChange);
    AttendanceService.instance.addListener(_onStateChange);
    NotificationController.instance.addListener(_onStateChange);
    UserService.instance.addListener(_onStateChange);
    NotificationController.instance.initialize();

    // Subscribe to Automatic Geofence Entry Prompt
    _geofenceSubscription = LocationService.instance.onGeofenceEntered.listen((loc) {
      if (mounted && !AttendanceService.instance.session.isCheckedIn) {
        _showSmartGeofencePrompt(loc);
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      LocationService.instance.evaluateLiveLocation();
      AttendanceService.instance.fetchTodayAttendance();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _geofenceSubscription?.cancel();
    LocationService.instance.removeListener(_onStateChange);
    AttendanceService.instance.removeListener(_onStateChange);
    NotificationController.instance.removeListener(_onStateChange);
    UserService.instance.removeListener(_onStateChange);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      LocationService.instance.resumeTracking();
      AttendanceService.instance.fetchTodayAttendance();
    } else if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      LocationService.instance.pauseTracking();
    }
  }

  void _onStateChange() {
    if (mounted) {
      setState(() {});
    }
  }

  /// Displays smart non-blocking prompt when employee arrives at work location
  void _showSmartGeofencePrompt(ApprovedWorkLocation location) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              CupertinoIcons.location_fill,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "You're at ${location.name}",
                    style: AppTypography.caption.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12.5,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    "You are inside the attendance zone. Ready to clock in.",
                    style: AppTypography.overline.copyWith(
                      color: Colors.white.withValues(alpha: 0.85),
                      fontSize: 10.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        action: SnackBarAction(
          label: "Check In",
          textColor: AppColors.primaryAccent,
          onPressed: _handleCheckIn,
        ),
        backgroundColor: AppColors.primary,
        duration: const Duration(seconds: 6),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderMd,
        ),
      ),
    );
  }

  Future<void> _handleCheckIn() async {
    // Acquire fresh live location before checking in
    final location = await LocationService.instance.evaluateLiveLocation(silent: true);
    final result = await AttendanceService.instance.performCheckIn(
      location: location,
      approvedLocation: currentUser.approvedLocation,
    );

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              result.success
                  ? CupertinoIcons.checkmark_circle_fill
                  : CupertinoIcons.exclamationmark_triangle_fill,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                result.message,
                style: AppTypography.bodyLarge.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: result.success ? AppColors.primary : AppColors.statusError,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderMd,
        ),
      ),
    );
  }

  Future<void> _handleCheckOut() async {
    if (AttendanceService.instance.isProcessing) return;

    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) {
        final screenWidth = MediaQuery.sizeOf(dialogCtx).width;
        final maxDialogWidth = screenWidth > 440 ? 380.0 : (screenWidth - 32.0).clamp(280.0, 380.0);

        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxDialogWidth),
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceWhite,
                  borderRadius: AppRadius.borderLg,
                  boxShadow: AppShadows.softCard,
                ),
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: const BoxDecoration(
                        color: AppColors.peachBg,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        CupertinoIcons.square_arrow_right,
                        color: AppColors.peachFg,
                        size: 26,
                      ),
                    ),
                    AppSpacing.gapMD,
                    Text(
                      "Confirm Check-Out",
                      style: AppTypography.titleLarge,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      "After checking out, you won’t be able to check in again today.",
                      style: AppTypography.bodyRegular.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    AppSpacing.gapLG,
                    SizedBox(
                      width: double.infinity,
                      child: GestureDetector(
                        onTap: () => Navigator.of(dialogCtx).pop(true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: AppRadius.borderPill,
                            boxShadow: AppShadows.pillDark,
                          ),
                          child: Center(
                            child: Text(
                              "Confirm Check-Out",
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
                        onTap: () => Navigator.of(dialogCtx).pop(false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.slateBg,
                            borderRadius: AppRadius.borderPill,
                          ),
                          child: Center(
                            child: Text(
                              "Cancel",
                              style: AppTypography.bodyLarge.copyWith(
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );

    if (confirmed != true) return;
    if (!mounted) return;

    final result = await AttendanceService.instance.performCheckOut();

    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              result.success
                  ? CupertinoIcons.checkmark_circle_fill
                  : CupertinoIcons.exclamationmark_triangle_fill,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                result.message,
                style: AppTypography.bodyLarge.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: result.success ? AppColors.primary : AppColors.statusError,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderMd,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final double topSafeArea = MediaQuery.of(context).padding.top + 16;
    final locationResult = LocationService.instance.currentResult;
    final attendanceSession = AttendanceService.instance.session;
    final isCheckedIn = attendanceSession.isCheckedIn;

    return Stack(
      children: [
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: 340,
          child: Container(
            decoration: const BoxDecoration(
              gradient: AppColors.emeraldAuraHeader,
            ),
          ),
        ),
        SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            topSafeArea,
            AppSpacing.screenHorizontal,
            AppSpacing.bottomNavClearance,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _timeBasedGreeting,
                          style: AppTypography.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          currentUser.firstName,
                          style: AppTypography.displayHeader,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          (currentUser.companyName != null && currentUser.companyName!.isNotEmpty)
                              ? currentUser.companyName!
                              : "Organization",
                          style: AppTypography.bodySmall.copyWith(
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          "${currentUser.department.isNotEmpty && currentUser.department != 'N/A' ? currentUser.department.trim() : 'Development'} · ${(locationResult.targetLocation?.name ?? (currentUser.approvedLocation.name.isNotEmpty ? currentUser.approvedLocation.name : (currentUser.campus.isNotEmpty ? currentUser.campus : 'Assigned Work Location')))}",
                          style: AppTypography.caption.copyWith(
                            color: AppColors.textSecondary,
                            fontSize: 11,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ListenableBuilder(
                        listenable: NotificationController.instance,
                        builder: (context, _) {
                          final count = NotificationController.instance.unreadCount;
                          return GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                CupertinoPageRoute(builder: (_) => const NotificationsScreen()),
                              );
                            },
                            child: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.9),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 10,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  const Icon(
                                    CupertinoIcons.bell,
                                    size: 20,
                                    color: AppColors.textPrimary,
                                  ),
                                  if (count > 0)
                                    Positioned(
                                      top: 10,
                                      right: 11,
                                      child: Container(
                                        width: 9,
                                        height: 9,
                                        decoration: BoxDecoration(
                                          color: AppColors.statusError,
                                          shape: BoxShape.circle,
                                          border: Border.all(color: Colors.white, width: 1.5),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                      AppSpacing.hGapMD,
                      GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            CupertinoPageRoute(builder: (_) => const ProfileScreen()),
                          );
                        },
                        child: WorkforceAvatar(
                          pathOrUrl: currentUser.profileImage,
                          fallbackInitials: _userInitials,
                          size: 44,
                          variant: AvatarVariant.small,
                          backgroundColor: AppColors.primary,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.10),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              AppSpacing.gapLG,
              if (currentUser.canAccessTeam) ...[
                WorkspaceTeamSwitcher(
                  currentMode: _mode,
                  onModeChanged: (mode) => setState(() => _mode = mode),
                ),
                AppSpacing.gapLG,
              ],
              if (_mode == WorkspaceMode.myWorkspace) ...[
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // 1. Current Location Card (Live Automated Geofence Engine)
                      Expanded(
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () {
                            GeofenceMapDialog.show(
                              context,
                              currentUser: currentUser,
                              onCheckIn: _handleCheckIn,
                              onRefresh: () => LocationService.instance.refreshLocationsAndEvaluate(),
                            );
                          },
                          child: AppCard(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      width: 34,
                                      height: 34,
                                      decoration: BoxDecoration(
                                        color: locationResult.isInside
                                            ? AppColors.mintBg
                                            : (locationResult.state == AttendanceGpsState.locationDisabled ||
                                                    locationResult.state == AttendanceGpsState.permissionDenied ||
                                                    locationResult.state == AttendanceGpsState.permissionPermanentlyDenied
                                                ? AppColors.roseBg
                                                : (locationResult.state == AttendanceGpsState.scanning ||
                                                        locationResult.state == AttendanceGpsState.initializing
                                                    ? AppColors.skyBg
                                                    : AppColors.peachBg)),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Icon(
                                        locationResult.state == AttendanceGpsState.locationDisabled ||
                                                locationResult.state == AttendanceGpsState.permissionDenied ||
                                                locationResult.state == AttendanceGpsState.permissionPermanentlyDenied
                                            ? CupertinoIcons.location_slash
                                            : (locationResult.state == AttendanceGpsState.scanning ||
                                                    locationResult.state == AttendanceGpsState.initializing
                                                ? CupertinoIcons.compass
                                                : CupertinoIcons.location_solid),
                                        size: 17,
                                        color: locationResult.isInside
                                            ? AppColors.mintFg
                                            : (locationResult.state == AttendanceGpsState.locationDisabled ||
                                                    locationResult.state == AttendanceGpsState.permissionDenied ||
                                                    locationResult.state == AttendanceGpsState.permissionPermanentlyDenied
                                                ? AppColors.roseFg
                                                : (locationResult.state == AttendanceGpsState.scanning ||
                                                        locationResult.state == AttendanceGpsState.initializing
                                                    ? AppColors.skyFg
                                                    : AppColors.peachFg)),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Flexible(
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                                        decoration: BoxDecoration(
                                          color: locationResult.state == AttendanceGpsState.scanning ||
                                                  locationResult.state == AttendanceGpsState.initializing
                                              ? AppColors.skyBg
                                              : (locationResult.isInside
                                                  ? AppColors.mintBg
                                                  : (locationResult.state == AttendanceGpsState.locationDisabled ||
                                                          locationResult.state == AttendanceGpsState.permissionDenied ||
                                                          locationResult.state == AttendanceGpsState.permissionPermanentlyDenied
                                                      ? AppColors.roseBg
                                                      : AppColors.slateBg)),
                                          borderRadius: AppRadius.borderPill,
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              locationResult.state == AttendanceGpsState.scanning ||
                                                      locationResult.state == AttendanceGpsState.initializing
                                                  ? CupertinoIcons.arrow_2_circlepath
                                                  : (locationResult.isInside
                                                      ? CupertinoIcons.checkmark_alt
                                                      : CupertinoIcons.location),
                                              size: 9.5,
                                              color: locationResult.state == AttendanceGpsState.scanning ||
                                                      locationResult.state == AttendanceGpsState.initializing
                                                  ? AppColors.skyFg
                                                  : (locationResult.isInside
                                                      ? AppColors.mintFg
                                                      : (locationResult.state == AttendanceGpsState.locationDisabled ||
                                                              locationResult.state == AttendanceGpsState.permissionDenied
                                                          ? AppColors.roseFg
                                                          : AppColors.textSecondary)),
                                            ),
                                            const SizedBox(width: 3),
                                            Flexible(
                                              child: Text(
                                                locationResult.state == AttendanceGpsState.scanning ||
                                                        locationResult.state == AttendanceGpsState.initializing
                                                    ? "GPS: Locating..."
                                                    : (locationResult.isInside
                                                        ? "GPS: In"
                                                        : (locationResult.state == AttendanceGpsState.locationDisabled
                                                            ? "GPS Off"
                                                            : (locationResult.state == AttendanceGpsState.permissionDenied
                                                                ? "Permission"
                                                                : "GPS: Out"))),
                                                overflow: TextOverflow.ellipsis,
                                                maxLines: 1,
                                                style: AppTypography.overline.copyWith(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w700,
                                                  color: locationResult.state == AttendanceGpsState.scanning ||
                                                          locationResult.state == AttendanceGpsState.initializing
                                                      ? AppColors.skyFg
                                                      : (locationResult.isInside
                                                          ? AppColors.mintFg
                                                          : (locationResult.state == AttendanceGpsState.locationDisabled ||
                                                                  locationResult.state == AttendanceGpsState.permissionDenied
                                                              ? AppColors.roseFg
                                                              : AppColors.textSecondary)),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                AppSpacing.gapSM,
                                Text(
                                  locationResult.targetLocation?.name ??
                                      (currentUser.approvedLocation.name.isNotEmpty
                                          ? currentUser.approvedLocation.name
                                          : (currentUser.campus.isNotEmpty
                                              ? currentUser.campus
                                              : 'Assigned Work Location')),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppTypography.bodyLarge.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                AppSpacing.gapXS,
                                locationResult.state == AttendanceGpsState.scanning ||
                                        locationResult.state == AttendanceGpsState.initializing
                                    ? const StatusChip(
                                        label: "Locating you...",
                                        type: StatusType.info,
                                        icon: CupertinoIcons.compass,
                                      )
                                    : locationResult.state == AttendanceGpsState.locationDisabled
                                        ? const StatusChip(
                                            label: "GPS Disabled (Turn on)",
                                            type: StatusType.warning,
                                            icon: CupertinoIcons.exclamationmark_triangle_fill,
                                          )
                                        : locationResult.state == AttendanceGpsState.permissionDenied
                                            ? const StatusChip(
                                                label: "Permission Required (Tap)",
                                                type: StatusType.warning,
                                                icon: CupertinoIcons.location_slash,
                                              )
                                            : locationResult.state == AttendanceGpsState.permissionPermanentlyDenied
                                                ? const StatusChip(
                                                    label: "Permission Denied (Settings)",
                                                    type: StatusType.error,
                                                    icon: CupertinoIcons.exclamationmark_circle_fill,
                                                  )
                                                : (locationResult.targetLocation == null || !locationResult.targetLocation!.hasValidCoordinates)
                                                    ? const StatusChip(
                                                        label: "Unconfigured GPS",
                                                        type: StatusType.error,
                                                        icon: CupertinoIcons.exclamationmark_circle_fill,
                                                      )
                                                    : locationResult.state == AttendanceGpsState.lowAccuracy
                                                        ? StatusChip(
                                                            label: "Low GPS (${locationResult.formattedAccuracy})",
                                                            type: StatusType.warning,
                                                            icon: CupertinoIcons.exclamationmark_triangle_fill,
                                                          )
                                                        : locationResult.isInside
                                                            ? StatusChip(
                                                                label: "Inside (${locationResult.formattedDistance})",
                                                                type: StatusType.success,
                                                                icon: CupertinoIcons.checkmark_circle_fill,
                                                              )
                                                            : StatusChip(
                                                                label: "${locationResult.formattedDistance} away",
                                                                type: StatusType.warning,
                                                                icon: CupertinoIcons.exclamationmark_triangle_fill,
                                                              ),
                                const SizedBox(height: 8),
                                if (isCheckedIn)
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    decoration: BoxDecoration(
                                      color: AppColors.mintBg,
                                      borderRadius: AppRadius.borderPill,
                                    ),
                                    child: Center(
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(
                                            CupertinoIcons.checkmark_alt_circle_fill,
                                            size: 14,
                                            color: AppColors.mintFg,
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            "Checked In",
                                            style: AppTypography.caption.copyWith(
                                              fontWeight: FontWeight.w800,
                                              color: AppColors.mintFg,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  )
                                else if (locationResult.isInside)
                                  GestureDetector(
                                    onTap: AttendanceService.instance.isProcessing ? null : _handleCheckIn,
                                    child: Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.symmetric(vertical: 9),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary,
                                        borderRadius: AppRadius.borderPill,
                                        boxShadow: AppShadows.pillDark,
                                      ),
                                      child: Center(
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            if (AttendanceService.instance.isProcessing) ...[
                                              const SizedBox(
                                                width: 13,
                                                height: 13,
                                                child: CircularProgressIndicator(
                                                  strokeWidth: 2,
                                                  color: Colors.white,
                                                ),
                                              ),
                                              const SizedBox(width: 6),
                                            ] else ...[
                                              const Icon(
                                                CupertinoIcons.checkmark_circle_fill,
                                                size: 14,
                                                color: Colors.white,
                                              ),
                                              const SizedBox(width: 5),
                                            ],
                                            Text(
                                              AttendanceService.instance.isProcessing
                                                  ? "Checking In..."
                                                  : "Check In Now",
                                              style: AppTypography.caption.copyWith(
                                                fontWeight: FontWeight.w800,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  )
                                else
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      GestureDetector(
                                        onTap: () {
                                          if (locationResult.state == AttendanceGpsState.locationDisabled) {
                                            LocationService.instance.openLocationSettings();
                                          } else if (locationResult.state == AttendanceGpsState.permissionDenied) {
                                            LocationService.instance.evaluateLiveLocation();
                                          } else if (locationResult.state == AttendanceGpsState.permissionPermanentlyDenied) {
                                            LocationService.instance.openAppSettings();
                                          } else {
                                            LocationService.instance.evaluateLiveLocation();
                                          }
                                        },
                                        child: Container(
                                          width: double.infinity,
                                          padding: const EdgeInsets.symmetric(vertical: 8),
                                          decoration: BoxDecoration(
                                            color: AppColors.slateBg,
                                            borderRadius: AppRadius.borderPill,
                                          ),
                                          child: Center(
                                            child: Text(
                                              locationResult.state == AttendanceGpsState.locationDisabled
                                                  ? "Turn on GPS"
                                                  : (locationResult.state == AttendanceGpsState.permissionDenied
                                                      ? "Grant Permission"
                                                      : (locationResult.state == AttendanceGpsState.permissionPermanentlyDenied
                                                          ? "Open App Settings"
                                                          : (locationResult.state == AttendanceGpsState.scanning ||
                                                                  locationResult.state == AttendanceGpsState.initializing
                                                              ? "Acquiring GPS..."
                                                              : "Check In Disabled"))),
                                              style: AppTypography.caption.copyWith(
                                                fontWeight: FontWeight.w600,
                                                color: locationResult.state == AttendanceGpsState.locationDisabled ||
                                                        locationResult.state == AttendanceGpsState.permissionDenied
                                                    ? AppColors.primary
                                                    : AppColors.textMuted,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        locationResult.state == AttendanceGpsState.locationDisabled
                                            ? "Location service required"
                                            : (locationResult.state == AttendanceGpsState.permissionDenied ||
                                                    locationResult.state == AttendanceGpsState.permissionPermanentlyDenied
                                                ? "Location permission required"
                                                : (locationResult.state == AttendanceGpsState.scanning ||
                                                        locationResult.state == AttendanceGpsState.initializing
                                                    ? "Locating nearest facility..."
                                                    : "Move within ${locationResult.targetLocation?.allowedRadiusMeters.round() ?? 100}m of work location")),
                                        style: AppTypography.overline.copyWith(
                                          color: AppColors.statusWarning,
                                          fontSize: 9.5,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      AppSpacing.hGapMD,

                      // 2. Today's Working Shift Card
                      Expanded(
                        child: AppCard(
                          variant: AppCardVariant.heroDark,
                          padding: const EdgeInsets.all(AppSpacing.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    isCheckedIn
                                        ? "Working Today"
                                        : (AttendanceService.instance.session.isCheckedOut
                                            ? "Today's Work"
                                            : "Upcoming Shift"),
                                    style: AppTypography.caption.copyWith(
                                      color: AppColors.textOnDarkMuted,
                                    ),
                                  ),
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: isCheckedIn
                                          ? AppColors.primaryAccent
                                          : (AttendanceService.instance.session.isCheckedOut
                                              ? const Color(0xFF60A5FA)
                                              : AppColors.textMuted),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ],
                              ),
                              AppSpacing.gapSM,
                              isCheckedIn
                                  ? const AttendanceLiveTimerWidget()
                                  : Text(
                                      AttendanceService.instance.session.isCheckedOut &&
                                              (AttendanceService.instance.session.netWorkingMinutes ?? 0) > 0
                                          ? "${(AttendanceService.instance.session.netWorkingMinutes! ~/ 60)}h ${(AttendanceService.instance.session.netWorkingMinutes! % 60)}m"
                                          : "00:00:00",
                                      style: AppTypography.metricLarge.copyWith(
                                        color: Colors.white,
                                        fontSize: 24,
                                      ),
                                    ),
                              AppSpacing.gapSM,
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: AppRadius.borderPill,
                                ),
                                child: Text(
                                  isCheckedIn
                                      ? "Shift Ends ${currentUser.shiftEnd}"
                                      : (AttendanceService.instance.session.isCheckedOut
                                          ? "Completed for today"
                                          : "Shift Starts ${currentUser.shiftStart}"),
                                  style: AppTypography.caption.copyWith(
                                    fontSize: 10.5,
                                    color: isCheckedIn
                                        ? AppColors.primaryAccent
                                        : AppColors.textOnDarkMuted,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              AppSpacing.gapSM,
                              isCheckedIn
                                  ? GestureDetector(
                                      onTap: _handleCheckOut,
                                      child: Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                        decoration: BoxDecoration(
                                          color: AppColors.mintBg,
                                          borderRadius: AppRadius.borderPill,
                                        ),
                                        child: Center(
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(
                                                CupertinoIcons.checkmark_alt_circle_fill,
                                                size: 14,
                                                color: AppColors.mintFg,
                                              ),
                                              const SizedBox(width: 4),
                                              Text(
                                                "Check-out",
                                                style: AppTypography.caption.copyWith(
                                                  fontWeight: FontWeight.w800,
                                                  color: AppColors.mintFg,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    )
                                  : Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.05),
                                        borderRadius: AppRadius.borderPill,
                                      ),
                                      child: Center(
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              CupertinoIcons.checkmark_alt_circle_fill,
                                              size: 14,
                                              color: Colors.white.withValues(alpha: 0.3),
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              AttendanceService.instance.session.isCheckedOut
                                                  ? "Checked Out"
                                                  : "Check-out",
                                              style: AppTypography.caption.copyWith(
                                                fontWeight: FontWeight.w800,
                                                color: Colors.white.withValues(alpha: 0.3),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                AppSpacing.gapXXL,
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Quick Actions",
                      style: AppTypography.titleLarge,
                    ),
                    GestureDetector(
                      onTap: widget.onOpenServices,
                      child: Row(
                        children: [
                          Text(
                            "View All",
                            style: AppTypography.caption.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(width: 2),
                          const Icon(
                            CupertinoIcons.chevron_right,
                            size: 12,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                AppSpacing.gapMD,
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: quickServices.map((tile) {
                    return Expanded(
                      child: Center(
                        child: AppletTileWidget(
                          tile: tile,
                          onTap: () {
                            switch (tile.id) {
                              case "regularize":
                                showRegularizationModal(context);
                                break;
                              case "apply_leave":
                                showApplyLeaveModal(context);
                                break;
                              case "payslip":
                                Navigator.push(
                                  context,
                                  CupertinoPageRoute(builder: (_) => const PayslipsScreen()),
                                );
                                break;
                              case "claims":
                                Navigator.push(
                                  context,
                                  CupertinoPageRoute(builder: (_) => const ExpenseClaimsScreen()),
                                );
                                break;
                              case "services":
                                Navigator.push(
                                  context,
                                  CupertinoPageRoute(builder: (_) => const EmployeeServicesScreen()),
                                );
                                break;
                              default:
                                widget.onOpenServices();
                            }
                          },
                        ),
                      ),
                    );
                  }).toList(),
                ),
                AppSpacing.gapXXL,
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Recent Activities",
                      style: AppTypography.titleLarge,
                    ),
                    ListenableBuilder(
                      listenable: NotificationController.instance,
                      builder: (context, _) {
                        final count = NotificationController.instance.activities.length;
                        if (count <= 1) return const SizedBox.shrink();
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: AppRadius.borderPill,
                          ),
                          child: Text(
                            "$count Live Updates",
                            style: AppTypography.caption.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
                AppSpacing.gapMD,
                ListenableBuilder(
                  listenable: NotificationController.instance,
                  builder: (context, _) {
                    final activities = NotificationController.instance.activities;
                    return _RecentActivitiesCarousel(
                      activities: activities,
                      onNavigateServices: widget.onOpenServices,
                    );
                  },
                ),
                AppSpacing.gapXXL,
                Text(
                  "Passes & Cards",
                  style: AppTypography.titleLarge,
                ),
                AppSpacing.gapMD,
                GestureDetector(
                  onTap: () => showVirtualIdCardDialog(context, currentUser),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      gradient: AppColors.darkCardGradient,
                      borderRadius: AppRadius.borderCard,
                      boxShadow: AppShadows.pillDark,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            StatusChip(
                              label: "Work Pass",
                              type: StatusType.info,
                              icon: CupertinoIcons.checkmark_seal_fill,
                            ),
                            Icon(
                              CupertinoIcons.radiowaves_right,
                              size: 20,
                              color: Colors.white70,
                            ),
                          ],
                        ),
                        AppSpacing.gapLG,
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    currentUser.name,
                                    style: AppTypography.titleLarge.copyWith(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 19,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    currentUser.designation,
                                    style: AppTypography.bodyRegular.copyWith(
                                      color: Colors.white70,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    "Tap to view virtual ID card",
                                    style: AppTypography.caption.copyWith(
                                      color: AppColors.primaryAccent,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            AppSpacing.hGapMD,
                            WorkforceAvatar(
                              pathOrUrl: currentUser.profileImage,
                              fallbackInitials: _userInitials,
                              size: 56,
                              variant: AvatarVariant.medium,
                              backgroundColor: AppColors.primary,
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.2),
                                width: 2,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ] else ...[
                AppCard(
                  variant: AppCardVariant.heroDark,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Platform Engineering Team",
                        style: AppTypography.caption.copyWith(
                          color: AppColors.textOnDarkMuted,
                        ),
                      ),
                      AppSpacing.gapXS,
                      Text(
                        "5 Members On Duty",
                        style: AppTypography.displayHeader.copyWith(
                          color: Colors.white,
                        ),
                      ),
                      AppSpacing.gapLG,
                      Row(
                        children: [
                          Expanded(
                            child: _buildTeamMetricCol("3", "In Office", AppColors.mintBg, AppColors.mintFg),
                          ),
                          Expanded(
                            child: _buildTeamMetricCol("1", "Remote", AppColors.skyBg, AppColors.skyFg),
                          ),
                          Expanded(
                            child: _buildTeamMetricCol("1", "On Leave", AppColors.peachBg, AppColors.peachFg),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                AppSpacing.gapXXL,
                Text(
                  "Manager Actions",
                  style: AppTypography.titleLarge,
                ),
                AppSpacing.gapMD,
                AppCard(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Redirecting to Approvals Tab")),
                    );
                  },
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.lavenderBg,
                          borderRadius: AppRadius.borderSquircle,
                        ),
                        child: const Icon(
                          CupertinoIcons.checkmark_square_fill,
                          color: AppColors.lavenderFg,
                          size: 22,
                        ),
                      ),
                      AppSpacing.hGapMD,
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Pending Team Approvals",
                              style: AppTypography.titleMedium,
                            ),
                            Text(
                              "3 requests need your review",
                              style: AppTypography.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      const Icon(
                        CupertinoIcons.chevron_right,
                        size: 16,
                        color: AppColors.textMuted,
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTeamMetricCol(String count, String label, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: AppRadius.borderMd,
      ),
      child: Column(
        children: [
          Text(
            count,
            style: AppTypography.titleLarge.copyWith(
              color: Colors.white,
            ),
          ),
          AppSpacing.gapXXS,
          StatusChip(
            label: label,
            customBg: bg,
            customFg: fg,
          ),
        ],
      ),
    );
  }
}

class _RecentActivitiesCarousel extends StatefulWidget {
  final List<ActivityItemModel> activities;
  final VoidCallback onNavigateServices;

  const _RecentActivitiesCarousel({
    required this.activities,
    required this.onNavigateServices,
  });

  @override
  State<_RecentActivitiesCarousel> createState() => _RecentActivitiesCarouselState();
}

class _RecentActivitiesCarouselState extends State<_RecentActivitiesCarousel> {
  late PageController _pageController;
  int _currentPage = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _startTimer();
  }

  @override
  void didUpdateWidget(covariant _RecentActivitiesCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.activities.length != oldWidget.activities.length) {
      _startTimer();
    }
  }

  void _startTimer() {
    _timer?.cancel();
    if (widget.activities.length > 1) {
      _timer = Timer.periodic(const Duration(seconds: 5), (_) {
        if (!mounted || !_pageController.hasClients) return;
        final nextPage = (_currentPage + 1) % widget.activities.length;
        _pageController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeInOutCubic,
        );
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _handleActivityTap(ActivityItemModel act) {
    switch (act.entityType) {
      case 'COMMUNICATION':
        Navigator.push(
          context,
          CupertinoPageRoute(builder: (_) => const CommunicationScreen()),
        );
        break;
      case 'HELPDESK':
        Navigator.push(
          context,
          CupertinoPageRoute(builder: (_) => const HelpdeskScreen()),
        );
        break;
      case 'SERVICE_REQUEST':
        Navigator.push(
          context,
          CupertinoPageRoute(builder: (_) => const EmployeeServicesScreen()),
        );
        break;
      case 'CLAIM':
        Navigator.push(
          context,
          CupertinoPageRoute(builder: (_) => const ExpenseClaimsScreen()),
        );
        break;
      case 'LEAVE':
        showApplyLeaveModal(context);
        break;
      case 'ATTENDANCE':
        showRegularizationModal(context);
        break;
      default:
        widget.onNavigateServices();
    }
  }

  @override
  Widget build(BuildContext context) {
    final list = widget.activities;
    if (list.isEmpty) {
      return AppCard(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: const BoxDecoration(
                color: AppColors.mintBg,
                shape: BoxShape.circle,
              ),
              child: const Icon(CupertinoIcons.checkmark_shield_fill, color: AppColors.mintFg, size: 20),
            ),
            AppSpacing.hGapMD,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("All Caught Up!", style: AppTypography.titleMedium),
                  Text("No pending actions or unread announcements.", style: AppTypography.caption),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        SizedBox(
          height: 86,
          child: PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() => _currentPage = index);
            },
            itemCount: list.length,
            itemBuilder: (context, index) {
              final act = list[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: InkWell(
                  borderRadius: AppRadius.borderLg,
                  onTap: () => _handleActivityTap(act),
                  child: AppCard(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: act.iconBg,
                            borderRadius: AppRadius.borderMd,
                          ),
                          child: Icon(act.icon, color: act.iconFg, size: 22),
                        ),
                        AppSpacing.hGapMD,
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      act.title,
                                      style: AppTypography.titleMedium,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  if (act.badge != null) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                      decoration: BoxDecoration(
                                        color: AppColors.roseBg,
                                        borderRadius: AppRadius.borderPill,
                                      ),
                                      child: Text(
                                        act.badge!,
                                        style: AppTypography.caption.copyWith(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.roseFg,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                act.subtitle,
                                style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(act.timeAgo, style: AppTypography.caption.copyWith(fontSize: 10)),
                            const SizedBox(height: 4),
                            const Icon(CupertinoIcons.chevron_forward, size: 14, color: AppColors.primary),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        if (list.length > 1) ...[
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(list.length, (idx) {
              final isSelected = _currentPage == idx;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: isSelected ? 18 : 6,
                height: 5,
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary : AppColors.borderSubtle,
                  borderRadius: AppRadius.borderPill,
                ),
              );
            }),
          ),
        ],
      ],
    );
  }
}
