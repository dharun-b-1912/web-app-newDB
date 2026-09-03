-- ============================================================================
-- Joy PeopleHR — Gate B13: Biometric Template Vault Integrity Validation SQL
-- ============================================================================

-- 1. Confirm ZERO plaintext biometric templates in general document tables
SELECT COUNT(*) AS plaintext_leakage_count
FROM public.employee_documents_master
WHERE document_type ILIKE '%biometric%' OR document_type ILIKE '%template%';

-- 2. Confirm strict uniqueness of biometric template backups
SELECT organization_id, employee_id, device_id, template_type, template_version, COUNT(*)
FROM public.biometric_template_backups
GROUP BY organization_id, employee_id, device_id, template_type, template_version
HAVING COUNT(*) > 1;

-- 3. Confirm all active template backups possess valid AES-256-GCM envelope attributes
SELECT id, organization_id, employee_id, encryption_algorithm, key_version, backup_status
FROM public.biometric_template_backups
WHERE encryption_algorithm != 'AES-256-GCM' OR encrypted_dek IS NULL OR auth_tag IS NULL;
