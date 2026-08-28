import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/config/supabase_config.dart';
import '../../../../core/services/user_service.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../core/utils/query_timeout.dart';
import '../../../../core/utils/secure_log.dart';
import '../../../../models/hrms_models.dart';
import '../../../../widgets/core/app_button.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/empty_state_widget.dart';
import '../../../../widgets/core/status_chip.dart';

class ApprovalsCenterScreen extends StatefulWidget {
  const ApprovalsCenterScreen({super.key});

  @override
  State<ApprovalsCenterScreen> createState() => _ApprovalsCenterScreenState();
}

class _ApprovalsCenterScreenState extends State<ApprovalsCenterScreen> {
  List<ApprovalRequestModel> _requests = [];
  List<CompletedApprovalModel> _completed = [];
  bool _isLoading = false;
  RealtimeChannel? _channel;
  String _activeFilter = 'all';
  bool _historyOpen = true;
  final Set<String> _resolvingIds = {};

  @override
  void initState() {
    super.initState();
    _loadApprovals();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  void _subscribeRealtime() {
    if (!SupabaseConfig.isConfigured) return;
    try {
      _channel = Supabase.instance.client.channel('public:approvals_mesh');
      _channel?.onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'approval_requests',
        callback: (_) => _loadApprovals(),
      );
      _channel?.onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'leave_requests',
        callback: (_) => _loadApprovals(),
      );
      _channel?.subscribe();
    } catch (e) {
      secureLog('[Approvals] Realtime channel notice: $e');
    }
  }

  Future<void> _loadApprovals() async {
    if (!SupabaseConfig.isConfigured) return;
    setState(() => _isLoading = true);

    try {
      final pendingList = <ApprovalRequestModel>[];
      final doneList = <CompletedApprovalModel>[];

      // 1. Query approval_requests with tenant isolation
      try {
        final rows = await withTimeout(
          Supabase.instance.client
              .from('approval_requests')
              .select()
              .order('created_at', ascending: false)
              .limit(50),
        );

        for (final row in rows) {
          final status = (row['status']?.toString() ?? 'Pending').toUpperCase();
          final typeStr = (row['type']?.toString() ?? 'Leave').toLowerCase();
          ApprovalType type = ApprovalType.leave;
          if (typeStr.contains('reg') || typeStr.contains('attendance')) {
            type = ApprovalType.regularization;
          } else if (typeStr.contains('expense') || typeStr.contains('claim')) {
            type = ApprovalType.expense;
          }

          final empName = row['requested_by_name']?.toString() ?? 'Team Member';
          final initials = empName.split(' ').map((p) => p.isNotEmpty ? p[0] : '').take(2).join().toUpperCase();
          final dept = row['department']?.toString() ?? 'Operations';
          final title = row['title']?.toString() ?? 'Request';
          final details = row['details']?.toString() ?? row['amount_or_duration']?.toString() ?? '';
          final reason = row['decision_comment']?.toString() ?? '';
          final id = row['id']?.toString() ?? '';

          if (status == 'PENDING' || status == 'SUBMITTED') {
            pendingList.add(
              ApprovalRequestModel(
                id: id,
                type: type,
                employee: empName,
                initials: initials.isNotEmpty ? initials : 'TM',
                department: dept,
                appliedAgo: _formatRelativeTime(row['created_at']?.toString()),
                title: title,
                detail: details,
                reason: reason,
              ),
            );
          } else {
            doneList.add(
              CompletedApprovalModel(
                id: id,
                employee: empName,
                initials: initials.isNotEmpty ? initials : 'TM',
                title: title,
                status: row['status']?.toString() ?? 'Approved',
                when: _formatRelativeTime(row['decided_at']?.toString() ?? row['created_at']?.toString()),
              ),
            );
          }
        }
      } catch (e) {
        secureLog('[Approvals] approval_requests query notice: $e');
      }

      // 2. Query leave_requests as fallback/supplement
      try {
        final leaveRows = await withTimeout(
          Supabase.instance.client
              .from('leave_requests')
              .select()
              .order('created_at', ascending: false)
              .limit(20),
        );

        for (final row in leaveRows) {
          final id = 'leave-${row['id']}';
          if (pendingList.any((p) => p.id == id) || doneList.any((d) => d.id == id)) continue;

          final status = (row['status']?.toString() ?? 'PENDING').toUpperCase();
          final empName = row['employee_name']?.toString() ?? row['employee_id']?.toString() ?? 'Employee';
          final initials = empName.split(' ').map((p) => p.isNotEmpty ? p[0] : '').take(2).join().toUpperCase();
          final typeName = row['leave_type_name'] ?? row['leave_type_code'] ?? 'Leave';
          final days = row['working_days']?.toString() ?? '1';
          final title = '$typeName · $days Days';
          final dates = '${row['from_date'] ?? ''} – ${row['to_date'] ?? ''}';

          if (status == 'PENDING' || status == 'SUBMITTED' || status == 'REQUESTED') {
            pendingList.add(
              ApprovalRequestModel(
                id: id,
                type: ApprovalType.leave,
                employee: empName,
                initials: initials.isNotEmpty ? initials : 'EM',
                department: 'Department',
                appliedAgo: _formatRelativeTime(row['created_at']?.toString()),
                title: title,
                detail: dates,
                reason: row['reason']?.toString() ?? '',
              ),
            );
          } else if (status == 'APPROVED' || status == 'REJECTED') {
            doneList.add(
              CompletedApprovalModel(
                id: id,
                employee: empName,
                initials: initials.isNotEmpty ? initials : 'EM',
                title: title,
                status: status == 'APPROVED' ? 'Approved' : 'Declined',
                when: _formatRelativeTime(row['updated_at']?.toString() ?? row['created_at']?.toString()),
              ),
            );
          }
        }
      } catch (e) {
        secureLog('[Approvals] leave_requests query notice: $e');
      }

      if (mounted) {
        setState(() {
          _requests = pendingList;
          _completed = doneList;
          _isLoading = false;
        });
      }
    } catch (e) {
      secureLog('[Approvals] _loadApprovals error: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatRelativeTime(String? tsStr) {
    if (tsStr == null || tsStr.isEmpty) return 'Recent';
    final dt = DateTime.tryParse(tsStr);
    if (dt == null) return 'Recent';
    final diff = DateTime.now().difference(dt);
    if (diff.inDays >= 2) return '${diff.inDays}d ago';
    if (diff.inDays >= 1) return 'Yesterday';
    if (diff.inHours >= 1) return '${diff.inHours}h ago';
    if (diff.inMinutes >= 1) return '${diff.inMinutes}m ago';
    return 'Just now';
  }

  List<ApprovalRequestModel> get _visibleRequests {
    if (_activeFilter == 'all') return _requests;
    if (_activeFilter == 'leave') {
      return _requests.where((r) => r.type == ApprovalType.leave).toList();
    }
    if (_activeFilter == 'regularization') {
      return _requests.where((r) => r.type == ApprovalType.regularization).toList();
    }
    if (_activeFilter == 'expense') {
      return _requests.where((r) => r.type == ApprovalType.expense).toList();
    }
    return _requests;
  }

  Future<void> _resolve(String id, String action) async {
    HapticFeedback.mediumImpact();
    setState(() {
      _resolvingIds.add(id);
    });

    try {
      final user = UserService.instance.currentUser;
      final statusVal = action.toLowerCase().contains('approve') ? 'Approved' : 'Rejected';

      if (SupabaseConfig.isConfigured) {
        if (id.startsWith('leave-')) {
          final realId = id.replaceFirst('leave-', '');
          await Supabase.instance.client.from('leave_requests').update({
            'status': statusVal.toUpperCase(),
            'updated_at': DateTime.now().toIso8601String(),
          }).eq('id', realId);
        } else {
          await Supabase.instance.client.from('approval_requests').update({
            'status': statusVal,
            'decided_at': DateTime.now().toIso8601String(),
            'decided_by_id': user.dataId,
          }).eq('id', id);
        }
      }
    } catch (e) {
      secureLog('[Approvals] _resolve update error: $e');
    }

    if (!mounted) return;
    final resolvedIdx = _requests.indexWhere((r) => r.id == id);
    if (resolvedIdx != -1) {
      final resolvedItem = _requests[resolvedIdx];
      setState(() {
        _requests.removeAt(resolvedIdx);
        _resolvingIds.remove(id);
        _completed.insert(
          0,
          CompletedApprovalModel(
            id: 'done-${DateTime.now().millisecondsSinceEpoch}',
            employee: resolvedItem.employee,
            initials: resolvedItem.initials,
            title: resolvedItem.title,
            status: action,
            when: 'Just now',
          ),
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filters = [
      {'id': 'all', 'label': 'All', 'count': _requests.length},
      {
        'id': 'leave',
        'label': 'Leaves',
        'count': _requests.where((r) => r.type == ApprovalType.leave).length
      },
      {
        'id': 'regularization',
        'label': 'Regularization',
        'count': _requests.where((r) => r.type == ApprovalType.regularization).length
      },
      {
        'id': 'expense',
        'label': 'Expenses',
        'count': _requests.where((r) => r.type == ApprovalType.expense).length
      },
    ];

    final double topSafeArea = MediaQuery.of(context).padding.top + 16;

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.only(bottom: AppSpacing.bottomNavClearance),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                topSafeArea,
                AppSpacing.screenHorizontal,
                AppSpacing.xxl,
              ),
              decoration: const BoxDecoration(
                gradient: AppColors.approvalsAuraHeader,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(AppRadius.sheet)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Approvals Center",
                    style: AppTypography.caption,
                  ),
                  AppSpacing.gapXXS,
                  Row(
                    children: [
                      Text(
                        "${_requests.length} Pending",
                        style: AppTypography.displayHeader,
                      ),
                      AppSpacing.hGapXS,
                      Text(
                        _requests.length == 1 ? "Request" : "Requests",
                        style: AppTypography.displayHeader.copyWith(
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  AppSpacing.gapLG,
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: filters.map((f) {
                        final isSelected = _activeFilter == f['id'];
                        final count = f['count'] as int;

                        return GestureDetector(
                          onTap: () {
                            HapticFeedback.selectionClick();
                            setState(() => _activeFilter = f['id'] as String);
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.pillBlack : Colors.white,
                              borderRadius: AppRadius.borderPill,
                              boxShadow: isSelected ? AppShadows.pillDark : AppShadows.softCard,
                            ),
                            child: Row(
                              children: [
                                Text(
                                  f['label'] as String,
                                  style: AppTypography.caption.copyWith(
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                    color: isSelected ? Colors.white : AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? Colors.white.withValues(alpha: 0.2)
                                        : AppColors.slateBg,
                                    borderRadius: AppRadius.borderPill,
                                  ),
                                  child: Text(
                                    '$count',
                                    style: AppTypography.overline.copyWith(
                                      color: isSelected ? Colors.white : AppColors.textSecondary,
                                    ),
                                  ),
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
            AppSpacing.gapXL,
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_isLoading && _requests.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: CircularProgressIndicator(color: AppColors.primary),
                      ),
                    )
                  else if (_visibleRequests.isEmpty)
                    const EmptyStateWidget(
                      icon: CupertinoIcons.checkmark_circle_fill,
                      bg: AppColors.mintBg,
                      fg: AppColors.mintFg,
                      title: "All Clear!",
                      description: "There are no pending requests requiring your approval in this category.",
                    )
                  else
                    ..._visibleRequests.map((req) {
                      final isResolving = _resolvingIds.contains(req.id);

                      return AnimatedOpacity(
                        duration: const Duration(milliseconds: 250),
                        opacity: isResolving ? 0.3 : 1.0,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: AppSpacing.md),
                          child: AppCard(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: const BoxDecoration(
                                        color: AppColors.lavenderBg,
                                        shape: BoxShape.circle,
                                      ),
                                      child: Center(
                                        child: Text(
                                          req.initials,
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
                                            req.employee,
                                            style: AppTypography.titleMedium,
                                          ),
                                          Text(
                                            req.department,
                                            style: AppTypography.bodySmall,
                                          ),
                                        ],
                                      ),
                                    ),
                                    StatusChip(
                                      label: req.appliedAgo,
                                      type: StatusType.neutral,
                                    ),
                                  ],
                                ),
                                AppSpacing.gapMD,
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(AppSpacing.md),
                                  decoration: BoxDecoration(
                                    color: AppColors.slateBg,
                                    borderRadius: AppRadius.borderMd,
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        req.title,
                                        style: AppTypography.bodyLarge.copyWith(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      AppSpacing.gapXXS,
                                      Text(
                                        req.detail,
                                        style: AppTypography.bodyRegular,
                                      ),
                                      if (req.reason.isNotEmpty) ...[
                                        AppSpacing.gapXS,
                                        Text(
                                          "Reason: \"${req.reason}\"",
                                          style: AppTypography.caption.copyWith(
                                            fontStyle: FontStyle.italic,
                                          ),
                                        ),
                                      ],
                                      if (req.impact != null) ...[
                                        AppSpacing.gapXS,
                                        StatusChip(
                                          label: req.impact!,
                                          type: StatusType.warning,
                                          icon: CupertinoIcons.exclamationmark_circle,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                AppSpacing.gapLG,
                                Row(
                                  children: [
                                    Expanded(
                                      child: AppButton(
                                        label: "Decline",
                                        onPressed: () => _resolve(req.id, "Declined"),
                                        variant: AppButtonVariant.secondaryPill,
                                        customBgColor: AppColors.roseBg,
                                        customFgColor: AppColors.roseFg,
                                      ),
                                    ),
                                    AppSpacing.hGapMD,
                                    Expanded(
                                      child: AppButton(
                                        label: "Approve",
                                        onPressed: () => _resolve(req.id, "Approved"),
                                        variant: AppButtonVariant.primaryPill,
                                        customBgColor: AppColors.primary,
                                        customFgColor: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  AppSpacing.gapXXL,
                  GestureDetector(
                    onTap: () => setState(() => _historyOpen = !_historyOpen),
                    behavior: HitTestBehavior.opaque,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "Resolved History (${_completed.length})",
                          style: AppTypography.titleLarge,
                        ),
                        Icon(
                          _historyOpen
                              ? CupertinoIcons.chevron_up
                              : CupertinoIcons.chevron_down,
                          size: 18,
                          color: AppColors.textMuted,
                        ),
                      ],
                    ),
                  ),
                  AppSpacing.gapMD,
                  if (_historyOpen)
                    ..._completed.map((comp) {
                      final isApproved = comp.status == "Approved";

                      return Container(
                        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: AppCard(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: isApproved ? AppColors.mintBg : AppColors.roseBg,
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Icon(
                                    isApproved
                                        ? CupertinoIcons.checkmark
                                        : CupertinoIcons.xmark,
                                    size: 16,
                                    color: isApproved ? AppColors.mintFg : AppColors.roseFg,
                                  ),
                                ),
                              ),
                              AppSpacing.hGapMD,
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      comp.employee,
                                      style: AppTypography.titleMedium,
                                    ),
                                    Text(
                                      comp.title,
                                      style: AppTypography.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  StatusChip(
                                    label: comp.status,
                                    type: isApproved
                                        ? StatusType.success
                                        : StatusType.error,
                                  ),
                                  AppSpacing.gapXXS,
                                  Text(
                                    comp.when,
                                    style: AppTypography.overline,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
