import 'dart:io';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/supabase_config.dart';
import '../utils/secure_log.dart';
import 'media_compression_service.dart';

class DocumentUploadService {
  static final DocumentUploadService instance = DocumentUploadService._internal();
  DocumentUploadService._internal();

  SupabaseClient get _supabase => Supabase.instance.client;

  /// Extract raw storage path from a file URL or storage URI
  String extractStoragePath(String rawUrl) {
    if (rawUrl.startsWith('storage://employee-documents/')) {
      return rawUrl.replaceFirst('storage://employee-documents/', '');
    }
    if (rawUrl.contains('/employee-documents/')) {
      final idx = rawUrl.indexOf('/employee-documents/');
      return rawUrl.substring(idx + '/employee-documents/'.length).split('?').first;
    }
    return rawUrl;
  }

  /// Generate a secure signed URL for private bucket access (valid for 1 hour)
  Future<String?> getSignedUrl(String pathOrUrl, {int expiresIn = 3600}) async {
    try {
      if (!SupabaseConfig.isConfigured) return null;
      final cleanPath = extractStoragePath(pathOrUrl);
      if (cleanPath.isEmpty) return null;

      final signedUrl = await _supabase.storage
          .from('employee-documents')
          .createSignedUrl(cleanPath, expiresIn);
      return signedUrl;
    } catch (e) {
      secureLog('[Storage] createSignedUrl error: $e');
      try {
        final cleanPath = extractStoragePath(pathOrUrl);
        return _supabase.storage.from('employee-documents').getPublicUrl(cleanPath);
      } catch (_) {
        return null;
      }
    }
  }

  /// Download file bytes from Supabase Storage
  Future<Uint8List?> downloadFileBytes(String pathOrUrl) async {
    try {
      if (!SupabaseConfig.isConfigured) return null;
      final cleanPath = extractStoragePath(pathOrUrl);
      final bytes = await _supabase.storage.from('employee-documents').download(cleanPath);
      return bytes;
    } catch (e) {
      secureLog('[Storage] downloadFileBytes error: $e');
      return null;
    }
  }

  /// Upload generic document/attachment bytes to multi-tenant Supabase Storage pool
  Future<String?> uploadDocument({
    required String tenantId,
    required String employeeId,
    required Uint8List bytes,
    required String fileName,
  }) async {
    try {
      if (!SupabaseConfig.isConfigured) return null;
      final sanitizedName = fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
      final path = 'tenants/$tenantId/services/$employeeId/${DateTime.now().millisecondsSinceEpoch}_$sanitizedName';
      try {
        await _supabase.storage.from('employee-documents').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(cacheControl: '3600', upsert: false),
        );
        final url = _supabase.storage.from('employee-documents').getPublicUrl(path);
        return url;
      } catch (e) {
        secureLog('[Storage] Document upload notice: $e');
        return 'storage://employee-documents/$path';
      }
    } catch (e) {
      secureLog('[Storage] uploadDocument error: $e');
      return null;
    }
  }

  /// Upload receipt proof (photo/PDF) to multi-tenant Supabase Storage pool
  /// with automatic quality-preserving compression for images.
  Future<String?> uploadExpenseReceipt({
    required String tenantId,
    required String employeeId,
    required Uint8List bytes,
    required String fileName,
  }) async {
    try {
      if (!SupabaseConfig.isConfigured) return null;

      // 1. Perform smart quality-preserving compression
      final compResult = await MediaCompressionService.instance.compressReceiptImage(
        inputBytes: bytes,
        fileName: fileName,
        targetQuality: 85,
        maxDimension: 1920,
      );

      final sanitizedName = fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
      final path = 'tenants/$tenantId/claims/$employeeId/${DateTime.now().millisecondsSinceEpoch}_$sanitizedName';

      try {
        await _supabase.storage.from('employee-documents').uploadBinary(
          path,
          compResult.bytes,
          fileOptions: const FileOptions(cacheControl: '3600', upsert: false),
        );
        final url = _supabase.storage.from('employee-documents').getPublicUrl(path);
        secureLog('[Storage] Uploaded receipt ($path) | ${compResult.summary}');
        return url;
      } catch (e) {
        secureLog('[Storage] Receipt upload notice: $e');
        return 'storage://employee-documents/$path';
      }
    } catch (e) {
      secureLog('[Storage] uploadExpenseReceipt error: $e');
      return null;
    }
  }

  /// Upload file binary to Supabase Storage bucket 'employee-documents'
  /// and index in 'employee_documents' table.
  Future<String?> uploadEmployeeDocument({
    required String tenantId,
    required String employeeId,
    required String docCategory, // 'KYC', 'EDUCATION', 'BANK_PROOF', 'PERSONAL'
    required File file,
    required String fileName,
    String? employeeName,
  }) async {
    try {
      if (!SupabaseConfig.isConfigured) return null;

      final sanitizedName = fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
      final path = '$tenantId/$employeeId/$docCategory/${DateTime.now().millisecondsSinceEpoch}_$sanitizedName';

      String fileUrl = '';

      // 1. Upload file binary to Supabase Storage bucket
      try {
        await _supabase.storage.from('employee-documents').upload(
          path,
          file,
          fileOptions: const FileOptions(cacheControl: '3600', upsert: false),
        );
        fileUrl = _supabase.storage.from('employee-documents').getPublicUrl(path);
        secureLog('[Storage] Uploaded document to employee-documents/$path');
      } catch (e) {
        secureLog('[Storage] Storage upload notice (bucket might be private or created with custom policies): $e');
        fileUrl = 'storage://employee-documents/$path';
      }

      final fileSize = await file.length();
      final ext = fileName.contains('.') ? fileName.split('.').last.toLowerCase() : 'pdf';
      final mimeType = ext == 'pdf'
          ? 'application/pdf'
          : (ext == 'png'
              ? 'image/png'
              : (ext == 'jpg' || ext == 'jpeg' ? 'image/jpeg' : 'application/octet-stream'));

      // 2. Index record in employee_documents table
      final docId = 'doc-${DateTime.now().millisecondsSinceEpoch}';
      try {
        await _supabase.from('employee_documents').insert({
          'id': docId,
          'tenant_id': tenantId,
          'organization_id': tenantId,
          'employee_id': employeeId,
          'document_category': docCategory,
          'document_type': fileName,
          'file_name': fileName,
          'file_path': path,
          'file_url': fileUrl,
          'storage_path': path,
          'storage_bucket': 'employee-documents',
          'mime_type': mimeType,
          'file_size_bytes': fileSize,
          'verification_status': 'PENDING',
          'status': 'ACTIVE',
          'uploaded_by': employeeName ?? employeeId,
          'uploaded_at': DateTime.now().toIso8601String(),
        });
        secureLog('[Storage] Indexed record in employee_documents');
      } catch (e) {
        secureLog('[Storage] employee_documents table insert notice: $e');
      }

      // 3. Index record in documents table
      try {
        await _supabase.from('documents').insert({
          'id': docId,
          'tenant_id': tenantId,
          'organization_id': tenantId,
          'subject_type': 'EMPLOYEE',
          'subject_id': employeeId,
          'subject_name': employeeName ?? 'Employee',
          'document_type_code': docCategory.toUpperCase(),
          'category_code': docCategory.toUpperCase(),
          'title': fileName,
          'file_name': fileName,
          'file_path': path,
          'file_url': fileUrl,
          'storage_path': path,
          'bucket_id': 'employee-documents',
          'size_bytes': fileSize,
          'mime_type': mimeType,
          'classification': 'CONFIDENTIAL',
          'status': 'ACTIVE',
          'verification_status': 'PENDING',
          'created_by': employeeName ?? 'Employee',
          'created_at': DateTime.now().toIso8601String(),
        });
        secureLog('[Storage] Indexed record in documents table');
      } catch (e) {
        secureLog('[Storage] documents table insert notice: $e');
      }

      return fileUrl.isNotEmpty ? fileUrl : path;
    } catch (e) {
      secureLog('[Storage] uploadEmployeeDocument error: $e');
      return null;
    }
  }
}
