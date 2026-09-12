// src/services/biometric/recommendation/connectionRecommendationEngine.ts
// ============================================================================
// Joy PeopleHR — Biometric Connection Recommendation Engine
// Intelligent Topology & Protocol Matching for Non-Technical HR Users
// ============================================================================

import {
  BiometricVendor,
  CommunicationMode,
  AdapterCapabilities,
} from '../adapters/deviceAdapter';
import { lookupDeviceProfile } from '../catalog/deviceCompatibilityCatalog';

export interface ConnectionRecommendation {
  vendor: BiometricVendor;
  model: string;
  recommended_mode: CommunicationMode;
  mode_title: string;
  recommended_port: number;
  reason: string;
  alternative_modes: Array<{
    mode: CommunicationMode;
    mode_title: string;
    description: string;
  }>;
  topology_summary: string;
  firewall_instruction: string;
  capabilities: AdapterCapabilities;
}

export function recommendDeviceConnection(
  vendor: BiometricVendor,
  model?: string,
  networkType: 'LAN' | 'WIFI' = 'LAN'
): ConnectionRecommendation {
  const profile = lookupDeviceProfile(vendor, model);
  const caps = profile.capabilities;

  let mode: CommunicationMode = profile.recommended_mode;
  let modeTitle = 'PUSH via Local Connector (Recommended)';
  let reason = 'Device firmware supports real-time event streaming. Events arrive instantly without polling.';
  let topologySummary = `${networkType} Terminal → JOY PeopleHR Local Connector → Outbound Secure HTTPS → Cloud`;

  if (profile.recommended_mode === 'PUSH_ADMS') {
    modeTitle = 'ADMS Real-Time Push via Local Connector';
    reason = 'Visible light terminal supports ZKTeco/ADMS push protocol. Eliminates periodic socket polling latency.';
  } else if (profile.recommended_mode === 'EPUSH_SERVER') {
    modeTitle = 'ePush Server Streaming';
    reason = 'eSSL device supports ePush streaming to local connector service. Delivers zero-latency punch ingestion.';
  } else if (profile.recommended_mode === 'HTTP_REST') {
    modeTitle = 'Local HTTP/REST Webhook';
    reason = 'Terminal exposes direct REST API on customer local network. Highly reliable on Wi-Fi and LAN.';
  } else if (profile.recommended_mode === 'TCP_IP') {
    modeTitle = 'Local TCP/IP Port Connection';
    reason = 'Standard hardware TCP protocol (Port 4370). Local connector establishes a persistent, reliable connection.';
  }

  // Alternatives
  const alternatives: ConnectionRecommendation['alternative_modes'] = [];

  if (caps.supports_tcp && mode !== 'TCP_IP') {
    alternatives.push({
      mode: 'TCP_IP',
      mode_title: 'Direct Local TCP Socket',
      description: 'Connector directly probes terminal IP on Port 4370 at regular intervals.',
    });
  }

  if (caps.supports_push && mode !== 'PUSH_ADMS' && mode !== 'EPUSH_SERVER') {
    alternatives.push({
      mode: 'PUSH_ADMS',
      mode_title: 'ADMS Push Protocol',
      description: 'Device initiates push packets to local connector listening on local network.',
    });
  }

  if (caps.supports_http && mode !== 'HTTP_REST') {
    alternatives.push({
      mode: 'HTTP_REST',
      mode_title: 'HTTP REST / JSON',
      description: 'Standard HTTP communication through connector proxy.',
    });
  }

  const firewallInstruction =
    'No router port forwarding is needed. Outbound internet access from the connector PC/server to JOY PeopleHR Cloud is all that is required.';

  return {
    vendor: profile.vendor,
    model: profile.model,
    recommended_mode: mode,
    mode_title: modeTitle,
    recommended_port: profile.default_port,
    reason,
    alternative_modes: alternatives,
    topology_summary: topologySummary,
    firewall_instruction: firewallInstruction,
    capabilities: caps,
  };
}
