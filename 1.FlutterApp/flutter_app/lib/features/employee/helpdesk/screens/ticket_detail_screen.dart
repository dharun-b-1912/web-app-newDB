import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../../../core/controllers/employee_controller.dart';
import '../../../../core/theme/klarna_tokens.dart';
import '../../../../models/employee_relations_models.dart';
import '../../../../repositories/supabase/supabase_employee_relations_repository.dart';
import '../../../../widgets/core/app_card.dart';
import '../../../../widgets/core/status_chip.dart';

class TicketDetailScreen extends StatefulWidget {
  final HelpdeskTicketModel ticket;

  const TicketDetailScreen({super.key, required this.ticket});

  @override
  State<TicketDetailScreen> createState() => _TicketDetailScreenState();
}

class _TicketDetailScreenState extends State<TicketDetailScreen> {
  final _messageController = TextEditingController();
  List<HelpdeskMessageModel> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    final msgs = await SupabaseEmployeeRelationsRepository.instance.getTicketMessages(widget.ticket.id);
    if (mounted) {
      setState(() {
        _messages = msgs;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleSend() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) return;

    setState(() => _isSending = true);
    final success = await MoreModulesController.instance.sendTicketMessage(widget.ticket.id, text);
    if (mounted) {
      setState(() => _isSending = false);
      if (success) {
        _messageController.clear();
        _loadMessages();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ticket = widget.ticket;
    StatusType chipType = StatusType.warning;
    String statusLabel = "Open";

    if (ticket.status == HelpdeskStatus.inProgress || ticket.status == HelpdeskStatus.assigned) {
      chipType = StatusType.info;
      statusLabel = "In Progress";
    } else if (ticket.status == HelpdeskStatus.resolved || ticket.status == HelpdeskStatus.closed) {
      chipType = StatusType.success;
      statusLabel = "Resolved";
    }

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(CupertinoIcons.back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(ticket.ticketNumber, style: AppTypography.titleMedium.copyWith(fontFamily: 'monospace')),
            Text(ticket.category, style: AppTypography.caption),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(child: StatusChip(label: statusLabel, type: chipType)),
          ),
        ],
      ),
      body: Column(
        children: [
          // Original Request Summary Card
          Container(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
            child: AppCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(ticket.subject, style: AppTypography.titleMedium),
                  const SizedBox(height: 4),
                  Text(ticket.description, style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
                  if (ticket.resolutionSummary != null && ticket.resolutionSummary!.isNotEmpty) ...[
                    const Divider(height: 16, color: AppColors.borderSubtle),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.mintBg,
                        borderRadius: AppRadius.borderSm,
                      ),
                      child: Row(
                        children: [
                          const Icon(CupertinoIcons.checkmark_seal_fill, size: 16, color: AppColors.mintFg),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              "HR Resolution: ${ticket.resolutionSummary}",
                              style: AppTypography.caption.copyWith(color: AppColors.mintFg, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Messages Thread
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Text(
                          "No replies yet.\nYour ticket has been queued for HR review.",
                          textAlign: TextAlign.center,
                          style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg.senderRole == 'EMPLOYEE';

                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isMe ? AppColors.primary : Colors.white,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(14),
                                  topRight: const Radius.circular(14),
                                  bottomLeft: Radius.circular(isMe ? 14 : 2),
                                  bottomRight: Radius.circular(isMe ? 2 : 14),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        isMe ? "You" : msg.senderName,
                                        style: AppTypography.caption.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: isMe ? Colors.white70 : AppColors.primary,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    msg.message,
                                    style: AppTypography.bodyRegular.copyWith(
                                      color: isMe ? Colors.white : AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Align(
                                    alignment: Alignment.bottomRight,
                                    child: Text(
                                      "${msg.createdAt.hour.toString().padLeft(2, '0')}:${msg.createdAt.minute.toString().padLeft(2, '0')}",
                                      style: AppTypography.caption.copyWith(
                                        fontSize: 9,
                                        color: isMe ? Colors.white60 : AppColors.textMuted,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // Message Input Field
          if (ticket.status != HelpdeskStatus.closed)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: AppColors.borderSubtle)),
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        decoration: InputDecoration(
                          hintText: "Reply to HR...",
                          hintStyle: AppTypography.bodyRegular.copyWith(color: AppColors.textMuted),
                          filled: true,
                          fillColor: AppColors.slateBg,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: AppRadius.borderPill,
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: _isSending
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(CupertinoIcons.arrow_up_circle_fill, color: AppColors.primary, size: 32),
                      onPressed: _handleSend,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
