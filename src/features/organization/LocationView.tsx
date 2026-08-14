import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { MapPin, Plus, Building, Globe, Compass, Clock } from 'lucide-react';
import { Branch } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

export const LocationView: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    api.getBranches().then(setBranches);
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Organization', href: '#' },
          { label: 'Work Locations & Campuses' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Work Locations & Campuses</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Geographic office campuses, work location codes, timezones, and address records.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {branches.map(branch => (
          <Card key={branch.id} className="p-5 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5" />
              </div>
              <Badge variant="emerald">{branch.code}</Badge>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-gray-900">{branch.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {branch.city}, {branch.state}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <span>Country: India</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Timezone: {branch.timezone}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
