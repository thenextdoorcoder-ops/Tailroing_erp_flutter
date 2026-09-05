'use client';

import { useState, useEffect } from 'react';
import { measurementService } from '@/lib/measurement-service';
import ChudiMeasurementForm from '@/components/measurements/ChudiMeasurementForm';
import BlouseMeasurementForm from '@/components/measurements/BlouseMeasurementForm';
import LadiesPantMeasurementForm from '@/components/measurements/LadiesPantMeasurementForm';
import KidsMeasurementForm from '@/components/measurements/KidsMeasurementForm';
import {
  MeasurementType,
  ChudiMeasurementData,
  BlouseMeasurementData,
  LadiesPantMeasurementData,
  KidsMeasurementData,
  Measurement,
} from '@/types/measurement.types';
import { useToast } from "@/hooks/use-toast";

interface EditMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurement: Measurement | null;
  onSaved: () => void;
}

export default function EditMeasurementModal({
  isOpen,
  onClose,
  measurement,
  onSaved,
}: EditMeasurementModalProps) {
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  // Per-type measurement state
  const [chudiData, setChudiData] = useState<ChudiMeasurementData>({});
  const [blouseData, setBlouseData] = useState<BlouseMeasurementData>({});
  const [ladiesData, setLadiesData] = useState<LadiesPantMeasurementData>({});
  const [kidsData, setKidsData] = useState<KidsMeasurementData>({});

  // Load measurement data when modal opens
  useEffect(() => {
    if (isOpen && measurement) {
      setNotes(measurement.notes || '');

      switch (measurement.type) {
        case 'CHUDI':
          setChudiData(measurement.data as ChudiMeasurementData);
          break;
        case 'BLOUSE':
          setBlouseData(measurement.data as BlouseMeasurementData);
          break;
        case 'LADIES_PANT':
          setLadiesData(measurement.data as LadiesPantMeasurementData);
          break;
        case 'KIDS':
          setKidsData(measurement.data as KidsMeasurementData);
          break;
      }
    }
  }, [isOpen, measurement]);

  const getCurrentData = () => {
    if (!measurement) return {};
    switch (measurement.type) {
      case 'CHUDI': return chudiData;
      case 'BLOUSE': return blouseData;
      case 'LADIES_PANT': return ladiesData;
      case 'KIDS': return kidsData;
    }
  };

  const handleSave = async () => {
    if (!measurement) return;

    setSaving(true);
    try {
      await measurementService.updateMeasurement(measurement.id, {
        data: getCurrentData(),
        notes,
      });

      toast({
        title: "Success",
        description: "Measurement updated successfully!",
        variant: "success",
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error('Save measurement error:', error);
      toast({
        title: "Error",
        description: "Failed to save measurement",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  if (!isOpen || !measurement) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit {measurement.type} Measurement
          </h2>
          <button
            onClick={handleClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Measurement Form */}
            {measurement.type === 'CHUDI' && (
              <ChudiMeasurementForm value={chudiData} onChange={setChudiData} />
            )}
            {measurement.type === 'BLOUSE' && (
              <BlouseMeasurementForm value={blouseData} onChange={setBlouseData} />
            )}
            {measurement.type === 'LADIES_PANT' && (
              <LadiesPantMeasurementForm value={ladiesData} onChange={setLadiesData} />
            )}
            {measurement.type === 'KIDS' && (
              <KidsMeasurementForm value={kidsData} onChange={setKidsData} />
            )}

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                Measurement Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special notes about this measurement..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
