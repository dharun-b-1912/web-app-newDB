// src/features/people/idcard/components/IdCardSaveTemplateModal.tsx
// ============================================================================
// Joy PeopleHR ID Card Studio — Reusable Custom Template Saver
// ============================================================================

import React, { useState } from 'react';
import { X, Save, Sparkles, LayoutTemplate } from 'lucide-react';
import { CardGeometry, CardSideData } from '../idCardTypes';

interface IdCardSaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  geometry: CardGeometry;
  frontSide: CardSideData;
  backSide: CardSideData;
  onSaveSuccess: (templateName: string) => void;
}

export const IdCardSaveTemplateModal: React.FC<IdCardSaveTemplateModalProps> = ({
  isOpen,
  onClose,
  geometry,
  frontSide,
  backSide,
  onSaveSuccess,
}) => {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    // Save to localStorage custom templates
    try {
      const stored = localStorage.getItem('joy_id_card_custom_templates');
      const templates = stored ? JSON.parse(stored) : [];
      const newTemplate = {
        id: `custom_${Date.now()}`,
        name: templateName.trim(),
        description: description.trim(),
        orientation: geometry.orientation,
        geometry,
        front: frontSide,
        back: backSide,
        isDefault,
        createdAt: new Date().toISOString(),
      };
      templates.push(newTemplate);
      localStorage.setItem('joy_id_card_custom_templates', JSON.stringify(templates));
      onSaveSuccess(templateName.trim());
      onClose();
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-[#13171c] border border-[#252d37] rounded-2xl shadow-2xl flex flex-col text-[#e6eaee] overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-[#252d37] px-6 flex items-center justify-between shrink-0 bg-[#181d24]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/70 border border-blue-600/50 flex items-center justify-center text-blue-400">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Save Custom Template</h3>
              <p className="text-[11px] text-gray-400">Save layout, layers & styling for workforce re-use</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#111418] hover:bg-[#252d37] border border-[#2c3642] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">
              Template Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. JOY Corporate 2026 Executive Pass"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full bg-[#181d24] border border-[#27313d] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1 font-bold uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Official portrait badge with corporate logo & QR token"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#181d24] border border-[#27313d] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="p-3 bg-[#181d24] rounded-xl border border-[#27313d] flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-200">Organization Default</div>
              <div className="text-[10px] text-gray-400">Apply automatically to new employee card issuances</div>
            </div>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="rounded border-[#2d3744] text-blue-600 focus:ring-0"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1c2229] hover:bg-[#28323c] border border-[#2c3642] text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!templateName.trim()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Template</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
