import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { assetAssignmentService } from '../../../services/asset/assetAssignmentService';
import { api } from '../../../services/api';
import {
  UniversalAsset,
  AssignmentTargetType,
  AssetCondition,
  Employee,
} from '../../../types';
import { UserCheck, Building, Truck, ShieldAlert, CheckCircle2, User } from 'lucide-react';

interface AssignAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: UniversalAsset | null;
}

export const AssignAssetModal: React.FC<AssignAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  asset,
}) => {
  const { showToast } = useToast();

  const [targetType, setTargetType] = useState<AssignmentTargetType>('EMPLOYEE');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [targetName, setTargetName] = useState<string>('');
  const [conditionAtAssign, setConditionAtAssign] = useState<AssetCondition>('GOOD');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const fetchEmps = async () => {
        try {
          const emps = await api.getEmployees();
          setEmployees(Array.isArray(emps) ? emps : []);
          if (emps.length > 0) {
            setSelectedTargetId(emps[0].id);
            setTargetName(`${emps[0].first_name} ${emps[0].last_name}`);
          }
        } catch {
          setEmployees([]);
        }
      };
      fetchEmps();
      if (asset) setConditionAtAssign(asset.condition || 'GOOD');
    }
  }, [isOpen, asset]);

  if (!asset) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTargetName = targetType === 'EMPLOYEE' ? targetName : targetName.trim();
    if (!finalTargetName) {
      showToast('Please specify the recipient / assignment target name.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      assetAssignmentService.assignAsset({
        assetId: asset.id,
        targetType,
        targetId: selectedTargetId || `tgt-${Date.now()}`,
        targetName: finalTargetName,
        conditionAtAssign,
        expectedReturnDate: expectedReturnDate || undefined,
        purpose,
        notes,
      });

      showToast(`Asset assigned to ${finalTargetName} (${targetType}).`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign asset.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Asset: ${asset.asset_name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between">
          <div>
            <span className="text-gray-400 block font-medium">Asset Code & Serial</span>
            <span className="font-extrabold text-gray-900 font-mono">{asset.asset_code} • {asset.serial_number || 'N/A'}</span>
          </div>
          <Badge variant="blue">{asset.asset_type_code}</Badge>
        </div>

        {/* Target Type */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Assignment Target Type *
          </label>
          <select
            value={targetType}
            onChange={e => {
              const val = e.target.value as AssignmentTargetType;
              setTargetType(val);
              if (val === 'DEPARTMENT') setTargetName('Engineering & DevOps');
              else if (val === 'SITE') setTargetName('Coimbatore Plant - Zone B');
              else if (val === 'PROJECT') setTargetName('Project Falcon (Client Deployment)');
              else if (val === 'VEHICLE') setTargetName('Transport Fleet Van 04');
            }}
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          >
            <option value="EMPLOYEE">Direct Employee</option>
            <option value="DEPARTMENT">Department / Team</option>
            <option value="PROJECT">Project / Client Engagement</option>
            <option value="SITE">Factory / Construction Site</option>
            <option value="VEHICLE">Fleet Vehicle / Mobile Unit</option>
            <option value="VENDOR_WORKER">Vendor / Contract Workforce</option>
          </select>
        </div>

        {/* Target Selector / Input */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Recipient / Target Entity *
          </label>
          {targetType === 'EMPLOYEE' ? (
            <select
              value={selectedTargetId}
              onChange={e => {
                setSelectedTargetId(e.target.value);
                const found = employees.find(emp => emp.id === e.target.value);
                if (found) setTargetName(`${found.first_name} ${found.last_name}`);
              }}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code || emp.id})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              required
              value={targetName}
              onChange={e => setTargetName(e.target.value)}
              placeholder="e.g. Coimbatore Factory Line 3 or Project Titan"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          )}
        </div>

        {/* Condition & Return Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Condition at Handover
            </label>
            <select
              value={conditionAtAssign}
              onChange={e => setConditionAtAssign(e.target.value as AssetCondition)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="NEW">Brand New</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good / Tested</option>
              <option value="FAIR">Fair</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Expected Return Date
            </label>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={e => setExpectedReturnDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Assignment Purpose / Notes
          </label>
          <input
            type="text"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            placeholder="e.g. Primary developer workstation or Site operational gear"
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
          >
            {isSubmitting ? 'Assigning...' : 'Confirm Asset Handover'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
