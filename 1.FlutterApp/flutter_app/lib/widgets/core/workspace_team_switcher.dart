import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/klarna_tokens.dart';

enum WorkspaceMode { myWorkspace, myTeam }

/// Segmented Pill Toggle for Team Leads / Managers to switch context
class WorkspaceTeamSwitcher extends StatelessWidget {
  final WorkspaceMode currentMode;
  final ValueChanged<WorkspaceMode> onModeChanged;

  const WorkspaceTeamSwitcher({
    super.key,
    required this.currentMode,
    required this.onModeChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.85),
        borderRadius: AppRadius.borderPill,
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildPillTab(
            label: "My Workspace",
            icon: Icons.person_outline_rounded,
            isSelected: currentMode == WorkspaceMode.myWorkspace,
            onTap: () {
              if (currentMode != WorkspaceMode.myWorkspace) {
                HapticFeedback.selectionClick();
                onModeChanged(WorkspaceMode.myWorkspace);
              }
            },
          ),
          _buildPillTab(
            label: "My Team",
            icon: Icons.group_outlined,
            isSelected: currentMode == WorkspaceMode.myTeam,
            onTap: () {
              if (currentMode != WorkspaceMode.myTeam) {
                HapticFeedback.selectionClick();
                onModeChanged(WorkspaceMode.myTeam);
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildPillTab({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.pillBlack : Colors.transparent,
          borderRadius: AppRadius.borderPill,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: AppTypography.caption.copyWith(
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? Colors.white : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
