import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../models/employee_models.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/app_header.dart';
import '../../../../widgets/core/empty_state_widget.dart';
import '../../../../widgets/core/status_chip.dart';
import '../controllers/task_controller.dart';

class EmployeeTasksScreen extends StatefulWidget {
  const EmployeeTasksScreen({super.key});

  @override
  State<EmployeeTasksScreen> createState() => _EmployeeTasksScreenState();
}

class _EmployeeTasksScreenState extends State<EmployeeTasksScreen> {
  @override
  void initState() {
    super.initState();
    TaskController.instance.initialize();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: ListenableBuilder(
        listenable: TaskController.instance,
        builder: (context, _) {
          final controller = TaskController.instance;
          final tasks = controller.tasks;

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () => controller.refresh(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.only(bottom: AppSpacing.bottomNavClearance),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppHeader(
                    subtitle: "Assignments & Work Items",
                    title: "Task",
                    rightAction: Navigator.canPop(context)
                        ? IconButton(
                            icon: const Icon(
                              CupertinoIcons.xmark_circle_fill,
                              color: AppColors.textMuted,
                              size: 24,
                            ),
                            onPressed: () => Navigator.pop(context),
                          )
                        : null,
                  ),
                  AppSpacing.gapLG,
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (controller.isLoading)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 40),
                            child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                          )
                        else if (tasks.isEmpty)
                          const EmptyStateWidget(
                            icon: CupertinoIcons.checkmark_square,
                            title: "No tasks assigned to you",
                            description: "You're all caught up. New tasks will appear here when assigned.",
                          )
                        else
                          Column(
                            children: tasks.map((task) => _buildTaskCard(task)).toList(),
                          ),
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

  Widget _buildTaskCard(TaskModel task) {
    StatusType chipType = StatusType.warning;
    String statusText = "Pending";
    if (task.status == TaskStatus.inProgress) {
      chipType = StatusType.info;
      statusText = "In Progress";
    } else if (task.status == TaskStatus.completed) {
      chipType = StatusType.success;
      statusText = "Completed";
    } else if (task.status == TaskStatus.blocked) {
      chipType = StatusType.error;
      statusText = "Blocked";
    } else if (task.status == TaskStatus.cancelled) {
      chipType = StatusType.neutral;
      statusText = "Cancelled";
    }

    final priorityColor = task.priority == TaskPriority.urgent
        ? AppColors.roseFg
        : task.priority == TaskPriority.high
            ? AppColors.alertFg
            : task.priority == TaskPriority.medium
                ? AppColors.skyFg
                : AppColors.mintFg;

    final priorityBg = task.priority == TaskPriority.urgent
        ? AppColors.roseBg
        : task.priority == TaskPriority.high
            ? AppColors.alertBg
            : task.priority == TaskPriority.medium
                ? AppColors.skyBg
                : AppColors.mintBg;

    final priorityLabel = task.priority == TaskPriority.urgent
        ? "URGENT"
        : task.priority == TaskPriority.high
            ? "HIGH"
            : task.priority == TaskPriority.medium
                ? "MEDIUM"
                : "LOW";

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: AppCard(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    task.title,
                    style: AppTypography.titleMedium,
                  ),
                ),
                const SizedBox(width: 8),
                StatusChip(label: statusText, type: chipType),
              ],
            ),
            if (task.description.isNotEmpty) ...[
              AppSpacing.gapXS,
              Text(
                task.description,
                style: AppTypography.bodyRegular.copyWith(
                  color: AppColors.textPrimary.withValues(alpha: 0.85),
                ),
              ),
            ],
            AppSpacing.gapSM,
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: priorityBg,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    priorityLabel,
                    style: AppTypography.caption.copyWith(
                      color: priorityColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                if (task.dueDate != null) ...[
                  const Icon(CupertinoIcons.calendar, size: 13, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    "Due: ${_formatDate(task.dueDate!)}",
                    style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                  ),
                ],
                if (task.assignedByName != null && task.assignedByName!.isNotEmpty) ...[
                  const Spacer(),
                  Text(
                    "By: ${task.assignedByName}",
                    style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                  ),
                ],
              ],
            ),
            if (task.progressPercent > 0) ...[
              AppSpacing.gapSM,
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: task.progressPercent / 100,
                  backgroundColor: AppColors.slateBg,
                  color: task.status == TaskStatus.completed ? AppColors.statusSuccess : AppColors.primary,
                  minHeight: 6,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    return "${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}";
  }
}
