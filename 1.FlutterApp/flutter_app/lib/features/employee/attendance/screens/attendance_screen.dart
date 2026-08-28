import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../../../core/controllers/employee_controller.dart';
import '../../../../core/services/attendance_service.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../models/employee_models.dart';
import '../../../../widgets/core/app_button.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/app_header.dart';
import '../../../../widgets/core/app_skeleton.dart';
import '../../../../widgets/core/empty_state_widget.dart';
import '../../../../widgets/core/status_chip.dart';
import '../dialogs/regularization_modal.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  DateTime? _selectedCalendarDay;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    AttendanceService.instance.addListener(_onAttendanceChange);
    AttendanceDetailController.instance.initialize();
  }

  @override
  void dispose() {
    _tabController.dispose();
    AttendanceService.instance.removeListener(_onAttendanceChange);
    super.dispose();
  }

  void _onAttendanceChange() {
    if (mounted) setState(() {});
  }

  String _getMonthName(int month) {
    const names = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return (month >= 1 && month <= 12) ? names[month] : "";
  }

  void _showRegularizationDialog(BuildContext context) {
    showRegularizationModal(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: ListenableBuilder(
        listenable: AttendanceDetailController.instance,
        builder: (context, _) {
          final controller = AttendanceDetailController.instance;
          final timesheets = controller.timesheets;
          final regularizations = controller.regularizations;
          final selectedMonth = controller.selectedMonth;
          final monthName = _getMonthName(selectedMonth.month);

          return RefreshIndicator(
            onRefresh: () async {
              await Future.wait([
                controller.refresh(),
                AttendanceService.instance.fetchTodayAttendance(),
              ]);
            },
            color: AppColors.primary,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.only(bottom: AppSpacing.bottomNavClearance),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                const AppHeader(
                  subtitle: "Attendance & Timesheet",
                  title: "Attendance",
                ),
                AppSpacing.gapMD,
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 48,
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: AppColors.slateBg,
                          borderRadius: AppRadius.borderPill,
                        ),
                        child: TabBar(
                          controller: _tabController,
                          indicatorSize: TabBarIndicatorSize.tab,
                          dividerColor: Colors.transparent,
                          indicator: BoxDecoration(
                            color: AppColors.pillBlack,
                            borderRadius: AppRadius.borderPill,
                            boxShadow: AppShadows.pillDark,
                          ),
                          labelColor: Colors.white,
                          unselectedLabelColor: AppColors.textSecondary,
                          labelStyle: AppTypography.bodyRegular.copyWith(fontWeight: FontWeight.w700),
                          unselectedLabelStyle: AppTypography.bodyRegular.copyWith(fontWeight: FontWeight.w500),
                          tabs: const [
                            Tab(text: "Timesheet"),
                            Tab(text: "Monthly"),
                            Tab(text: "Regularize"),
                          ],
                        ),
                      ),
                      AppSpacing.gapLG,
                      if (controller.latestActionableException != null) ...[
                        Container(
                          margin: const EdgeInsets.only(bottom: AppSpacing.md),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.peachBg,
                            borderRadius: AppRadius.borderMd,
                            border: Border.all(color: AppColors.statusError.withValues(alpha: 0.3)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(CupertinoIcons.exclamationmark_octagon_fill, size: 18, color: AppColors.statusError),
                                      const SizedBox(width: 8),
                                      Text(
                                        controller.latestActionableException!.title,
                                        style: AppTypography.titleMedium.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.statusError,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const StatusChip(
                                    label: "Action Required",
                                    type: StatusType.error,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                controller.latestActionableException!.description,
                                style: AppTypography.bodySmall.copyWith(color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  AppButton(
                                    label: controller.latestActionableException!.suggestedAction,
                                    icon: CupertinoIcons.pencil_ellipsis_rectangle,
                                    onPressed: () => _showRegularizationDialog(context),
                                    variant: AppButtonVariant.primaryPill,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ] else if (controller.todayDeviation != null) ...[
                        Container(
                          margin: const EdgeInsets.only(bottom: AppSpacing.md),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.peachBg,
                            borderRadius: AppRadius.borderMd,
                            border: Border.all(color: AppColors.statusWarning.withValues(alpha: 0.3)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(CupertinoIcons.exclamationmark_triangle_fill, size: 18, color: AppColors.statusWarning),
                                      const SizedBox(width: 8),
                                      Text(
                                        controller.todayDeviation!.deviationType == 'LATE'
                                            ? "Late Arrival Detected"
                                            : "Attendance Deviation",
                                        style: AppTypography.titleMedium.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.statusWarning,
                                        ),
                                      ),
                                    ],
                                  ),
                                  StatusChip(
                                    label: "${controller.todayDeviation!.lateMinutes}m Late",
                                    type: StatusType.warning,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                "Actual entry at ${controller.todayDeviation!.actualIn ?? '10:09 AM'} was ${controller.todayDeviation!.lateMinutes} minutes past shift start (${controller.todayDeviation!.scheduledIn}).",
                                style: AppTypography.bodySmall.copyWith(color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  AppButton(
                                    label: "Regularize Attendance",
                                    icon: CupertinoIcons.pencil_ellipsis_rectangle,
                                    onPressed: () => _showRegularizationDialog(context),
                                    variant: AppButtonVariant.primaryPill,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (_tabController.index == 0) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "$monthName ${selectedMonth.year}",
                              style: AppTypography.titleLarge,
                            ),
                            const StatusChip(
                              label: "Current Month",
                              type: StatusType.info,
                              icon: CupertinoIcons.calendar,
                            ),
                          ],
                        ),
                        AppSpacing.gapMD,
                        if (controller.isLoading)
                          Column(
                            children: List.generate(5, (_) => AppSkeleton.attendanceRow()),
                          )
                        else if (timesheets.isEmpty)
                          const EmptyStateWidget(
                            icon: CupertinoIcons.clock,
                            title: "No timesheet entries",
                            description: "Your attendance records for this month will appear here.",
                          )
                        else
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: timesheets.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final ts = timesheets[index];
                              StatusType chipType = StatusType.neutral;
                              String labelStr = "Present";

                              if (ts.status == DayAttendanceStatus.present) {
                                chipType = StatusType.success;
                                labelStr = "Present";
                              } else if (ts.status == DayAttendanceStatus.halfDayPresent || ts.status == DayAttendanceStatus.halfDay) {
                                chipType = StatusType.warning;
                                labelStr = "Half Day (P)";
                              } else if (ts.status == DayAttendanceStatus.halfDayAbsent) {
                                chipType = StatusType.error;
                                labelStr = "Half Day (A)";
                              } else if (ts.status == DayAttendanceStatus.absent) {
                                chipType = StatusType.error;
                                labelStr = "Absent";
                              } else if (ts.status == DayAttendanceStatus.leave) {
                                chipType = StatusType.warning;
                                labelStr = "Leave";
                              } else if (ts.status == DayAttendanceStatus.holiday) {
                                chipType = StatusType.info;
                                labelStr = "Holiday";
                              } else if (ts.status == DayAttendanceStatus.weekOff) {
                                chipType = StatusType.neutral;
                                labelStr = "Week Off";
                              }

                              final monthAbbr = _getMonthName(ts.date.month).substring(0, 3);
                              final isWeekendOrHoliday = ts.status == DayAttendanceStatus.weekOff || ts.status == DayAttendanceStatus.holiday;

                              return AppCard(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                child: Column(
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: BoxDecoration(
                                                color: AppColors.slateBg,
                                                borderRadius: AppRadius.borderSm,
                                              ),
                                              child: Text(
                                                "${ts.date.day} $monthAbbr",
                                                style: AppTypography.bodyRegular.copyWith(fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                            if (ts.totalHours != "-" && ts.totalHours.isNotEmpty) ...[
                                              const SizedBox(width: 8),
                                              Text(
                                                ts.totalHours,
                                                style: AppTypography.caption.copyWith(fontWeight: FontWeight.w600, color: AppColors.primary),
                                              ),
                                            ],
                                          ],
                                        ),
                                        StatusChip(label: labelStr, type: chipType),
                                      ],
                                    ),
                                    if (!isWeekendOrHoliday) ...[
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text("IN: ${ts.clockInTime ?? '—'}", style: AppTypography.caption),
                                          Text("OUT: ${ts.clockOutTime ?? '—'}", style: AppTypography.caption),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              );
                            },
                          ),
                      ]
                      else if (_tabController.index == 1) ...[
                        AppCard(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                decoration: const BoxDecoration(color: AppColors.slateBg, shape: BoxShape.circle),
                                child: IconButton(
                                  icon: const Icon(CupertinoIcons.chevron_left, size: 18, color: AppColors.textPrimary),
                                  onPressed: () => controller.previousMonth(),
                                ),
                              ),
                              Text(
                                "$monthName ${selectedMonth.year}",
                                style: AppTypography.titleLarge,
                              ),
                              Container(
                                decoration: const BoxDecoration(color: AppColors.slateBg, shape: BoxShape.circle),
                                child: IconButton(
                                  icon: const Icon(CupertinoIcons.chevron_right, size: 18, color: AppColors.textPrimary),
                                  onPressed: () => controller.nextMonth(),
                                ),
                              ),
                            ],
                          ),
                        ),
                        AppSpacing.gapMD,
                        AppCard(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceAround,
                                children: [
                                  Text("MON", style: AppTypography.overline),
                                  Text("TUE", style: AppTypography.overline),
                                  Text("WED", style: AppTypography.overline),
                                  Text("THU", style: AppTypography.overline),
                                  Text("FRI", style: AppTypography.overline),
                                  Text("SAT", style: AppTypography.overline),
                                  Text("SUN", style: AppTypography.overline),
                                ],
                              ),
                              AppSpacing.gapSM,
                              Builder(
                                builder: (context) {
                                  final firstDayOfMonth = DateTime(selectedMonth.year, selectedMonth.month, 1);
                                  final daysInMonthCount = DateUtils.getDaysInMonth(selectedMonth.year, selectedMonth.month);
                                  final startingWeekday = firstDayOfMonth.weekday;
                                  final leadingEmptyCount = startingWeekday - 1;
                                  final totalCells = leadingEmptyCount + daysInMonthCount;

                                  return GridView.builder(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    itemCount: totalCells,
                                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: 7,
                                      mainAxisSpacing: 8,
                                      crossAxisSpacing: 8,
                                      childAspectRatio: 1.0,
                                    ),
                                    itemBuilder: (context, index) {
                                      if (index < leadingEmptyCount) {
                                        return const SizedBox();
                                      }

                                      final dayNumber = index - leadingEmptyCount + 1;
                                      final dayDate = DateTime(selectedMonth.year, selectedMonth.month, dayNumber);
                                      final isSunday = dayDate.weekday == DateTime.sunday;
                                      final isFuture = dayDate.isAfter(DateTime.now());

                                      final TimesheetEntryModel? matchingTs = timesheets.where(
                                        (ts) => ts.date.day == dayNumber && ts.date.month == selectedMonth.month && ts.date.year == selectedMonth.year,
                                      ).firstOrNull;

                                      Color tileBg = Colors.white;
                                      Color tileFg = isFuture ? AppColors.textMuted : AppColors.textPrimary;
                                      Border? tileBorder = Border.all(color: AppColors.borderSubtle, width: 1);

                                      if (matchingTs != null) {
                                        if (matchingTs.status == DayAttendanceStatus.present) {
                                          tileBg = AppColors.mintBg;
                                          tileFg = AppColors.mintFg;
                                          tileBorder = null;
                                        } else if (matchingTs.status == DayAttendanceStatus.halfDayPresent || matchingTs.status == DayAttendanceStatus.halfDay) {
                                          tileBg = const Color(0xFFFEF3C7);
                                          tileFg = const Color(0xFFD97706);
                                          tileBorder = null;
                                        } else if (matchingTs.status == DayAttendanceStatus.halfDayAbsent) {
                                          tileBg = const Color(0xFFFFEDD5);
                                          tileFg = const Color(0xFFEA580C);
                                          tileBorder = null;
                                        } else if (matchingTs.status == DayAttendanceStatus.absent) {
                                          tileBg = AppColors.peachBg;
                                          tileFg = AppColors.peachFg;
                                          tileBorder = null;
                                        } else if (matchingTs.status == DayAttendanceStatus.leave) {
                                          tileBg = AppColors.lavenderBg;
                                          tileFg = AppColors.lavenderFg;
                                          tileBorder = null;
                                        } else if (matchingTs.status == DayAttendanceStatus.holiday) {
                                          tileBg = AppColors.skyBg;
                                          tileFg = AppColors.skyFg;
                                          tileBorder = null;
                                        } else if (matchingTs.status == DayAttendanceStatus.weekOff) {
                                          tileBg = AppColors.slateBg;
                                          tileFg = AppColors.slateFg;
                                          tileBorder = null;
                                        }
                                      } else if (isSunday && !isFuture) {
                                        tileBg = AppColors.slateBg.withValues(alpha: 0.5);
                                        tileFg = AppColors.textMuted;
                                      }

                                      final isSelected = _selectedCalendarDay != null &&
                                          _selectedCalendarDay!.day == dayNumber &&
                                          _selectedCalendarDay!.month == selectedMonth.month;

                                      return GestureDetector(
                                        onTap: () {
                                          setState(() => _selectedCalendarDay = dayDate);
                                        },
                                        child: AnimatedContainer(
                                          duration: const Duration(milliseconds: 150),
                                          decoration: BoxDecoration(
                                            color: tileBg,
                                            borderRadius: AppRadius.borderMd,
                                            border: isSelected
                                                ? Border.all(color: AppColors.primary, width: 2)
                                                : tileBorder,
                                            boxShadow: isSelected
                                                ? AppShadows.appletTile(AppColors.primary)
                                                : null,
                                          ),
                                          child: Center(
                                            child: Text(
                                              "$dayNumber",
                                              style: AppTypography.bodyRegular.copyWith(
                                                fontWeight: FontWeight.bold,
                                                color: tileFg,
                                              ),
                                            ),
                                          ),
                                        ),
                                      );
                                    },
                                  );
                                },
                              ),
                              AppSpacing.gapMD,
                              const Divider(height: 1, color: AppColors.borderSubtle),
                              AppSpacing.gapSM,
                              Wrap(
                                spacing: 12,
                                runSpacing: 6,
                                children: [
                                  _buildLegendItem("Present", AppColors.mintFg),
                                  _buildLegendItem("Half Day", const Color(0xFFD97706)),
                                  _buildLegendItem("Absent", AppColors.peachFg),
                                  _buildLegendItem("Leave", AppColors.lavenderFg),
                                  _buildLegendItem("Holiday", AppColors.skyFg),
                                  _buildLegendItem("Week Off", AppColors.slateFg),
                                ],
                              ),
                            ],
                          ),
                        ),
                        AppSpacing.gapMD,
                        Builder(
                          builder: (context) {
                            final now = DateTime.now();
                            final dateToDisplay = _selectedCalendarDay ?? DateTime(selectedMonth.year, selectedMonth.month, now.day <= DateUtils.getDaysInMonth(selectedMonth.year, selectedMonth.month) ? now.day : 1);
                            final TimesheetEntryModel? matchingTs = timesheets.where(
                              (ts) => ts.date.day == dateToDisplay.day && ts.date.month == selectedMonth.month && ts.date.year == selectedMonth.year,
                            ).firstOrNull;

                            StatusType chipType = StatusType.neutral;
                            String statusStr = "Not Recorded";

                            if (matchingTs != null) {
                              if (matchingTs.status == DayAttendanceStatus.present) {
                                chipType = StatusType.success;
                                statusStr = "Present";
                              } else if (matchingTs.status == DayAttendanceStatus.halfDayPresent || matchingTs.status == DayAttendanceStatus.halfDay) {
                                chipType = StatusType.warning;
                                statusStr = "Half Day (Present)";
                              } else if (matchingTs.status == DayAttendanceStatus.halfDayAbsent) {
                                chipType = StatusType.error;
                                statusStr = "Half Day (Absent)";
                              } else if (matchingTs.status == DayAttendanceStatus.absent) {
                                chipType = StatusType.error;
                                statusStr = "Absent";
                              } else if (matchingTs.status == DayAttendanceStatus.leave) {
                                chipType = StatusType.warning;
                                statusStr = "On Leave";
                              } else if (matchingTs.status == DayAttendanceStatus.holiday) {
                                chipType = StatusType.info;
                                statusStr = "Holiday";
                              } else if (matchingTs.status == DayAttendanceStatus.weekOff) {
                                chipType = StatusType.neutral;
                                statusStr = "Week Off";
                              }
                            } else {
                              if (dateToDisplay.isAfter(DateTime(now.year, now.month, now.day))) {
                                chipType = StatusType.neutral;
                                statusStr = "Upcoming";
                              } else if (dateToDisplay.weekday == DateTime.sunday) {
                                chipType = StatusType.neutral;
                                statusStr = "Week Off";
                              } else {
                                chipType = StatusType.neutral;
                                statusStr = "Not Recorded";
                              }
                            }

                            return AppCard(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        "${dateToDisplay.day} $monthName ${dateToDisplay.year}",
                                        style: AppTypography.titleLarge,
                                      ),
                                      StatusChip(label: statusStr, type: chipType),
                                    ],
                                  ),
                                  AppSpacing.gapMD,
                                  Container(
                                    padding: const EdgeInsets.all(AppSpacing.md),
                                    decoration: BoxDecoration(
                                      color: AppColors.slateBg,
                                      borderRadius: AppRadius.borderMd,
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text("CHECK IN", style: AppTypography.overline),
                                              const SizedBox(height: 4),
                                              Text(matchingTs?.clockInTime ?? "—", style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.bold)),
                                            ],
                                          ),
                                        ),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text("CHECK OUT", style: AppTypography.overline),
                                              const SizedBox(height: 4),
                                              Text(matchingTs?.clockOutTime ?? "—", style: AppTypography.bodyLarge.copyWith(fontWeight: FontWeight.bold)),
                                            ],
                                          ),
                                        ),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text("TOTAL HOURS", style: AppTypography.overline),
                                              const SizedBox(height: 4),
                                              Text(
                                                matchingTs?.totalHours ?? "—",
                                                style: AppTypography.bodyLarge.copyWith(
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.primary,
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
                            );
                          },
                        ),
                      ]
                      else ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                "Regularization Requests",
                                style: AppTypography.titleLarge,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            AppButton(
                              label: "New Request",
                              icon: CupertinoIcons.add,
                              onPressed: () => _showRegularizationDialog(context),
                              variant: AppButtonVariant.primaryPill,
                            ),
                          ],
                        ),
                        AppSpacing.gapMD,
                        if (regularizations.isEmpty)
                          EmptyStateWidget(
                            icon: CupertinoIcons.checkmark_seal,
                            title: "No regularization requests",
                            description: "Forgot to punch in/out? Submit a regularization request.",
                            actionLabel: "Regularize Attendance",
                            onAction: () => _showRegularizationDialog(context),
                          )
                        else
                          Column(
                            children: regularizations.map((reg) {
                              StatusType regChipType = StatusType.warning;
                              String regStatusStr = "Manager Pending";
                              
                              if (reg.statusState == RegularizationStatusState.hrPending) {
                                regChipType = StatusType.info;
                                regStatusStr = "HR Review";
                              } else if (reg.statusState == RegularizationStatusState.approved || reg.status == LeaveStatus.approved) {
                                regChipType = StatusType.success;
                                regStatusStr = "Approved · Cleared";
                              } else if (reg.statusState == RegularizationStatusState.rejected || reg.status == LeaveStatus.rejected) {
                                regChipType = StatusType.error;
                                regStatusStr = "Rejected";
                              } else if (reg.statusState == RegularizationStatusState.clarificationRequired) {
                                regChipType = StatusType.neutral;
                                regStatusStr = "Clarification Needed";
                              }

                              final monthNames = [
                                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                              ];
                              final dateFormatted = "${reg.date.day} ${monthNames[reg.date.month - 1]} ${reg.date.year}";

                              return Container(
                                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                                child: AppCard(
                                  padding: const EdgeInsets.all(AppSpacing.md),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.all(8),
                                                decoration: BoxDecoration(
                                                  color: AppColors.primary.withValues(alpha: 0.1),
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: const Icon(CupertinoIcons.calendar, size: 16, color: AppColors.primary),
                                              ),
                                              const SizedBox(width: 10),
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(dateFormatted, style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold)),
                                                  Text(reg.shiftName, style: AppTypography.caption.copyWith(color: AppColors.textSecondary)),
                                                ],
                                              ),
                                            ],
                                          ),
                                          StatusChip(label: regStatusStr, type: regChipType),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      // Side-by-side comparison block
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: AppColors.slateBg,
                                          borderRadius: AppRadius.borderMd,
                                        ),
                                        child: Row(
                                          children: [
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text("Original", style: AppTypography.caption.copyWith(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    "${reg.originalInTime ?? '10:09 AM'} → ${reg.originalOutTime ?? '—'}",
                                                    style: AppTypography.bodySmall.copyWith(fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const Icon(CupertinoIcons.arrow_right, size: 14, color: AppColors.textMuted),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text("Requested", style: AppTypography.caption.copyWith(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    "${reg.requestedInTime} → ${reg.requestedOutTime}",
                                                    style: AppTypography.bodySmall.copyWith(fontWeight: FontWeight.bold, color: AppColors.primary),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(height: 10),
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text("Reason: ", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textSecondary)),
                                          Expanded(
                                            child: Text(
                                              reg.reason,
                                              style: AppTypography.bodySmall.copyWith(color: AppColors.textPrimary),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (reg.managerComment?.isNotEmpty == true || reg.hrComment?.isNotEmpty == true) ...[
                                        const SizedBox(height: 6),
                                        Container(
                                          width: double.infinity,
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: AppColors.mintBg.withValues(alpha: 0.5),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            "Approver Note: ${reg.hrComment ?? reg.managerComment}",
                                            style: AppTypography.caption.copyWith(fontStyle: FontStyle.italic, color: AppColors.mintFg),
                                          ),
                                        ),
                                      ],
                                      const SizedBox(height: 10),
                                      // Stage Stepper
                                      Row(
                                        children: [
                                          _buildStepNode("Submitted", true),
                                          _buildStepConnector(reg.statusState != RegularizationStatusState.managerPending),
                                          _buildStepNode(
                                            "Manager",
                                            reg.statusState == RegularizationStatusState.hrPending ||
                                                reg.statusState == RegularizationStatusState.approved,
                                          ),
                                          _buildStepConnector(reg.statusState == RegularizationStatusState.approved),
                                          _buildStepNode(
                                            "HR Sign-off",
                                            reg.statusState == RegularizationStatusState.approved,
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}

  Widget _buildLegendItem(String label, Color dotColor) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: AppTypography.caption),
      ],
    );
  }

  Widget _buildStepNode(String label, bool isCompleted) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: isCompleted ? AppColors.primary : AppColors.slateBg,
            shape: BoxShape.circle,
            border: Border.all(
              color: isCompleted ? AppColors.primary : AppColors.borderLight,
              width: 1.5,
            ),
          ),
          child: isCompleted
              ? const Icon(CupertinoIcons.checkmark, size: 10, color: Colors.white)
              : null,
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: AppTypography.caption.copyWith(
            fontSize: 10,
            fontWeight: isCompleted ? FontWeight.bold : FontWeight.w500,
            color: isCompleted ? AppColors.textPrimary : AppColors.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildStepConnector(bool isCompleted) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.symmetric(horizontal: 4),
        color: isCompleted ? AppColors.primary : AppColors.borderLight,
      ),
    );
  }
}
