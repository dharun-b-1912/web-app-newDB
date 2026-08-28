import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../../../core/controllers/employee_controller.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../models/employee_models.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/empty_state_widget.dart';
import '../../../../widgets/core/status_chip.dart';
import '../../../../widgets/workforce_request_modal.dart';
import '../dialogs/grievance_modal.dart';

class ComplaintScreen extends StatelessWidget {
  const ComplaintScreen({super.key});

  void _showNewComplaintDialog(BuildContext context) {
    showWorkForceRequestModal(
      context: context,
      builder: (ctx) => const GrievanceModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: MoreModulesController.instance,
      builder: (context, _) {
        final controller = MoreModulesController.instance;
        final complaints = controller.complaints;

        return Scaffold(
          backgroundColor: AppColors.scaffoldBg,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(CupertinoIcons.back, color: AppColors.textPrimary),
              onPressed: () => Navigator.pop(context),
            ),
            title: Text("Complaints & Grievance", style: AppTypography.titleLarge),
            actions: [
              IconButton(
                icon: const Icon(CupertinoIcons.add, color: AppColors.primary),
                onPressed: () => _showNewComplaintDialog(context),
              ),
            ],
          ),
          body: controller.isLoading
              ? const Center(child: CircularProgressIndicator())
              : complaints.isEmpty
                  ? EmptyStateWidget(
                      icon: CupertinoIcons.exclamationmark_bubble,
                      title: "No grievances filed",
                      description: "Submit concerns or complaints to HR.",
                      actionLabel: "New Complaint",
                      onAction: () => _showNewComplaintDialog(context),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                      itemCount: complaints.length,
                      itemBuilder: (context, index) {
                        final item = complaints[index];
                        StatusType chipType = StatusType.neutral;
                        String labelStr = "Submitted";
                        if (item.status == ComplaintStatus.inProgress) {
                          chipType = StatusType.info;
                          labelStr = "In Progress";
                        } else if (item.status == ComplaintStatus.resolved) {
                          chipType = StatusType.success;
                          labelStr = "Resolved";
                        }

                        return Container(
                          margin: const EdgeInsets.only(bottom: AppSpacing.md),
                          child: AppCard(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(child: Text(item.subject, style: AppTypography.titleMedium)),
                                    StatusChip(label: labelStr, type: chipType),
                                  ],
                                ),
                                AppSpacing.gapXXS,
                                Text("Category: ${item.category}", style: AppTypography.bodySmall),
                                AppSpacing.gapMD,
                                Text(item.description, style: AppTypography.bodyRegular),
                                if (item.response != null) ...[
                                  const Divider(height: 16, color: AppColors.borderSubtle),
                                  Text("Resolution Response:", style: AppTypography.caption.copyWith(fontWeight: FontWeight.bold)),
                                  AppSpacing.gapXXS,
                                  Text(item.response!, style: AppTypography.bodySmall.copyWith(color: AppColors.primary)),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _showNewComplaintDialog(context),
            backgroundColor: AppColors.primary,
            icon: const Icon(CupertinoIcons.add, color: Colors.white),
            label: Text("New Complaint", style: AppTypography.bodyLarge.copyWith(color: Colors.white)),
          ),
        );
      },
    );
  }
}
