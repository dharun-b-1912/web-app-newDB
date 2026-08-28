import 'package:flutter/cupertino.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:workforce_os/models/employee_models.dart';

void main() {
  group('WorkForceOS Document Request & Notification Workflow Suite', () {
    test('1. DocumentRequirementModel accurately parses and reports lifecycle states', () {
      final req1 = DocumentRequirementModel(
        id: 'doc-req-101',
        employeeId: 'emp-admin-001',
        documentType: 'PAN_CARD',
        title: 'PAN Card Required',
        description: 'Please upload a clear front copy.',
        status: 'REQUIRED',
        dueDate: DateTime(2026, 9, 1),
        createdAt: DateTime(2026, 8, 25),
      );

      expect(req1.isPending, isTrue);
      expect(req1.isSubmitted, isFalse);
      expect(req1.isVerified, isFalse);
      expect(req1.isRejected, isFalse);

      final reqSubmitted = DocumentRequirementModel(
        id: 'doc-req-101',
        employeeId: 'emp-admin-001',
        documentType: 'PAN_CARD',
        title: 'PAN Card Required',
        status: 'SUBMITTED',
        documentId: 'doc-emp-99',
        createdAt: DateTime(2026, 8, 25),
      );
      expect(reqSubmitted.isPending, isFalse);
      expect(reqSubmitted.isSubmitted, isTrue);

      final reqRejected = DocumentRequirementModel(
        id: 'doc-req-101',
        employeeId: 'emp-admin-001',
        documentType: 'PAN_CARD',
        title: 'PAN Card Required',
        status: 'REUPLOAD_REQUIRED',
        rejectionReason: 'Corners cut off, image blurred.',
        createdAt: DateTime(2026, 8, 25),
      );
      expect(reqRejected.isPending, isTrue); // re-upload is pending upload
      expect(reqRejected.rejectionReason, equals('Corners cut off, image blurred.'));

      final reqVerified = DocumentRequirementModel(
        id: 'doc-req-101',
        employeeId: 'emp-admin-001',
        documentType: 'PAN_CARD',
        title: 'PAN Card Required',
        status: 'VERIFIED',
        createdAt: DateTime(2026, 8, 25),
      );
      expect(reqVerified.isVerified, isTrue);
      expect(reqVerified.isPending, isFalse);
    });

    test('2. NotificationItemModel encapsulates entity type and requirement reference', () {
      final notif = NotificationItemModel(
        id: 'ev-notif-001',
        title: 'Action Required: Document Upload (PAN Card)',
        message: 'HR requested you to upload PAN Card before 01 Sep 2026.',
        timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
        isRead: false,
        icon: CupertinoIcons.folder_badge_plus,
        notificationType: 'DOCUMENT_REQUEST',
        entityType: 'DOCUMENT_REQUIREMENT',
        entityId: 'doc-req-101',
        status: 'REQUIRED',
        dueDate: DateTime(2026, 9, 1),
      );

      expect(notif.notificationType, equals('DOCUMENT_REQUEST'));
      expect(notif.entityType, equals('DOCUMENT_REQUIREMENT'));
      expect(notif.entityId, equals('doc-req-101'));
      expect(notif.isRead, isFalse);
      expect(notif.dueDate, isNotNull);
    });

    test('3. Dynamic relative timestamp calculation matches human-readable standard', () {
      String formatTimestamp(DateTime dt, DateTime now) {
        final diff = now.difference(dt);
        if (diff.inMinutes < 1) return 'Just now';
        if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
        if (diff.inHours < 24) return '${diff.inHours}h ago';
        if (diff.inDays == 1) return 'Yesterday';
        if (diff.inDays < 7) return '${diff.inDays}d ago';
        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return '${dt.day} ${months[dt.month]}';
      }

      final now = DateTime(2026, 8, 25, 15, 0, 0);

      expect(formatTimestamp(now.subtract(const Duration(seconds: 30)), now), equals('Just now'));
      expect(formatTimestamp(now.subtract(const Duration(minutes: 15)), now), equals('15m ago'));
      expect(formatTimestamp(now.subtract(const Duration(hours: 3)), now), equals('3h ago'));
      expect(formatTimestamp(now.subtract(const Duration(days: 1)), now), equals('Yesterday'));
      expect(formatTimestamp(now.subtract(const Duration(days: 3)), now), equals('3d ago'));
      expect(formatTimestamp(DateTime(2026, 7, 10), now), equals('10 Jul'));
    });
  });
}
