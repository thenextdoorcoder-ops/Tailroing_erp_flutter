'use client';

import { useState, useEffect } from 'react';
import { measurementService } from '@/lib/measurement-service';
import { useToast } from "@/hooks/use-toast";

// ── Measurement Forms ─────────────────────────────────────────
import ChudiMeasurementForm from '@/components/measurements/ChudiMeasurementForm';
import BlouseMeasurementForm from '@/components/measurements/BlouseMeasurementForm';
import LadiesPantMeasurementForm from '@/components/measurements/LadiesPantMeasurementForm';
import KidsMeasurementForm from '@/components/measurements/KidsMeasurementForm';
import LoadMeasurementModal from '@/components/measurements/LoadMeasurementModal';

// ── Types ─────────────────────────────────────────────────────
// All exported from frontend/types/measurement.types.ts
import {
  MeasurementType,
  MeasurementData,
  ChudiMeasurementData,
  BlouseMeasurementData,
  LadiesPantMeasurementData,
  KidsMeasurementData,
  Measurement,
} from '@/types/measurement.types';

// ─── Props ────────────────────────────────────────────────────
interface MeasurementSectionProps {
  customerId: string;
  customerName?: string;
  activeType?: MeasurementType | null;
  subCategoryId?: string;
  onSaved?: (id: string) => void;
  onShowAlert?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

// ─── Tab config ───────────────────────────────────────────────
const MEASUREMENT_TYPES: {
  value: MeasurementType;
  label: string;
  color: string;
}[] = [
    { value: 'CHUDI', label: 'Chudi', color: 'purple' },
    { value: 'BLOUSE', label: 'Blouse', color: 'rose' },
    { value: 'LADIES_PANT', label: 'Ladies Pant', color: 'teal' },
    { value: 'KIDS', label: 'Kids', color: 'amber' },
  ];

// Active tab colour classes
const colorMap: Record<string, string> = {
  purple: 'border-purple-500 bg-purple-50 text-purple-700',
  rose: 'border-rose-500   bg-rose-50   text-rose-700',
  teal: 'border-teal-500   bg-teal-50   text-teal-700',
  amber: 'border-amber-500  bg-amber-50  text-amber-700',
};

const inactiveClass =
  'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50';

// ─── Empty-state factories ────────────────────────────────────
const emptyChudi = (): ChudiMeasurementData => ({});
const emptyBlouse = (): BlouseMeasurementData => ({});
const emptyLadies = (): LadiesPantMeasurementData => ({});
const emptyKids = (): KidsMeasurementData => ({});

// ─────────────────────────────────────────────────────────────
export default function MeasurementSection({
  customerId,
  customerName,
  activeType,
  subCategoryId, // Destructure subCategoryId
  onSaved,
  onShowAlert,
}: MeasurementSectionProps) {
  const [selectedType, setSelectedType] = useState<MeasurementType>('CHUDI');
  const [showModal, setShowModal] = useState(false);
  const [savedIdMap, setSavedIdMap] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Helpers for per-type savedId and notes
  const savedId = savedIdMap[selectedType] || null;
  const setSavedId = (id: string | null) => setSavedIdMap(prev => ({ ...prev, [selectedType]: id }));
  const notes = notesMap[selectedType] || '';
  const setNotes = (n: string) => setNotesMap(prev => ({ ...prev, [selectedType]: n }));

  // One state per measurement type — switching tabs preserves entered data
  const [chudiData, setChudiData] = useState<ChudiMeasurementData>(emptyChudi());
  const [blouseData, setBlouseData] = useState<BlouseMeasurementData>(emptyBlouse());
  const [ladiesData, setLadiesData] = useState<LadiesPantMeasurementData>(emptyLadies());
  const [kidsData, setKidsData] = useState<KidsMeasurementData>(emptyKids());

  // Measurements start empty — use "Load Past" button to manually load previous ones
  // (Customer might be ordering for another person)
  // useEffect(() => {
  //   if (customerId) autoLoad();
  // }, [customerId, selectedType, subCategoryId]);

  // Sync prop activeType to internal state
  useEffect(() => {
    if (activeType) {
      setSelectedType(activeType);
    }
  }, [activeType]);

  // ── Return the currently active tab's data ────────────────
  const getCurrentData = (): MeasurementData => {
    switch (selectedType) {
      case 'CHUDI': return chudiData;
      case 'BLOUSE': return blouseData;
      case 'LADIES_PANT': return ladiesData;
      case 'KIDS': return kidsData;
    }
  };

  // ── Write loaded/selected data into the right tab state ───
  const applyData = (type: MeasurementType, data: MeasurementData) => {
    switch (type) {
      case 'CHUDI': setChudiData(data as ChudiMeasurementData); break;
      case 'BLOUSE': setBlouseData(data as BlouseMeasurementData); break;
      case 'LADIES_PANT': setLadiesData(data as LadiesPantMeasurementData); break;
      case 'KIDS': setKidsData(data as KidsMeasurementData); break;
    }
  };

  // ── Reset only the current tab ────────────────────────────
  const resetCurrentType = () => {
    switch (selectedType) {
      case 'CHUDI': setChudiData(emptyChudi()); break;
      case 'BLOUSE': setBlouseData(emptyBlouse()); break;
      case 'LADIES_PANT': setLadiesData(emptyLadies()); break;
      case 'KIDS': setKidsData(emptyKids()); break;
    }
    setNotes('');
    setSavedId(null);
  };

  // True if any field in the current tab has a non-empty value or if there are notes
  const hasData = (): boolean =>
    Object.values(getCurrentData()).some((v) => v !== undefined && v !== '') || notes.trim().length > 0;

  // ── Auto-load latest measurement from the API ─────────────
  const autoLoad = async () => {
    try {
      const measurement = await measurementService.getLatestMeasurement(
        customerId,
        selectedType,
        subCategoryId // Pass current subCategoryId
      );
      if (measurement) {
        applyData(measurement.type, measurement.data);
        setNotes(measurement.notes || '');
        setSavedId(measurement.id);
      } else {
        // Don't reset local state — user may have unsaved data in this tab
        // Only clear the savedId so a new save creates a new record
        setSavedId(null);
      }
    } catch {
      // Don't reset local state on error either
      setSavedId(null);
    }
  };

  // ── Save / update ─────────────────────────────────────────
  const handleSave = async () => {
    if (!hasData()) {
      if (onShowAlert) {
        onShowAlert('Error', 'Please fill in at least one measurement field', 'error');
      } else {
        toast({
          title: "Measurement Required",
          description: "Please fill in at least one measurement field",
          variant: "destructive",
        });
      }
      return;
    }
    setSaving(true);
    try {
      let idToNotify = savedId;
      if (savedId) {
        await measurementService.updateMeasurement(savedId, {
          data: getCurrentData(),
          notes,
          // We can choose to update subCategoryId too if needed, but currently updateMeasurement interface might not support it unless updated.
        });
        if (onShowAlert) {
          onShowAlert('Success', 'Measurement updated successfully!', 'success');
        } else {
          toast({
            title: "Success",
            description: "Measurement updated successfully!",
            variant: "success",
          });
        }
      } else {
        const result = await measurementService.createMeasurement({
          customerId,
          type: selectedType,
          data: getCurrentData(),
          notes,
          subCategoryId, // Pass the SubCategory ID
        });
        setSavedId(result.id);
        idToNotify = result.id;
        if (onShowAlert) {
          onShowAlert('Success', 'Measurement saved successfully!', 'success');
        } else {
          toast({
            title: "Success",
            description: "Measurement saved successfully!",
            variant: "success",
          });
        }
      }

      if (onSaved && idToNotify) {
        onSaved(idToNotify);
      }
    } catch (error) {
      console.error('Save measurement error:', error);
      if (onShowAlert) {
        onShowAlert('Error', 'Failed to save measurement', 'error');
      } else {
        toast({
          title: "Error",
          description: "Failed to save measurement",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Called when user selects from the modal ───────────────
  const handleMeasurementSelect = (measurement: Measurement) => {
    setSelectedType(measurement.type);
    applyData(measurement.type, measurement.data);
    // Directly update maps with the correct type key (selectedType hasn't changed yet in this render)
    setNotesMap(prev => ({ ...prev, [measurement.type]: measurement.notes || '' }));
    setSavedIdMap(prev => ({ ...prev, [measurement.type]: measurement.id }));
    setShowModal(false);
  };

  // ── Switch tab ────────────────────────────────────────────
  const handleTypeSwitch = (type: MeasurementType) => {
    setSelectedType(type);
    // savedId and notes are now per-type, no need to clear them
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Measurements</h2>
          {customerName && (
            <p className="text-sm text-gray-500">for {customerName}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
          >
            📂 Load Past
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* ── Type Tabs ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MEASUREMENT_TYPES.map(({ value, label, color }) => {
          const isActive = selectedType === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleTypeSwitch(value)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all
                ${isActive ? colorMap[color] : inactiveClass}
              `}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Active Form ─────────────────────────────────── */}
      <div className="space-y-3">
        {selectedType === 'CHUDI' && (
          <ChudiMeasurementForm
            value={chudiData}
            onChange={setChudiData}
          />
        )}
        {selectedType === 'BLOUSE' && (
          <BlouseMeasurementForm
            value={blouseData}
            onChange={setBlouseData}
          />
        )}
        {selectedType === 'LADIES_PANT' && (
          <LadiesPantMeasurementForm
            value={ladiesData}
            onChange={setLadiesData}
          />
        )}
        {selectedType === 'KIDS' && (
          <KidsMeasurementForm
            value={kidsData}
            onChange={setKidsData}
          />
        )}
      </div>

      {/* ── Shared Notes ────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
          Measurement Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Type measurements manually or specific fitting instructions here (if you prefer not to use the form above)..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>

      {/* ── Saved Indicator ─────────────────────────────── */}
      {savedId && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <svg
            className="w-4 h-4 text-green-600 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9
                 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-green-700 font-medium">
            Measurement saved and linked to this order
          </p>
        </div>
      )}

      {/* ── Bottom Action Buttons ───────────────────────── */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
        >
          📂 Load Past
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : '💾 Save'}
        </button>
      </div>

      {/* ── Load Modal ──────────────────────────────────── */}
      <LoadMeasurementModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleMeasurementSelect}
        measurementType={selectedType}
      />

    </div>
  );
}
