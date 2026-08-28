import 'package:flutter/material.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../models/hrms_models.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/app_header.dart';
import '../../../../widgets/core/status_chip.dart';

class TeamScreen extends StatelessWidget {
  const TeamScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final team = [
      const TeamMemberModel(
          name: "Arjun Menon",
          role: "Backend Engineer",
          initials: "AM",
          status: "In office"),
      const TeamMemberModel(
          name: "Sneha Kapoor",
          role: "Product Designer",
          initials: "SK",
          status: "On leave"),
      const TeamMemberModel(
          name: "Rahul Verma",
          role: "Field Sales",
          initials: "RV",
          status: "Remote"),
      const TeamMemberModel(
          name: "Divya Nair",
          role: "QA Engineer",
          initials: "DN",
          status: "In office"),
      const TeamMemberModel(
          name: "Karan Shah",
          role: "Data Analyst",
          initials: "KS",
          status: "Remote"),
    ];

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.only(bottom: AppSpacing.bottomNavClearance),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const AppHeader(
              subtitle: "Platform Engineering · 5 members",
              title: "My Team",
            ),
            AppSpacing.gapLG,
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal),
              child: Column(
                children: team.map((m) {
                  StatusType type;
                  if (m.status == "On leave") {
                    type = StatusType.warning;
                  } else if (m.status == "Remote") {
                    type = StatusType.info;
                  } else {
                    type = StatusType.success;
                  }

                  return Container(
                    margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: AppCard(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Row(
                        children: [
                          Container(
                            width: 42,
                            height: 42,
                            decoration: const BoxDecoration(
                              color: AppColors.lavenderBg,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                m.initials,
                                style: AppTypography.bodyLarge.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.lavenderFg,
                                ),
                              ),
                            ),
                          ),
                          AppSpacing.hGapMD,
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  m.name,
                                  style: AppTypography.titleMedium,
                                ),
                                Text(
                                  m.role,
                                  style: AppTypography.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          StatusChip(
                            label: m.status,
                            type: type,
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
