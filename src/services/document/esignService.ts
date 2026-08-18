import {
  EsignRequest,
  EsignParticipant,
  EsignRequestStatus,
  EsignParticipantRole,
} from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { documentAuditService } from './documentAuditService';

const ESIGN_REQUESTS_KEY = 'workforce_esign_requests_v2';
const ESIGN_PARTICIPANTS_KEY = 'workforce_esign_participants_v2';

class EsignService {
  private getRequests(): EsignRequest[] {
    try {
      const data = localStorage.getItem(ESIGN_REQUESTS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setRequests(reqs: EsignRequest[]): void {
    try {
      localStorage.setItem(ESIGN_REQUESTS_KEY, JSON.stringify(reqs));
    } catch (e) {
      console.warn('[EsignService] Failed to persist esign requests:', e);
    }
  }

  private getParticipants(): EsignParticipant[] {
    try {
      const data = localStorage.getItem(ESIGN_PARTICIPANTS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setParticipants(ptps: EsignParticipant[]): void {
    try {
      localStorage.setItem(ESIGN_PARTICIPANTS_KEY, JSON.stringify(ptps));
    } catch (e) {
      console.warn('[EsignService] Failed to persist esign participants:', e);
    }
  }

  // Create an e-sign request with multi-party signers
  createEsignRequest(params: {
    documentId: string;
    documentVersionId?: string;
    title: string;
    message?: string;
    signingMode?: 'SEQUENTIAL' | 'PARALLEL';
    expiresInDays?: number;
    participants: Array<{
      name: string;
      email: string;
      role: EsignParticipantRole;
      sequenceOrder?: number;
    }>;
  }): EsignRequest {
    const currentUser = api.getCurrentUser();
    const now = new Date();
    const reqId = `esgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = params.expiresInDays
      ? new Date(now.getTime() + params.expiresInDays * 86400000).toISOString()
      : new Date(now.getTime() + 14 * 86400000).toISOString(); // 14 days default

    const newReq: EsignRequest = {
      id: reqId,
      tenant_id: currentUser.organization_id || 'org-joy-01',
      document_id: params.documentId,
      document_version_id: params.documentVersionId,
      title: params.title,
      message: params.message,
      status: 'Sent',
      signing_mode: params.signingMode || 'SEQUENTIAL',
      expires_at: expiresAt,
      initiator_id: currentUser.id || (currentUser as any).employee_id || 'user-admin-01',
      initiator_name: currentUser.name || 'Dharun Joy',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const newParticipants: EsignParticipant[] = params.participants.map((p, idx) => ({
      id: `esgn-ptp-${Date.now()}-${idx}`,
      esign_request_id: reqId,
      name: p.name,
      email: p.email,
      role: p.role,
      sequence_order: p.sequenceOrder !== undefined ? p.sequenceOrder : idx + 1,
      status: idx === 0 || params.signingMode === 'PARALLEL' ? 'SENT' : 'PENDING',
      authentication_method: 'EMAIL_OTP',
      created_at: now.toISOString(),
    }));

    const reqs = this.getRequests();
    reqs.unshift(newReq);
    this.setRequests(reqs);

    const ptps = this.getParticipants();
    this.setParticipants([...newParticipants, ...ptps]);

    documentAuditService.recordLog({
      documentId: params.documentId,
      action: 'SIGN',
      details: {
        esignRequestId: reqId,
        title: params.title,
        participantsCount: newParticipants.length,
        signingMode: newReq.signing_mode,
      },
    });

    hrEventBus.publish('esign.created', {
      esignRequestId: reqId,
      documentId: params.documentId,
      title: params.title,
    });

    return { ...newReq, participants: newParticipants };
  }

  // Record a signature from a participant
  signDocument(params: {
    esignRequestId: string;
    participantId: string;
    signatureDataUrl?: string;
  }): { request: EsignRequest; participant: EsignParticipant } {
    const reqs = this.getRequests();
    const reqIdx = reqs.findIndex(r => r.id === params.esignRequestId);
    if (reqIdx === -1) throw new Error('E-Sign request not found.');

    const ptps = this.getParticipants();
    const ptpIdx = ptps.findIndex(p => p.id === params.participantId);
    if (ptpIdx === -1) throw new Error('Signer participant not found.');

    const now = new Date().toISOString();
    const sigHash = `sig_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;

    ptps[ptpIdx].status = 'SIGNED';
    ptps[ptpIdx].signed_at = now;
    ptps[ptpIdx].signature_hash = sigHash;
    ptps[ptpIdx].ip_address = '127.0.0.1';
    this.setParticipants(ptps);

    // Check remaining participants
    const reqParticipants = ptps.filter(p => p.esign_request_id === params.esignRequestId);
    const signers = reqParticipants.filter(p => p.role === 'SIGNER');
    const allSignersDone = signers.every(p => p.status === 'SIGNED');

    if (allSignersDone) {
      reqs[reqIdx].status = 'Completed';
      reqs[reqIdx].completed_at = now;
    } else {
      reqs[reqIdx].status = 'Partially Signed';
      // If sequential, advance next signer
      if (reqs[reqIdx].signing_mode === 'SEQUENTIAL') {
        const nextPending = reqParticipants
          .filter(p => p.status === 'PENDING')
          .sort((a, b) => a.sequence_order - b.sequence_order)[0];
        if (nextPending) {
          nextPending.status = 'SENT';
          this.setParticipants(ptps);
        }
      }
    }

    reqs[reqIdx].updated_at = now;
    this.setRequests(reqs);

    documentAuditService.recordLog({
      documentId: reqs[reqIdx].document_id,
      action: 'SIGN',
      details: {
        esignRequestId: reqs[reqIdx].id,
        signerName: ptps[ptpIdx].name,
        signerEmail: ptps[ptpIdx].email,
        signatureHash: sigHash,
        isCompleted: allSignersDone,
      },
    });

    hrEventBus.publish('esign.signed', {
      esignRequestId: reqs[reqIdx].id,
      documentId: reqs[reqIdx].document_id,
      signer: ptps[ptpIdx].name,
      isCompleted: allSignersDone,
    });

    return { request: reqs[reqIdx], participant: ptps[ptpIdx] };
  }

  // Get all e-sign requests with participants
  getEsignRequests(documentId?: string): EsignRequest[] {
    const reqs = this.getRequests();
    const ptps = this.getParticipants();

    return reqs
      .filter(r => (documentId ? r.document_id === documentId : true))
      .map(r => ({
        ...r,
        participants: ptps.filter(p => p.esign_request_id === r.id),
      }));
  }
}

export const esignService = new EsignService();
