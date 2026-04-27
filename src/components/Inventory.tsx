import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { PackageSearch, Plus, PackageX, DatabaseZap, Edit, Trash2, FileText } from 'lucide-react';
import { MaterialType, Material } from '../types';
import { defaultMaterials } from '../lib/defaultMaterials';
import ConfirmModal from './ConfirmModal';

export default function Inventory() {
  const { materials, materialsWithStats, addMaterial, updateMaterial, deleteMaterial, transactions } = useAppStore();
  const [filterType, setFilterType] = useState<MaterialType | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Material form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<MaterialType>('Metal');
  const [buyPrice, setBuyPrice] = useState<number | ''>('');
  const [sellPrice, setSellPrice] = useState<number | ''>('');
  const [unit, setUnit] = useState<string>('kg');
  const [conversionRate, setConversionRate] = useState<number | ''>('');

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, currentStock: number } | null>(null);
  const [convertConfirm, setConvertConfirm] = useState<{ id: string, conversionRate: number, currentStock: number, unit: string } | null>(null);
  const [presetConfirmOpen, setPresetConfirmOpen] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string, message: string } | null>(null);

  const openModal = (mat?: Material) => {
    if (mat) {
      setEditingId(mat.id);
      setName(mat.name);
      setType(mat.type);
      setBuyPrice(mat.buyPrice);
      setSellPrice(mat.sellPrice);
      setUnit(mat.unit);
      setConversionRate(mat.conversionRate || '');
    } else {
      setEditingId(null);
      setName('');
      setType('Metal');
      setBuyPrice('');
      setSellPrice('');
      setUnit('kg');
      setConversionRate('');
    }
    setIsModalOpen(true);
  };

  const filteredMaterials = (materialsWithStats || []).filter(m => {
    const matchType = filterType === 'All' || m.type === filterType;
    const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  });

  const [unitChangeConfirm, setUnitChangeConfirm] = useState<{ id: string, oldUnit: string, newUnit: string, currentStock: number } | null>(null);
  const [unitConversionFactor, setUnitConversionFactor] = useState<number>(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || buyPrice === '' || sellPrice === '') return;

    try {
      if (editingId) {
        const material = materials.find(m => m.id === editingId);
        if (material && material.unit !== unit && material.currentStock > 0) {
          setUnitChangeConfirm({
            id: editingId,
            oldUnit: material.unit,
            newUnit: unit,
            currentStock: material.currentStock
          });
          return;
        }

        await updateMaterial(editingId, {
          name,
          type,
          buyPrice: Number(buyPrice),
          sellPrice: Number(sellPrice),
          unit,
          conversionRate: conversionRate !== '' ? Number(conversionRate) : undefined
        });
      } else {
        await addMaterial({
          name,
          type,
          buyPrice: Number(buyPrice),
          sellPrice: Number(sellPrice),
          unit,
          conversionRate: conversionRate !== '' ? Number(conversionRate) : undefined
        });
      }

      setIsModalOpen(false);
      setName('');
      setBuyPrice('');
      setSellPrice('');
    } catch (err: any) {
      setAlertModal({ title: "Error saving material", message: err.message });
    }
  };

  const executeUnitChangeWithConversion = async (applyConversion: boolean) => {
    if (!unitChangeConfirm) return;

    try {
      const newStock = applyConversion 
        ? unitChangeConfirm.currentStock * unitConversionFactor 
        : unitChangeConfirm.currentStock;

      await updateMaterial(unitChangeConfirm.id, {
        name,
        type,
        buyPrice: Number(buyPrice),
        sellPrice: Number(sellPrice),
        unit: unitChangeConfirm.newUnit,
        currentStock: newStock,
        conversionRate: conversionRate !== '' ? Number(conversionRate) : undefined
      });

      setIsModalOpen(false);
      setUnitChangeConfirm(null);
      setUnitConversionFactor(1);
    } catch (err: any) {
      setAlertModal({ title: "Error", message: "Failed to update material: " + err.message });
    }
  };

  const executeConvert = async () => {
    if (!convertConfirm) return;
    try {
      // Simple logic: kg -> pcs (multiplier) or pcs -> kg (division)
      const newStock = convertConfirm.unit === 'kg' 
        ? convertConfirm.currentStock * convertConfirm.conversionRate
        : convertConfirm.currentStock / convertConfirm.conversionRate;
      const newUnit = convertConfirm.unit === 'kg' ? 'pcs' : 'kg';
      
      await updateMaterial(convertConfirm.id, {
        currentStock: newStock,
        unit: newUnit
      });
      setAlertModal({ title: "Success", message: `Converted to ${newUnit}!` });
    } catch (err: any) {
      setAlertModal({ title: "Error", message: "Failed to convert material: " + err.message });
    } finally {
      setConvertConfirm(null);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.currentStock > 0) {
        setAlertModal({ title: "Cannot Delete", message: "Cannot delete material with existing stock. Please adjust stock to 0 first via transactions." });
        return;
      }
      await deleteMaterial(deleteConfirm.id);
    } catch (err: any) {
      setAlertModal({ title: "Error", message: "Failed to delete material: " + err.message });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const executeLoadPresets = async () => {
    setPresetConfirmOpen(false);
    setIsSeeding(true);
    try {
      for (const mat of defaultMaterials) {
        if (!materials.some(m => m.name.toLowerCase() === mat.name.toLowerCase())) {
          await addMaterial(mat);
        }
      }
      setAlertModal({ title: "Success", message: "Presets loaded successfully!" });
    } catch (err: any) {
      setAlertModal({ title: "Error", message: "Error loading presets: " + (err.message || 'Unknown error') });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Inventory</h2>
          <p className="text-gray-500 mt-1">Manage stockpiles and material types.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            onClick={() => setPresetConfirmOpen(true)}
            disabled={isSeeding}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
            title="Load standard Philippine junk shop items (Tanso, Sibak, etc.)"
          >
            <DatabaseZap size={20} className={isSeeding ? "animate-pulse" : ""} />
            {isSeeding ? "Loading..." : "Load PH Presets"}
          </button>
          <button 
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={20} />
            New Material
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex flex-wrap gap-2">
            {['All', 'Metal', 'Plastic', 'Paper', 'Glass', 'Electronics', 'Other'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterType(cat as any)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filterType === cat 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs w-full">
             <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
              type="text" 
              placeholder="Find material..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {filteredMaterials.length > 0 ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 content-start">
            {filteredMaterials.map(m => (
              <div key={m.id} className="border border-gray-100 shadow-sm rounded-xl p-5 hover:shadow transition-shadow bg-white flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{m.name}</h3>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                      {m.type}
                    </span>
                  </div>
                    <div className="text-right text-[10px] text-gray-400 space-y-1 font-mono">
                      <div>Market Buy: <span className="font-semibold text-gray-700">₱{m.buyPrice.toFixed(2)}</span></div>
                      <div>Avg. Cost: <span className="font-bold text-amber-600">₱{m.weightedAverageCost.toFixed(2)}</span></div>
                      <div>Sell: <span className="font-bold text-blue-700">₱{m.sellPrice.toFixed(2)}</span></div>
                      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-gray-100">
                        <div className="flex-1 text-left">
                          {m.sellPrice > 0 && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${((m.sellPrice - m.weightedAverageCost) / m.sellPrice) > 0.3 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                              {Math.round(((m.sellPrice - m.weightedAverageCost) / m.sellPrice) * 100)}% MARGIN
                            </span>
                          )}
                        </div>
                      <button onClick={() => setSelectedMaterial(m)} className="text-slate-300 hover:text-purple-500" title="View transactions"><FileText size={14}/></button>
                      <button onClick={() => openModal(m)} className="text-slate-300 hover:text-blue-500" title="Edit material"><Edit size={14}/></button>
                      {m.conversionRate && (
                        <button onClick={() => setConvertConfirm({ id: m.id, conversionRate: m.conversionRate!, currentStock: m.currentStock, unit: m.unit })} className="text-slate-300 hover:text-green-500" title="Convert stock"><DatabaseZap size={14}/></button>
                      )}
                      <button onClick={() => setDeleteConfirm({ id: m.id, currentStock: m.currentStock })} className="text-slate-300 hover:text-red-500" title="Delete material"><Trash2 size={14}/></button>
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-end">
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Stock</div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">
                      {m.currentStock.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2})} 
                      <span className="text-sm font-normal text-gray-400 ml-1">{m.unit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Est. Value</div>
                    <div className="text-lg font-mono font-bold text-blue-700">
                      ₱{(m.currentStock * m.sellPrice).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
             <PackageX size={48} strokeWidth={1} />
             <p className="text-lg">No materials found in inventory.</p>
             <button 
               onClick={async () => {
                 setIsSeeding(true);
                 for (const mat of defaultMaterials) {
                   await addMaterial(mat);
                 }
                 setIsSeeding(false);
               }}
               disabled={isSeeding}
               className="mt-4 px-5 py-3 bg-slate-900 text-white rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-50"
             >
               <DatabaseZap size={18} className={isSeeding ? "animate-pulse" : ""} />
               {isSeeding ? "Loading Catalog..." : "Load Default Junk Shop Catalog"}
             </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
             <PackageX size={48} strokeWidth={1} />
             <p className="text-lg">No materials matched your filters.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 text-gray-900">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Material' : 'Add New Material'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Material Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Copper Piping"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value as MaterialType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    {['Metal', 'Plastic', 'Paper', 'Glass', 'Electronics', 'Other'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-1/3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <input 
                    type="text" 
                    placeholder="e.g. kg, pcs, meters"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  />
                </div>
                <div className="w-full sm:w-1/3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Conv. Rate</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="Rate"
                    value={conversionRate}
                    onChange={(e) => setConversionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Buy Price (₱ / def)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    required
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sell Price (₱ / def)</label>
                  <input 
                    type="number" 
                    min="0"
                    step="0.01"
                    required
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors">
                  {editingId ? 'Save Changes' : 'Create Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={presetConfirmOpen}
        title="Load Presets"
        message="This will load the Philippine junk shop presets. Missing items will be added. Continue?"
        onConfirm={executeLoadPresets}
        onCancel={() => setPresetConfirmOpen(false)}
        confirmText="Load Presets"
      />

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Delete Material"
        message="Are you sure you want to delete this material?"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm(null)}
        confirmText="Delete"
      />

      <ConfirmModal
        isOpen={convertConfirm !== null}
        title="Convert Stock"
        message={`Convert stock units from ${convertConfirm?.unit || ''} to ${convertConfirm?.unit === 'kg' ? 'pcs' : 'kg'}?`}
        onConfirm={executeConvert}
        onCancel={() => setConvertConfirm(null)}
        confirmText="Convert"
      />

      <ConfirmModal
        isOpen={unitChangeConfirm !== null}
        title="Unit Changed"
        message=""
        onConfirm={() => executeUnitChangeWithConversion(true)}
        onCancel={() => setUnitChangeConfirm(null)}
        confirmText="Convert & Save"
        cancelText="Cancel"
        confirmVariant="primary"
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">
            You changed the unit from <span className="font-bold">{unitChangeConfirm?.oldUnit}</span> to <span className="font-bold">{unitChangeConfirm?.newUnit}</span>.
            Existing stock is <span className="font-bold">{unitChangeConfirm?.currentStock} {unitChangeConfirm?.oldUnit}</span>.
          </p>
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-amber-800">
            Would you like to convert the existing stock?
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversion Factor</label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">1 {unitChangeConfirm?.oldUnit} = </span>
              <input 
                type="number"
                step="0.0001"
                value={unitConversionFactor}
                onChange={(e) => setUnitConversionFactor(Number(e.target.value))}
                className="w-24 px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-sm text-gray-400">{unitChangeConfirm?.newUnit}</span>
            </div>
            <p className="text-[10px] text-gray-400 italic mt-1">
              New Stock will be: {(unitChangeConfirm?.currentStock || 0) * unitConversionFactor} {unitChangeConfirm?.newUnit}
            </p>
          </div>
          <div className="pt-2">
            <button 
              type="button"
              onClick={() => executeUnitChangeWithConversion(false)}
              className="text-blue-600 text-sm font-semibold hover:underline"
            >
              Don't convert, just change unit name
            </button>
          </div>
        </div>
      </ConfirmModal>

      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 text-gray-900">
              <h3 className="font-bold text-lg">Transactions for {selectedMaterial.name}</h3>
              <button onClick={() => setSelectedMaterial(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
              {transactions.filter(t => t.materialId === selectedMaterial.id).length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2 text-right">Quantity</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions
                      .filter(t => t.materialId === selectedMaterial.id)
                      .sort((a,b) => b.createdAt - a.createdAt)
                      .map(t => (
                        <tr key={t.id}>
                          <td className="py-3">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="py-3 font-medium capitalize">{t.type}</td>
                          <td className="py-3 text-right">{t.quantity}</td>
                          <td className="py-3 text-right font-mono">₱{t.pricePerUnit.toFixed(2)}</td>
                          <td className="py-3 text-right font-mono">₱{t.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-gray-400 py-8">No transactions found for this material.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={alertModal !== null}
        title={alertModal?.title || "Alert"}
        message={alertModal?.message || ""}
        onConfirm={() => setAlertModal(null)}
        onCancel={() => setAlertModal(null)}
        confirmText="OK"
        cancelText="Close"
      />
    </div>
  );
}
