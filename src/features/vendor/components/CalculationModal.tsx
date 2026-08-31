import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Calculator, CheckCircle2 } from 'lucide-react';

interface CalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category: string;
  formula: string;
  inputs: { label: string; value: string | number; source?: string }[];
  result: string | number;
  explanation: string;
}

export const CalculationModal: React.FC<CalculationModalProps> = ({
  isOpen,
  onClose,
  title,
  category,
  formula,
  inputs,
  result,
  explanation,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How This Was Calculated" maxWidth="lg">
      <div className="space-y-5 p-1">
        {/* Header summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">{title}</h3>
              <Badge variant="blue" size="sm">
                {category}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mt-1">{explanation}</p>
          </div>
        </div>

        {/* Mathematical Formula */}
        <div className="bg-gray-900 text-gray-100 rounded-xl p-4 font-mono text-xs border border-gray-800 shadow-inner">
          <div className="text-gray-400 uppercase tracking-wider text-[10px] font-sans font-semibold mb-1">
            Standard Statutory / Contractual Formula
          </div>
          <div className="text-emerald-400 font-semibold text-sm leading-relaxed">{formula}</div>
        </div>

        {/* Inputs and Data Sources */}
        <div>
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Applied Input Parameters & Data Sources
          </h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
            {inputs.map((inp, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <div>
                  <span className="font-medium text-gray-800">{inp.label}</span>
                  {inp.source && <span className="block text-[11px] text-gray-400">Source: {inp.source}</span>}
                </div>
                <span className="font-semibold text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                  {typeof inp.value === 'number' ? `₹${inp.value.toLocaleString()}` : inp.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Final Result Card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-xs font-semibold text-emerald-900 block">Computed Final Value</span>
              <span className="text-[11px] text-emerald-700">Validated against client contract rules</span>
            </div>
          </div>
          <span className="text-xl font-bold text-emerald-800 font-mono">
            {typeof result === 'number' ? `₹${result.toLocaleString()}` : result}
          </span>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Breakdown
          </Button>
        </div>
      </div>
    </Modal>
  );
};
