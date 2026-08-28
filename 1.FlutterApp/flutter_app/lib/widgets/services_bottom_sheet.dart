import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../core/theme/klarna_tokens.dart';
import '../features/employee/claims/screens/expense_claims_screen.dart';
import '../features/employee/leave/screens/leave_screen.dart';
import '../features/employee/letters/screens/digital_letters_screen.dart';
import '../features/employee/payslips/screens/payslips_screen.dart';
import '../features/employee/performance/screens/performance_screen.dart';
import '../features/employee/roster/screens/shift_roster_screen.dart';
import '../features/employee/tasks/screens/employee_tasks_screen.dart';

class ServiceItemDef {
  final String id;
  final String title;
  final IconData icon;
  final Color bgColor;
  final Color fgColor;

  const ServiceItemDef({
    required this.id,
    required this.title,
    required this.icon,
    required this.bgColor,
    required this.fgColor,
  });
}

class ServicesBottomSheet extends StatelessWidget {
  const ServicesBottomSheet({super.key});

  static const List<ServiceItemDef> services = [
    ServiceItemDef(
      id: 'leave',
      title: 'Leave',
      icon: CupertinoIcons.calendar_badge_plus,
      bgColor: AppColors.mintBg,
      fgColor: AppColors.mintFg,
    ),
    ServiceItemDef(
      id: 'roster',
      title: 'Roster',
      icon: CupertinoIcons.time,
      bgColor: AppColors.skyBg,
      fgColor: AppColors.skyFg,
    ),
    ServiceItemDef(
      id: 'payslips',
      title: 'Payslips',
      icon: CupertinoIcons.doc_text_fill,
      bgColor: AppColors.lavenderBg,
      fgColor: AppColors.lavenderFg,
    ),
    ServiceItemDef(
      id: 'claims',
      title: 'Claims',
      icon: CupertinoIcons.creditcard_fill,
      bgColor: AppColors.peachBg,
      fgColor: AppColors.peachFg,
    ),
    ServiceItemDef(
      id: 'tasks',
      title: 'Tasks',
      icon: CupertinoIcons.check_mark_circled_solid,
      bgColor: AppColors.mintBg,
      fgColor: AppColors.mintFg,
    ),
    ServiceItemDef(
      id: 'performance',
      title: 'Reviews',
      icon: CupertinoIcons.chart_bar_square_fill,
      bgColor: AppColors.skyBg,
      fgColor: AppColors.skyFg,
    ),
    ServiceItemDef(
      id: 'letters',
      title: 'Letters',
      icon: CupertinoIcons.envelope_badge_fill,
      bgColor: AppColors.lavenderBg,
      fgColor: AppColors.lavenderFg,
    ),
  ];

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const ServicesBottomSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sheetContent = Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadius.borderSheet,
        boxShadow: AppShadows.bottomSheet,
      ),
      padding: const EdgeInsets.only(bottom: 36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppSpacing.gapMD,
          Container(
            width: 40,
            height: 5,
            decoration: BoxDecoration(
              color: AppColors.borderLight,
              borderRadius: AppRadius.borderPill,
            ),
          ),
          AppSpacing.gapLG,
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "All JOY PeopleHR Services",
                  style: AppTypography.titleLarge,
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      color: AppColors.slateBg,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(CupertinoIcons.xmark, size: 16, color: AppColors.textPrimary),
                  ),
                ),
              ],
            ),
          ),
          AppSpacing.gapMD,
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal),
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 12,
                mainAxisSpacing: 16,
                mainAxisExtent: 88,
              ),
              itemCount: services.length,
              itemBuilder: (context, index) {
                final service = services[index];
                return GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                    Widget target;
                    switch (service.id) {
                      case 'leave':
                        target = const LeaveScreen();
                        break;
                      case 'claims':
                        target = const ExpenseClaimsScreen();
                        break;
                      case 'payslips':
                        target = const PayslipsScreen();
                        break;
                      case 'tasks':
                        target = const EmployeeTasksScreen();
                        break;
                      case 'performance':
                        target = const PerformanceScreen();
                        break;
                      case 'letters':
                        target = const DigitalLettersScreen();
                        break;
                      default:
                        target = const ShiftRosterScreen();
                    }
                    Navigator.push(context, CupertinoPageRoute(builder: (_) => target));
                  },
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: service.bgColor,
                          borderRadius: AppRadius.borderMd,
                        ),
                        child: Icon(service.icon, size: 24, color: service.fgColor),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        service.title,
                        style: AppTypography.caption.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );

    return kIsWeb
        ? sheetContent
        : BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
            child: sheetContent,
          );
  }
}
