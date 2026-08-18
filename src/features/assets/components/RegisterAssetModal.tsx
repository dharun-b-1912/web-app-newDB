import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { assetService } from '../../../services/asset/assetService';
import {
  AssetCategory,
  AssetTypeMaster,
  AssetAttributeDefinition,
  AssetCondition,
  IndustryProfileCode,
} from '../../../types';
import {
  Package,
  Cpu,
  Truck,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  DollarSign,
  Plus,
  QrCode,
  Tag,
} from 'lucide-react';

interface RegisterAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeIndustry?: IndustryProfileCode;
}

export const RegisterAssetModal: React.FC<RegisterAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeIndustry = 'IT',
}) => {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeMaster[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('IT_HARDWARE');
  const [selectedType, setSelectedType] = useState<string>('LAPTOP');

  // Form Fields
  const [assetName, setAssetName] = useState<string>('');
  const [manufacturer, setManufacturer] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [condition, setCondition] = useState<AssetCondition>('NEW');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [purchasePrice, setPurchasePrice] = useState<number>(1499);
  const [warrantyEnd, setWarrantyEnd] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Dynamic Custom Attributes State
  const [attributeDefs, setAttributeDefs] = useState<AssetAttributeDefinition[]>([]);
  const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const cats = assetService.getCategories(activeIndustry);
      setCategories(cats);
      const types = assetService.getAssetTypes();
      setAssetTypes(types);
      if (cats.length > 0) setSelectedCategory(cats[0].code);
    }
  }, [isOpen, activeIndustry]);

  useEffect(() => {
    const matchingTypes = assetTypes.filter(t => t.category_id === selectedCategory);
    if (matchingTypes.length > 0 && !matchingTypes.some(t => t.code === selectedType)) {
      setSelectedType(matchingTypes[0].code);
    }
  }, [selectedCategory, assetTypes]);

  useEffect(() => {
    const defs = assetService.getAttributeDefinitions(selectedType);
    setAttributeDefs(defs);
    const initialDyn: Record<string, any> = {};
    defs.forEach(d => {
      initialDyn[d.field_code] = d.options ? d.options[0] : '';
    });
    setDynamicAttributes(initialDyn);
  }, [selectedType]);

  const handleDynamicChange = (fieldCode: string, value: any) => {
    setDynamicAttributes(prev => ({ ...prev, [fieldCode]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) {
      showToast('Please provide an asset title.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      assetService.createAsset({
        assetCategoryCode: selectedCategory,
        assetTypeCode: selectedType,
        assetName,
        manufacturer,
        model,
        serialNumber,
        condition,
        purchaseDate,
        purchasePrice,
        warrantyEnd: warrantyEnd || undefined,
        customAttributes: dynamicAttributes,
        description,
      });

      showToast('Universal asset registered with dynamic attributes and QR code.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to register asset.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register Universal Organization Asset" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Step 1: Category & Type Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Asset Category *
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              {categories.map(c => (
                <option key={c.id} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Asset Type Master *
            </label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              {assetTypes.map(t => (
                <option key={t.id} value={t.code}>
                  {t.name} ({t.asset_class})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Primary Identifiers */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Asset Title / Model Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. MacBook Pro 16 M3 Max or Mazak CNC 5-Axis Lathe"
            value={assetName}
            onChange={e => setAssetName(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Manufacturer / Brand
            </label>
            <input
              type="text"
              placeholder="e.g. Apple, Dell, Mazak, CAT"
              value={manufacturer}
              onChange={e => setManufacturer(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Model Number
            </label>
            <input
              type="text"
              placeholder="e.g. A2780 / VCN-530C"
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Serial Number / Tag
            </label>
            <input
              type="text"
              placeholder="e.g. C02G1234MD6R"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden font-mono"
            />
          </div>
        </div>

        {/* Step 3: Dynamic Industry-Specific Custom Attributes */}
        {attributeDefs.length > 0 && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-gray-900">
              <Cpu className="w-4 h-4 text-[#07563D]" />
              Industry Specifications for {selectedType}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attributeDefs.map(attr => (
                <div key={attr.id}>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    {attr.field_label} {attr.is_required && '*'}
                  </label>
                  {attr.data_type === 'DROPDOWN' && attr.options ? (
                    <select
                      value={dynamicAttributes[attr.field_code] || ''}
                      onChange={e => handleDynamicChange(attr.field_code, e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
                    >
                      {attr.options.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : attr.data_type === 'NUMBER' ? (
                    <div className="relative">
                      <input
                        type="number"
                        value={dynamicAttributes[attr.field_code] || ''}
                        onChange={e => handleDynamicChange(attr.field_code, parseFloat(e.target.value))}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
                      />
                      {attr.unit_of_measure && (
                        <span className="absolute right-3 top-2 text-[10px] text-gray-400 font-bold">
                          {attr.unit_of_measure}
                        </span>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={dynamicAttributes[attr.field_code] || ''}
                      onChange={e => handleDynamicChange(attr.field_code, e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Financials & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Purchase Cost (USD)
            </label>
            <input
              type="number"
              min={0}
              value={purchasePrice}
              onChange={e => setPurchasePrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Initial Condition
            </label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as AssetCondition)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="NEW">Brand New</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good / Tested</option>
              <option value="FAIR">Fair (Operational)</option>
              <option value="DAMAGED">Damaged (Needs Repair)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Warranty Expiration
            </label>
            <input
              type="date"
              value={warrantyEnd}
              onChange={e => setWarrantyEnd(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !assetName.trim()}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
          >
            {isSubmitting ? 'Registering...' : 'Register Asset in Inventory'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
