// src/components/shell/CompanyLocationEditModal.tsx
// ============================================================================
// Joy PeopleHR — Company & Legal Entity Location Control Modal
// Live Geolocation, Google Maps Search & Multi-Tenant Database Sync
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useTenant } from '../../hooks/useTenant';
import { useToast } from '../../components/ui/Toast';
import { geocodingService, GeocodeSearchResult } from '../../services/location/geocodingService';
import { organizationStructureService } from '../../services/organization/organizationStructureService';
import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { isValidUUID } from '../../services/api';
import { OrganizationContextService } from '../../services/organizationContextService';
import {
  MapPin,
  Crosshair,
  Search,
  Globe,
  Building2,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export interface CompanyLocationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: any;
}

export const CompanyLocationEditModal: React.FC<CompanyLocationEditModalProps> = ({
  isOpen,
  onClose,
  company,
}) => {
  const { activeCompany, organization, reloadTenant } = useTenant();
  const { showToast } = useToast();

  const targetCompany = company || activeCompany;

  const [city, setCity] = useState(targetCompany?.city || 'Coimbatore');
  const [state, setState] = useState(targetCompany?.state || 'Tamil Nadu');
  const [country, setCountry] = useState(targetCompany?.country || 'India');
  const [address, setAddress] = useState(targetCompany?.address || targetCompany?.registered_address || 'Coimbatore, Tamil Nadu, India');
  const [postalCode, setPostalCode] = useState(targetCompany?.postal_code || '641014');
  const [latitude, setLatitude] = useState<number>(targetCompany?.latitude || 11.0168);
  const [longitude, setLongitude] = useState<number>(targetCompany?.longitude || 76.9558);

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronize initial state when modal opens or targetCompany changes
  React.useEffect(() => {
    const current = company || activeCompany;
    if (current) {
      setCity(current.city || 'Coimbatore');
      setState(current.state || 'Tamil Nadu');
      setCountry(current.country || 'India');
      setAddress(current.address || current.registered_address || `${current.city || 'Coimbatore'}, ${current.country || 'India'}`);
      setPostalCode(current.postal_code || '641014');
      if (current.latitude) setLatitude(Number(current.latitude));
      if (current.longitude) setLongitude(Number(current.longitude));
    }
  }, [company, activeCompany, isOpen]);

  const handleDetectGps = async () => {
    setIsDetectingGps(true);
    try {
      const loc = await geocodingService.detectLiveLocation();
      setCity(loc.city);
      setState(loc.state);
      setCountry(loc.country);
      if (loc.postal_code) setPostalCode(loc.postal_code);
      setAddress(loc.formatted_address);
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      showToast(`Detected live location: ${loc.city}, ${loc.country}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Unable to access live GPS location', 'error');
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await geocodingService.searchAddress(searchQuery);
      setSearchResults(res);
      if (res.length === 0) {
        showToast('No matching locations found', 'info');
      }
    } catch {
      showToast('Search error', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: GeocodeSearchResult) => {
    setCity(result.city);
    setState(result.state || 'Tamil Nadu');
    setCountry(result.country || 'India');
    if (result.postal_code) setPostalCode(result.postal_code);
    setAddress(result.display_name);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setSearchResults([]);
    setSearchQuery('');
    showToast(`Location set to ${result.city}`, 'success');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const current = company || activeCompany;
      const entityId = current?.id;
      const orgId = organization?.id || current?.organization_id;

      if (!entityId) {
        throw new Error('No company entity found to update.');
      }

      const trimmedCity = (city || '').trim();
      const trimmedState = (state || '').trim();
      const trimmedCountry = (country || '').trim();
      const trimmedAddress = (address || '').trim();
      const trimmedPostalCode = (postalCode || '').trim();

      // 1. Direct Multi-Tenant Persistence in Supabase `companies` table
      if (isSupabaseEnabled && supabase && isValidUUID(entityId)) {
        const dbCompanyUpdates: Record<string, any> = {
          city: trimmedCity,
          state: trimmedState,
          country: trimmedCountry,
          postal_code: trimmedPostalCode,
          registered_address: trimmedAddress,
          updated_at: new Date().toISOString(),
        };

        const { error: compError } = await supabase
          .from('companies')
          .update(dbCompanyUpdates)
          .eq('id', entityId);

        if (compError) {
          console.error('[CompanyLocationEditModal] Supabase companies update error:', compError);
          throw new Error(compError.message || 'Failed to update company location in database');
        }
      }

      // 2. Direct Update to Supabase `organizations` table for tenant alignment
      if (isSupabaseEnabled && supabase && orgId && isValidUUID(orgId) && orgId !== 'platform-root') {
        const dbOrgUpdates: Record<string, any> = {
          registered_address: trimmedAddress,
          country: trimmedCountry,
          updated_at: new Date().toISOString(),
        };
        const { error: orgError } = await supabase
          .from('organizations')
          .update(dbOrgUpdates)
          .eq('id', orgId);

        if (orgError) {
          console.warn('[CompanyLocationEditModal] Supabase organizations update notice:', orgError);
        }

        // Also update primary work location geofence coordinates if present
        try {
          const { data: locs } = await supabase
            .from('work_locations')
            .select('id')
            .eq('organization_id', orgId)
            .limit(1);

          if (locs && locs.length > 0) {
            await supabase
              .from('work_locations')
              .update({
                latitude,
                longitude,
                address_line1: trimmedAddress,
                updated_at: new Date().toISOString(),
              })
              .eq('id', locs[0].id);
          }
        } catch (locErr) {
          console.warn('[CompanyLocationEditModal] work_locations coordinate update notice:', locErr);
        }
      }

      // 3. Update localStorage cache optimistically
      const updatedCompanyData = {
        ...current,
        city: trimmedCity,
        state: trimmedState,
        country: trimmedCountry,
        address: trimmedAddress,
        registered_address: trimmedAddress,
        postal_code: trimmedPostalCode,
        latitude,
        longitude,
      };

      try {
        const comps = JSON.parse(localStorage.getItem('workforce_companies') || '[]');
        const idx = comps.findIndex((c: any) => c.id === entityId);
        if (idx >= 0) {
          comps[idx] = { ...comps[idx], ...updatedCompanyData };
        } else {
          comps.push(updatedCompanyData);
        }
        localStorage.setItem('workforce_companies', JSON.stringify(comps));
        if (activeCompany?.id === entityId) {
          localStorage.setItem('workforce_active_company', JSON.stringify(updatedCompanyData));
        }
      } catch (_) {}

      // 4. Invalidate context memory cache so reloadTenant pulls fresh database records
      OrganizationContextService.clearCache();

      // 5. Notify the rest of the application
      window.dispatchEvent(new CustomEvent('organization:context_updated'));

      // 6. Reload tenant context from database
      await reloadTenant();

      showToast(`Company location updated to ${trimmedCity}, ${trimmedCountry}!`, 'success');
      onClose();
    } catch (err: any) {
      console.error('[CompanyLocationEditModal] handleSave error:', err);
      showToast(err.message || 'Error updating location', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Headquarters & Live Location"
      description="Update verified physical headquarters, GPS coordinates, and Google Maps pin"
    >
      <form onSubmit={handleSave} className="p-6 space-y-4">
        {/* Quick GPS & Map Detection Actions */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[#07563D] flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-emerald-700" />
              <span>Live Geolocation & Google Maps</span>
            </div>
            <p className="text-[11px] text-emerald-900/70 mt-0.5">
              Auto-fill accurate city and address from browser GPS or Google Maps.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDetectGps}
            disabled={isDetectingGps}
            className="text-xs font-bold gap-1.5 bg-white border-emerald-300 text-[#07563D] hover:bg-emerald-100/60 shadow-2xs whitespace-nowrap shrink-0"
          >
            {isDetectingGps ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-emerald-700" />
            )}
            {isDetectingGps ? 'Detecting Live GPS...' : 'Detect Live Location'}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-700">Search Address / Landmark</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Joy Corporate Solutions, Coimbatore or Gandhipuram..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchAddress();
                  }
                }}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSearchAddress}
              disabled={isSearching || !searchQuery.trim()}
              className="text-xs shrink-0"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 p-2 bg-white rounded-xl border border-gray-200 shadow-lg space-y-1 max-h-40 overflow-y-auto z-10">
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 text-xs text-gray-800 transition-colors flex items-start gap-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#07563D] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-gray-900">{res.city}, {res.country}</div>
                    <div className="text-[10px] text-gray-500 line-clamp-1">{res.display_name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Structured Location Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">HQ City</label>
            <input
              type="text"
              placeholder="e.g. Coimbatore"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">State / Region</label>
            <input
              type="text"
              placeholder="e.g. Tamil Nadu"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
            <input
              type="text"
              placeholder="e.g. India"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Postal Code (PIN)</label>
            <input
              type="text"
              placeholder="e.g. 641014"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D] font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Full Street Address</label>
          <input
            type="text"
            placeholder="e.g. Joy Corporate Solutions Pvt Ltd, Coimbatore, Tamil Nadu, India"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
          />
        </div>

        {/* Map Preview Link & Coordinates */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#07563D]" />
            <span className="font-mono text-[11px] text-gray-600">
              Coordinates: {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
            </span>
          </div>

          <a
            href={geocodingService.getGoogleMapsUrl(latitude, longitude, `${city}, ${country}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-[#07563D] hover:underline flex items-center gap-1"
          >
            <span>Open Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="bg-[#07563D] hover:bg-[#0b7a57] text-white font-bold"
          >
            {isSaving ? 'Updating...' : 'Save Company Location'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
