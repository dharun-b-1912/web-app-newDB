import 'dart:math' as math;
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/services/attendance_service.dart';
import '../../core/services/location_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/hrms_models.dart';

/// Real Google Maps / Street Map Interactive & Geofence 4:3 Aspect Ratio Dialog
class GeofenceMapDialog extends StatefulWidget {
  final UserModel currentUser;
  final VoidCallback? onCheckIn;
  final VoidCallback? onRefresh;

  const GeofenceMapDialog({
    super.key,
    required this.currentUser,
    this.onCheckIn,
    this.onRefresh,
  });

  static Future<void> show(
    BuildContext context, {
    required UserModel currentUser,
    VoidCallback? onCheckIn,
    VoidCallback? onRefresh,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => GeofenceMapDialog(
        currentUser: currentUser,
        onCheckIn: onCheckIn,
        onRefresh: onRefresh,
      ),
    );
  }

  @override
  State<GeofenceMapDialog> createState() => _GeofenceMapDialogState();
}

class _GeofenceMapDialogState extends State<GeofenceMapDialog> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  int _zoomLevel = 16;
  String _mapStyle = 'google_streets'; // 'google_streets' | 'google_satellite' | 'google_terrain' | 'osm'

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();

    // Trigger fast silent evaluation without clearing existing fix
    WidgetsBinding.instance.addPostFrameCallback((_) {
      LocationService.instance.evaluateLiveLocation(silent: true);
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _openGoogleMaps(double lat, double lng) async {
    final uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([LocationService.instance, AttendanceService.instance]),
      builder: (context, _) {
        final locationResult = LocationService.instance.currentResult;
        final targetLoc = locationResult.targetLocation ?? widget.currentUser.approvedLocation;
        final locationName = targetLoc.name.isNotEmpty && targetLoc.name != 'Office'
            ? targetLoc.name
            : (widget.currentUser.campus.isNotEmpty ? widget.currentUser.campus : 'Assigned Work Location');

        final radius = targetLoc.allowedRadiusMeters > 0 ? targetLoc.allowedRadiusMeters : 150.0;
        final hasRealCoordinates = locationResult.latitude != 0.0 && locationResult.longitude != 0.0;
        final isScanning = locationResult.state == AttendanceGpsState.scanning && !hasRealCoordinates;
        final isInside = hasRealCoordinates && locationResult.isInside;
        final isCheckedIn = AttendanceService.instance.session.isCheckedIn;

        final centerLat = hasRealCoordinates ? locationResult.latitude : targetLoc.latitude;
        final centerLng = hasRealCoordinates ? locationResult.longitude : targetLoc.longitude;

        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
          child: Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 580, maxHeight: 620),
              child: AspectRatio(
                aspectRatio: 4 / 3,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.28),
                        blurRadius: 36,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Column(
                      children: [
                        // Header Bar with Real Location Name
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: isScanning
                                      ? AppColors.skyFg
                                      : (isInside ? AppColors.mintFg : AppColors.peachFg),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isScanning
                                      ? CupertinoIcons.compass
                                      : (isInside ? CupertinoIcons.checkmark_alt : CupertinoIcons.location_solid),
                                  color: Colors.white,
                                  size: 14,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      locationName,
                                      style: AppTypography.bodyLarge.copyWith(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w700,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      isScanning
                                          ? "📍 Locking satellite GPS signal..."
                                          : (isInside
                                              ? "✓ Verified Inside Authorized Perimeter (${locationResult.formattedDistance})"
                                              : "⚠️ Outside Perimeter (${locationResult.formattedDistance} away · Allowed: ${radius.round()}m)"),
                                      style: AppTypography.overline.copyWith(
                                        color: isScanning
                                            ? AppColors.skyBg
                                            : (isInside ? AppColors.mintBg : AppColors.peachBg),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              GestureDetector(
                                onTap: () => Navigator.of(context).pop(),
                                child: Container(
                                  padding: const EdgeInsets.all(5),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.15),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    CupertinoIcons.xmark,
                                    color: Colors.white,
                                    size: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Real Google Maps / Street Map Viewport
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(10.0),
                            child: Column(
                              children: [
                                Expanded(
                                  child: Container(
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0F172A),
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: isInside
                                            ? const Color(0xFF10B981).withValues(alpha: 0.5)
                                            : const Color(0xFF38BDF8).withValues(alpha: 0.4),
                                        width: 1.5,
                                      ),
                                    ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(13),
                                      child: Stack(
                                        alignment: Alignment.center,
                                        children: [
                                          // 1. Real Map Tiles Layer (CartoDB Voyager / OpenStreetMap)
                                          Positioned.fill(
                                            child: _RealMapTileGrid(
                                              latitude: centerLat,
                                              longitude: centerLng,
                                              zoom: _zoomLevel,
                                              style: _mapStyle,
                                            ),
                                          ),

                                          // 2. Map Overlay (Geofence Circle, User Pin, Office Marker, Distance Vector)
                                          Positioned.fill(
                                            child: AnimatedBuilder(
                                              animation: _pulseController,
                                              builder: (context, _) {
                                                return CustomPaint(
                                                  painter: _GeofenceMapPainter(
                                                    userLat: locationResult.latitude != 0 ? locationResult.latitude : centerLat,
                                                    userLng: locationResult.longitude != 0 ? locationResult.longitude : centerLng,
                                                    officeLat: targetLoc.latitude != 0 ? targetLoc.latitude : centerLat,
                                                    officeLng: targetLoc.longitude != 0 ? targetLoc.longitude : centerLng,
                                                    radiusMeters: radius,
                                                    zoom: _zoomLevel,
                                                    isInside: isInside,
                                                    pulseValue: _pulseController.value,
                                                    distanceMeters: locationResult.distanceMeters,
                                                    officeName: locationName,
                                                  ),
                                                );
                                              },
                                            ),
                                          ),

                                          // Top Left GPS Coordinates Badge
                                          Positioned(
                                            top: 8,
                                            left: 10,
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: Colors.black.withValues(alpha: 0.75),
                                                borderRadius: BorderRadius.circular(6),
                                                border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                                              ),
                                              child: Text(
                                                hasRealCoordinates
                                                    ? "GPS: ${locationResult.latitude.toStringAsFixed(5)}, ${locationResult.longitude.toStringAsFixed(5)}"
                                                    : "GPS: ${centerLat.toStringAsFixed(5)}, ${centerLng.toStringAsFixed(5)}",
                                                style: AppTypography.overline.copyWith(
                                                  color: const Color(0xFF38BDF8),
                                                  fontSize: 8.5,
                                                  fontFamily: 'monospace',
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                            ),
                                          ),

                                          // Top Right Status / Distance Badge
                                          Positioned(
                                            top: 8,
                                            right: 10,
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: isInside
                                                    ? const Color(0xFF10B981).withValues(alpha: 0.85)
                                                    : const Color(0xFFF59E0B).withValues(alpha: 0.85),
                                                borderRadius: BorderRadius.circular(6),
                                                boxShadow: [
                                                  BoxShadow(
                                                    color: Colors.black.withValues(alpha: 0.3),
                                                    blurRadius: 4,
                                                  ),
                                                ],
                                              ),
                                              child: Text(
                                                isInside
                                                    ? "✓ Inside Zone (${locationResult.formattedDistance})"
                                                    : "Offset: ${locationResult.formattedDistance}",
                                                style: AppTypography.overline.copyWith(
                                                  color: Colors.white,
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w800,
                                                ),
                                              ),
                                            ),
                                          ),

                                          // Bottom Left Zoom & Style Controls
                                          Positioned(
                                            bottom: 8,
                                            left: 10,
                                            child: Row(
                                              children: [
                                                _buildMapButton(
                                                  icon: CupertinoIcons.plus,
                                                  tooltip: "Zoom In",
                                                  onTap: () {
                                                    if (_zoomLevel < 18) setState(() => _zoomLevel++);
                                                  },
                                                ),
                                                const SizedBox(width: 4),
                                                _buildMapButton(
                                                  icon: CupertinoIcons.minus,
                                                  tooltip: "Zoom Out",
                                                  onTap: () {
                                                    if (_zoomLevel > 13) setState(() => _zoomLevel--);
                                                  },
                                                ),
                                                const SizedBox(width: 6),
                                                _buildMapButton(
                                                  icon: CupertinoIcons.layers_alt,
                                                  tooltip: "Switch Map Layer",
                                                  onTap: () {
                                                    setState(() {
                                                      if (_mapStyle == 'google_streets') {
                                                        _mapStyle = 'google_satellite';
                                                      } else if (_mapStyle == 'google_satellite') {
                                                        _mapStyle = 'google_terrain';
                                                      } else if (_mapStyle == 'google_terrain') {
                                                        _mapStyle = 'osm';
                                                      } else {
                                                        _mapStyle = 'google_streets';
                                                      }
                                                    });
                                                  },
                                                ),
                                              ],
                                            ),
                                          ),

                                          // Bottom Right Google Maps Launcher Link
                                          Positioned(
                                            bottom: 8,
                                            right: 10,
                                            child: GestureDetector(
                                              onTap: () => _openGoogleMaps(centerLat, centerLng),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                                decoration: BoxDecoration(
                                                  color: Colors.black.withValues(alpha: 0.80),
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    const Icon(
                                                      CupertinoIcons.map_pin_ellipse,
                                                      size: 11,
                                                      color: Color(0xFF38BDF8),
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      "Open in Google Maps",
                                                      style: AppTypography.overline.copyWith(
                                                        color: Colors.white,
                                                        fontSize: 8.5,
                                                        fontWeight: FontWeight.w700,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 6),

                                // Authoritative Facility & Radius Indicator (Read-only from Supabase)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(CupertinoIcons.building_2_fill, size: 12, color: AppColors.primary),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          locationName,
                                          style: AppTypography.caption.copyWith(
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.textPrimary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(color: const Color(0xFFCBD5E1)),
                                        ),
                                        child: Text(
                                          "Radius: ${radius.round()}m",
                                          style: AppTypography.overline.copyWith(
                                            fontSize: 8,
                                            fontWeight: FontWeight.w800,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 6),

                                // Telemetry Stats Row
                                Row(
                                  children: [
                                    _buildStatPill(
                                      label: "Status",
                                      value: isInside ? "Inside Zone" : (isScanning ? "Scanning GPS" : "Outside Zone"),
                                      color: isInside
                                          ? AppColors.mintFg
                                          : (isScanning ? AppColors.skyFg : AppColors.peachFg),
                                      icon: isInside
                                          ? CupertinoIcons.checkmark_circle_fill
                                          : (isScanning ? CupertinoIcons.compass : CupertinoIcons.exclamationmark_triangle_fill),
                                    ),
                                    const SizedBox(width: 6),
                                    _buildStatPill(
                                      label: "Live Distance",
                                      value: locationResult.formattedDistance,
                                      color: AppColors.primary,
                                      icon: CupertinoIcons.location_north_line,
                                    ),
                                    const SizedBox(width: 6),
                                    _buildStatPill(
                                      label: "Accuracy",
                                      value: locationResult.formattedAccuracy,
                                      color: AppColors.textSecondary,
                                      icon: CupertinoIcons.antenna_radiowaves_left_right,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),

                                // Actions Row
                                Row(
                                  children: [
                                    Expanded(
                                      flex: 2,
                                      child: GestureDetector(
                                        onTap: () {
                                          LocationService.instance.refreshLocationsAndEvaluate();
                                          widget.onRefresh?.call();
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 9),
                                          decoration: BoxDecoration(
                                            color: AppColors.slateBg,
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              const Icon(
                                                CupertinoIcons.arrow_2_circlepath,
                                                size: 13,
                                                color: AppColors.textPrimary,
                                              ),
                                              const SizedBox(width: 4),
                                              Text(
                                                "Re-scan GPS",
                                                style: AppTypography.caption.copyWith(
                                                  fontWeight: FontWeight.w700,
                                                  color: AppColors.textPrimary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      flex: 3,
                                      child: GestureDetector(
                                        onTap: isInside && !isCheckedIn
                                            ? () {
                                                Navigator.of(context).pop();
                                                widget.onCheckIn?.call();
                                              }
                                            : null,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 9),
                                          decoration: BoxDecoration(
                                            color: isCheckedIn
                                                ? AppColors.mintBg
                                                : (isInside ? const Color(0xFF10B981) : AppColors.slateBg),
                                            borderRadius: BorderRadius.circular(10),
                                            boxShadow: isInside && !isCheckedIn
                                                ? [
                                                    BoxShadow(
                                                      color: const Color(0xFF10B981).withValues(alpha: 0.4),
                                                      blurRadius: 10,
                                                      offset: const Offset(0, 4),
                                                    ),
                                                  ]
                                                : null,
                                          ),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(
                                                isCheckedIn
                                                    ? CupertinoIcons.checkmark_seal_fill
                                                    : (isInside
                                                        ? CupertinoIcons.checkmark_circle_fill
                                                        : CupertinoIcons.lock_fill),
                                                size: 14,
                                                color: isCheckedIn
                                                    ? AppColors.mintFg
                                                    : (isInside ? Colors.white : AppColors.textMuted),
                                              ),
                                              const SizedBox(width: 5),
                                              Text(
                                                isCheckedIn
                                                    ? "Already Checked In"
                                                    : (isInside ? "Check In Now" : "Outside Radius"),
                                                style: AppTypography.caption.copyWith(
                                                  fontWeight: FontWeight.w800,
                                                  color: isCheckedIn
                                                      ? AppColors.mintFg
                                                      : (isInside ? Colors.white : AppColors.textMuted),
                                                ),
                                              ),
                                            ],
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
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildMapButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.75),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
          ),
          child: Icon(icon, size: 12, color: Colors.white),
        ),
      ),
    );
  }

  Widget _buildStatPill({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 5),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withValues(alpha: 0.2), width: 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 9.5, color: color),
                const SizedBox(width: 3),
                Text(
                  label,
                  style: AppTypography.overline.copyWith(
                    fontSize: 8,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 1),
            Text(
              value,
              style: AppTypography.caption.copyWith(
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

/// Real Google Maps & OpenStreetMap Seamless 3x3 Tile Grid Renderer
class _RealMapTileGrid extends StatelessWidget {
  final double latitude;
  final double longitude;
  final int zoom;
  final String style;

  const _RealMapTileGrid({
    required this.latitude,
    required this.longitude,
    required this.zoom,
    required this.style,
  });

  @override
  Widget build(BuildContext context) {
    final n = 1 << zoom;
    final latRad = latitude * math.pi / 180.0;
    final exactX = (longitude + 180.0) / 360.0 * n;
    final exactY = (1.0 - math.log(math.tan(latRad) + (1.0 / math.cos(latRad))) / math.pi) / 2.0 * n;
    final centerTileX = exactX.floor();
    final centerTileY = exactY.floor();
    final subTileOffsetX = (exactX - centerTileX) * 256.0;
    final subTileOffsetY = (exactY - centerTileY) * 256.0;

    String getTileUrl(int tileX, int tileY) {
      final wrappedX = (tileX % n + n) % n;
      final clampedY = tileY.clamp(0, n - 1);

      if (style == 'google_satellite' || style == 'satellite') {
        // Google Satellite + Street Hybrid Layer
        return 'https://mt1.google.com/vt/lyrs=y&x=$wrappedX&y=$clampedY&z=$zoom';
      } else if (style == 'google_terrain' || style == 'terrain') {
        // Google Terrain Layer
        return 'https://mt1.google.com/vt/lyrs=p&x=$wrappedX&y=$clampedY&z=$zoom';
      } else if (style == 'osm') {
        // Standard OpenStreetMap Tile Layer
        return 'https://tile.openstreetmap.org/$zoom/$wrappedX/$clampedY.png';
      } else if (style == 'dark') {
        return 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/$zoom/$wrappedX/$clampedY.png';
      } else {
        // Official Google Maps Crisp Standard Street Layer (No watermark, clear road labels)
        return 'https://mt1.google.com/vt/lyrs=m&x=$wrappedX&y=$clampedY&z=$zoom';
      }
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final screenWidth = constraints.maxWidth;
        final screenHeight = constraints.maxHeight;
        final halfW = screenWidth / 2.0;
        final halfH = screenHeight / 2.0;

        return ClipRect(
          child: Stack(
            fit: StackFit.expand,
            children: [
              // 3x3 Tile Matrix around center coordinate
              for (int dy = -1; dy <= 1; dy++)
                for (int dx = -1; dx <= 1; dx++)
                  Positioned(
                    left: halfW - subTileOffsetX + (dx * 256.0),
                    top: halfH - subTileOffsetY + (dy * 256.0),
                    width: 256.0,
                    height: 256.0,
                    child: Image.network(
                      getTileUrl(centerTileX + dx, centerTileY + dy),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: const Color(0xFF0F172A),
                        child: const Center(
                          child: Icon(CupertinoIcons.map, color: Colors.white24, size: 24),
                        ),
                      ),
                    ),
                  ),

              // Subtle Vignette overlay for visual depth
              Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.center,
                    radius: 0.98,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.28),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Dynamic Canvas Painter for Geofence Perimeters, Markers & Telemetry Vectors
class _GeofenceMapPainter extends CustomPainter {
  final double userLat;
  final double userLng;
  final double officeLat;
  final double officeLng;
  final double radiusMeters;
  final int zoom;
  final bool isInside;
  final double pulseValue;
  final double distanceMeters;
  final String officeName;

  _GeofenceMapPainter({
    required this.userLat,
    required this.userLng,
    required this.officeLat,
    required this.officeLng,
    required this.radiusMeters,
    required this.zoom,
    required this.isInside,
    required this.pulseValue,
    required this.distanceMeters,
    required this.officeName,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    // Approximate pixels per meter at the current zoom level and latitude
    final latRad = officeLat * math.pi / 180.0;
    final metersPerPixel = 156543.03392 * math.cos(latRad) / math.pow(2, zoom);
    final pixelsPerMeter = 1.0 / (metersPerPixel > 0 ? metersPerPixel : 1.0);

    // Dynamic radius size in pixels
    final radiusPx = (radiusMeters * pixelsPerMeter).clamp(40.0, size.shortestSide * 0.46);

    // 1. Draw Office Geofence Circle Overlay
    final fillPaint = Paint()
      ..color = (isInside ? const Color(0xFF10B981) : const Color(0xFF0284C7)).withValues(alpha: 0.18)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, radiusPx, fillPaint);

    final borderPaint = Paint()
      ..color = (isInside ? const Color(0xFF10B981) : const Color(0xFF0284C7))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;
    canvas.drawCircle(center, radiusPx, borderPaint);

    // Animated outer pulse ring
    final pulsePaint = Paint()
      ..color = (isInside ? const Color(0xFF10B981) : const Color(0xFF0284C7))
          .withValues(alpha: (1.0 - pulseValue) * 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawCircle(center, radiusPx + (pulseValue * 16.0), pulsePaint);

    // 2. Compute User Location Offset from Office
    final dLat = (userLat - officeLat);
    final dLng = (userLng - officeLng);
    final metersNorth = dLat * 111139.0;
    final metersEast = dLng * 111139.0 * math.cos(latRad);

    final userOffsetPx = Offset(
      center.dx + (metersEast * pixelsPerMeter).clamp(-size.width * 0.42, size.width * 0.42),
      center.dy - (metersNorth * pixelsPerMeter).clamp(-size.height * 0.42, size.height * 0.42),
    );

    // 3. Connective Distance Vector Line
    final linePaint = Paint()
      ..color = isInside ? const Color(0xFF10B981).withValues(alpha: 0.8) : const Color(0xFFF59E0B).withValues(alpha: 0.8)
      ..strokeWidth = 1.8
      ..style = PaintingStyle.stroke;
    canvas.drawLine(center, userOffsetPx, linePaint);

    // 4. Center Office Marker
    final officePinPaint = Paint()..color = const Color(0xFF0F172A);
    canvas.drawCircle(center, 14, officePinPaint);
    final officeBorderPaint = Paint()
      ..color = isInside ? const Color(0xFF10B981) : const Color(0xFF0284C7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawCircle(center, 14, officeBorderPaint);

    // 5. User Live GPS Dot
    final userHaloPaint = Paint()
      ..color = const Color(0xFF38BDF8).withValues(alpha: (1.0 - pulseValue) * 0.6)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(userOffsetPx, 16.0 + (pulseValue * 8.0), userHaloPaint);

    final userDotPaint = Paint()..color = const Color(0xFF0284C7);
    canvas.drawCircle(userOffsetPx, 8, userDotPaint);
    final userInnerDotPaint = Paint()..color = Colors.white;
    canvas.drawCircle(userOffsetPx, 3.5, userInnerDotPaint);
  }

  @override
  bool shouldRepaint(covariant _GeofenceMapPainter oldDelegate) {
    return oldDelegate.pulseValue != pulseValue ||
        oldDelegate.zoom != zoom ||
        oldDelegate.isInside != isInside ||
        oldDelegate.userLat != userLat ||
        oldDelegate.userLng != userLng ||
        oldDelegate.radiusMeters != radiusMeters;
  }
}
