// src/services/biometric/adapters/deviceAdapterFactory.ts
// ============================================================================
// Joy PeopleHR — Device Adapter Factory & Multi-Vendor Protocol Router
// Resolves, Instantiates & Dispatches Commands to Certified Biometric Adapters
// ============================================================================

import {
  DeviceAdapter,
  BiometricVendor,
  AdapterCapabilities,
  DiscoveredDeviceCandidate,
} from './deviceAdapter';
import { ZKTecoAdapter } from './zktecoAdapter';
import { ESSLAdapter } from './esslAdapter';
import { MantraAdapter } from './mantraAdapter';
import { MatrixAdapter } from './matrixAdapter';
import { GenericTcpAdapter, GenericHttpAdapter } from './genericAdapters';
import { lookupDeviceProfile } from '../catalog/deviceCompatibilityCatalog';

import { AiFaceMagnumAdapter } from './aifaceMagnumAdapter';

export class DeviceAdapterFactory {
  private static adapterCache = new Map<string, DeviceAdapter>();

  /**
   * Retrieves an adapter instance for a given vendor and optional model.
   * Caches instances for efficient reuse.
   */
  static getAdapter(vendor: BiometricVendor, model?: string): DeviceAdapter {
    const isAiFaceMagnum = vendor === 'eSSL' && model && model.toLowerCase().includes('aiface');
    const key = isAiFaceMagnum ? 'ESSL_AIFACE_MAGNUM' : vendor.toUpperCase();
    
    if (this.adapterCache.has(key)) {
      return this.adapterCache.get(key)!;
    }

    let adapter: DeviceAdapter;
    if (isAiFaceMagnum) {
      adapter = new AiFaceMagnumAdapter();
    } else {
      switch (vendor) {
        case 'ZKTeco':
          adapter = new ZKTecoAdapter();
          break;
        case 'eSSL':
          adapter = new ESSLAdapter();
          break;
        case 'Mantra':
          adapter = new MantraAdapter();
          break;
        case 'Matrix':
          adapter = new MatrixAdapter();
          break;
        case 'Generic':
        default:
          adapter = new GenericTcpAdapter();
          break;
      }
    }

    this.adapterCache.set(key, adapter);
    return adapter;
  }

  /**
   * Resolves capabilities for a vendor and optional model code.
   */
  static getCapabilities(vendor: BiometricVendor, model?: string): AdapterCapabilities {
    const profile = lookupDeviceProfile(vendor, model);
    return profile.capabilities;
  }

  /**
   * Aggregates device candidates across all registered vendor adapters for a given subnet.
   */
  static async discoverAcrossAllVendors(subnet = '192.168.1.0/24'): Promise<DiscoveredDeviceCandidate[]> {
    const vendors: BiometricVendor[] = ['ZKTeco', 'eSSL', 'Mantra', 'Matrix'];
    const results: DiscoveredDeviceCandidate[] = [];

    for (const v of vendors) {
      try {
        const adapter = this.getAdapter(v);
        const candidates = await adapter.discover(subnet);
        results.push(...candidates);
      } catch (err) {
        console.warn(`[DeviceAdapterFactory] Error discovering ${v} candidates:`, err);
      }
    }

    return results;
  }
}
