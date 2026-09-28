// src/features/clientBilling/components/ExcelTemplateMapperView.tsx
// ============================================================================
// JOY PeopleHR — Legacy Excel Template Mapper & Multi-Sheet Inspector
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ExcelTemplateDefinition,
  ExcelSheetDefinition,
} from '../../../types/clientBilling';
import { ExcelTemplateMapperService } from '../../../services/clientBilling/excelTemplateMapperService';
import {
  FileSpreadsheet,
  Layers,
  Sparkles,
  CheckCircle2,
  Table,
  Plus,
  Eye,
  Send,
  Upload,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ExcelTemplateMapperViewProps {
  clientId: string;
  contractId: string;
}

export const ExcelTemplateMapperView: React.FC<ExcelTemplateMapperViewProps> = () => {
  const [templates, setTemplates] = useState<ExcelTemplateDefinition[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const list = ExcelTemplateMapperService.getTemplates();
    setTemplates(list);
    if (list.length > 0) {
      setSelectedTemplateId(list[0].id);
    }
  }, []);

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const currentSheet = currentTemplate?.sheets[selectedSheetIndex] || currentTemplate?.sheets[0];

  const handlePublish = () => {
    if (!currentTemplate) return;
    const published = ExcelTemplateMapperService.publishTemplate(
      currentTemplate.id,
      'HR Operations Head'
    );
    setTemplates((prev) => prev.map((t) => (t.id === published.id ? published : t)));
    setPublishSuccessMessage(`Template ${published.template_code} (v${published.version}) successfully published for production billing!`);
    setTimeout(() => setPublishSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#047857] text-xs font-bold uppercase tracking-wider">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#047857]" />
            <span>Legacy Excel Template &amp; Workbook Mapper</span>
          </div>
          <h2 className="text-xl font-black text-gray-900 mt-1">{currentTemplate?.template_name || 'Excel Mapper'}</h2>
          <p className="text-xs text-gray-500">
            Version {currentTemplate?.version} • Status: <span className="font-bold text-emerald-700">{currentTemplate?.status}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePublish}
            className="px-4 py-2 rounded-xl bg-[#047857] hover:bg-emerald-800 font-bold text-xs text-white shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Publish Version {currentTemplate ? currentTemplate.version + 1 : 1}</span>
          </button>
        </div>
      </div>

      {publishSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{publishSuccessMessage}</span>
        </div>
      )}

      {/* Sheet Tabs Selector */}
      {currentTemplate && (
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 pl-2">Workbook Sheets:</span>
            {currentTemplate.sheets.map((s, idx) => (
              <button
                key={s.sheet_id}
                onClick={() => setSelectedSheetIndex(idx)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                  selectedSheetIndex === idx
                    ? "bg-[#047857] text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
                )}
              >
                <Table className="w-3.5 h-3.5" />
                <span>{s.sheet_name}</span>
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 font-medium pr-2">
            {currentSheet?.columns.length || 0} columns mapped
          </div>
        </div>
      )}

      {/* Sheet Columns Matrix & Preview */}
      {currentSheet && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-black text-gray-900">{currentSheet.title_header}</h3>
              <p className="text-[11px] text-gray-500">Sheet Type: {currentSheet.sheet_type}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200">
              Columns A → {String.fromCharCode(64 + currentSheet.columns.length)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-200">
                  <th className="py-2.5 px-3">Column</th>
                  <th className="py-2.5 px-3">Header Label</th>
                  <th className="py-2.5 px-3">Data Source Path / Formula</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3 text-center">Width</th>
                  <th className="py-2.5 px-3 text-right">Totals Formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentSheet.columns.map((col) => (
                  <tr key={col.column_key} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#047857]">
                      [{col.column_key}]
                    </td>
                    <td className="py-3 px-3 font-bold text-gray-900">
                      {col.header_label}
                    </td>
                    <td className="py-3 px-3">
                      {col.formula_expression ? (
                        <span className="font-mono text-purple-700 font-bold text-[11px] bg-purple-50 px-2 py-0.5 rounded">
                          fx: {col.formula_expression}
                        </span>
                      ) : (
                        <span className="font-mono text-gray-600 text-[11px]">
                          {col.source_path}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold">
                        {col.format}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-gray-500">
                      {col.width || 12}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                      {currentSheet.totals_formulas?.[col.column_key] || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
