import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../../../core/controllers/employee_controller.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../models/employee_models.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/app_header.dart';
import '../../../../widgets/core/empty_state_widget.dart';
import '../../attendance/screens/attendance_screen.dart';
import '../../claims/screens/expense_claims_screen.dart';
import '../../communication/screens/communication_screen.dart';
import '../../documents/screens/documents_screen.dart';
import '../../grievance/screens/complaint_screen.dart';
import '../../leave/screens/leave_screen.dart';
import '../../letters/screens/digital_letters_screen.dart';
import '../../payslips/screens/payslips_screen.dart';
import '../../performance/screens/performance_screen.dart';
import '../../roster/screens/shift_roster_screen.dart';
import '../../tasks/screens/employee_tasks_screen.dart';

import '../../documents/screens/document_request_detail_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationController.instance.loadNotifications();
    });
  }

  void _handleNotificationTap(NotificationItemModel item) {
    // 1. Mark as read immediately (removes unread dot & decrements badge)
    NotificationController.instance.markAsRead(item.id);

    // 2. Navigate to respective screen based on content & entity
    final lowerTitle = item.title.toLowerCase();
    final lowerMsg = item.message.toLowerCase();
    final combined = "$lowerTitle $lowerMsg";

    Widget? targetScreen;

    if (item.notificationType == 'DOCUMENT_REQUEST' || item.entityType == 'DOCUMENT_REQUIREMENT' || item.id.startsWith('doc-req-')) {
      final reqId = item.entityId ?? item.id;
      targetScreen = DocumentRequestDetailScreen(requestId: reqId);
    } else if (combined.contains("leave")) {
      targetScreen = const LeaveScreen();
    } else if (combined.contains("payslip") || combined.contains("salary")) {
      targetScreen = const PayslipsScreen();
    } else if (combined.contains("announcement") || combined.contains("townhall") || combined.contains("broadcast")) {
      targetScreen = const CommunicationScreen();
    } else if (combined.contains("task") || combined.contains("assignment") || combined.contains("checklist")) {
      targetScreen = const EmployeeTasksScreen();
    } else if (combined.contains("shift") || combined.contains("roster") || combined.contains("schedule")) {
      targetScreen = const ShiftRosterScreen();
    } else if (combined.contains("expense") || combined.contains("claim") || combined.contains("reimbursement")) {
      targetScreen = const ExpenseClaimsScreen();
    } else if (combined.contains("document") || combined.contains("kyc") || combined.contains("verification")) {
      if (item.entityId != null && item.entityId!.isNotEmpty) {
        targetScreen = DocumentRequestDetailScreen(requestId: item.entityId!);
      } else {
        targetScreen = const DocumentsScreen();
      }
    } else if (combined.contains("letter") || combined.contains("appointment")) {
      targetScreen = const DigitalLettersScreen();
    } else if (combined.contains("performance") || combined.contains("goal") || combined.contains("okr")) {
      targetScreen = const PerformanceScreen();
    } else if (combined.contains("grievance") || combined.contains("complaint") || combined.contains("support")) {
      targetScreen = const ComplaintScreen();
    } else if (combined.contains("check-in") || combined.contains("check-out") || combined.contains("attendance") || combined.contains("regularization")) {
      targetScreen = const AttendanceScreen();
    }

    if (targetScreen != null) {
      Navigator.push(
        context,
        CupertinoPageRoute(builder: (_) => targetScreen!),
      );
    }
  }

  String _formatTimestamp(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month]}';
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: NotificationController.instance,
      builder: (context, _) {
        final controller = NotificationController.instance;
        final notifications = controller.notifications;

        return Scaffold(
          backgroundColor: AppColors.scaffoldBg,
          body: SafeArea(
            child: Column(
              children: [
                AppHeader(
                  title: "Notifications",
                  subtitle: "Updates & Alerts",
                  rightAction: IconButton(
                    icon: const Icon(CupertinoIcons.xmark_circle_fill, color: Colors.white70, size: 24),
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
                Expanded(
                  child: controller.isLoading && notifications.isEmpty
                      ? const Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircularProgressIndicator(color: AppColors.primary),
                              SizedBox(height: 12),
                              Text("Loading notifications...", style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                            ],
                          ),
                        )
                      : controller.hasError && notifications.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(CupertinoIcons.exclamationmark_circle, size: 44, color: AppColors.statusError),
                                    const SizedBox(height: 12),
                                    Text("Unable to load notifications", style: AppTypography.titleMedium),
                                    const SizedBox(height: 4),
                                    Text(
                                      controller.errorMessage ?? "Please check your network connection.",
                                      style: AppTypography.caption,
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 16),
                                    ElevatedButton.icon(
                                      icon: const Icon(CupertinoIcons.refresh, size: 16),
                                      label: const Text("Retry"),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: AppRadius.borderPill),
                                      ),
                                      onPressed: () => controller.loadNotifications(),
                                    ),
                                  ],
                                ),
                              ),
                            )
                          : RefreshIndicator(
                              color: AppColors.primary,
                              onRefresh: () => controller.loadNotifications(),
                              child: notifications.isEmpty
                                  ? ListView(
                                      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                                      children: const [
                                        SizedBox(height: 100),
                                        EmptyStateWidget(
                                          icon: CupertinoIcons.bell_slash,
                                          title: "No notifications",
                                          description: "You're all caught up! New updates will appear here.",
                                        ),
                                      ],
                                    )
                                  : ListView.builder(
                                      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                                      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                                      itemCount: notifications.length,
                                      itemBuilder: (context, index) {
                                    final item = notifications[index];
                                    final isUnread = !item.isRead;

                                    return Container(
                                      margin: const EdgeInsets.only(bottom: AppSpacing.md),
                                      child: InkWell(
                                        onTap: () => _handleNotificationTap(item),
                                        borderRadius: AppRadius.borderMd,
                                        child: AppCard(
                                          padding: const EdgeInsets.all(16),
                                          child: Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              // Unread dot indicator on the left
                                              Container(
                                                width: 10,
                                                height: 10,
                                                margin: const EdgeInsets.only(top: 14, right: 12),
                                                decoration: BoxDecoration(
                                                  color: isUnread ? AppColors.primary : Colors.transparent,
                                                  shape: BoxShape.circle,
                                                ),
                                              ),
                                              // Notification Icon
                                              Container(
                                                width: 40,
                                                height: 40,
                                                decoration: BoxDecoration(
                                                  color: isUnread ? AppColors.mintBg : AppColors.slateBg,
                                                  shape: BoxShape.circle,
                                                ),
                                                child: Center(
                                                  child: Icon(
                                                    item.icon,
                                                    size: 18,
                                                    color: isUnread ? AppColors.mintFg : AppColors.textMuted,
                                                  ),
                                                ),
                                              ),
                                              AppSpacing.hGapMD,
                                              // Title & Message Content
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Row(
                                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                      crossAxisAlignment: CrossAxisAlignment.start,
                                                      children: [
                                                        Expanded(
                                                          child: Text(
                                                            item.title,
                                                            style: AppTypography.titleMedium.copyWith(
                                                              fontWeight: isUnread ? FontWeight.bold : FontWeight.w600,
                                                              color: isUnread ? AppColors.textPrimary : AppColors.textSecondary,
                                                            ),
                                                          ),
                                                        ),
                                                        const SizedBox(width: 8),
                                                        Text(
                                                          _formatTimestamp(item.timestamp),
                                                          style: AppTypography.overline.copyWith(
                                                            color: isUnread ? AppColors.primary : AppColors.textMuted,
                                                            fontWeight: isUnread ? FontWeight.bold : FontWeight.normal,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                    const SizedBox(height: 4),
                                                    Text(
                                                      item.message,
                                                      style: AppTypography.bodySmall.copyWith(
                                                        color: isUnread ? AppColors.textPrimary : AppColors.textMuted,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
