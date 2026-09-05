'use client';

import { useState } from 'react';
import { ChudiMeasurementData } from '@/types/measurement.types';

interface ChudiMeasurementFormProps {
  value: ChudiMeasurementData;
  onChange: (data: ChudiMeasurementData) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white placeholder-gray-300 transition';

const labelClass = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

const sectionTitleClass =
  'text-xs font-bold text-purple-700 uppercase tracking-widest mb-3 mt-1 flex items-center gap-2';

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: keyof ChudiMeasurementData;
  value: string;
  onChange: (field: keyof ChudiMeasurementData, val: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder || '—'}
        className={inputClass}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: keyof ChudiMeasurementData;
  value: string;
  onChange: (field: keyof ChudiMeasurementData, val: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className={inputClass}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ChudiMeasurementForm({
  value,
  onChange,
}: ChudiMeasurementFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handle = (field: keyof ChudiMeasurementData, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const filledCount = Object.values(value).filter(
    (v) => v !== undefined && v !== ''
  ).length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm font-bold shadow">
            C
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800 text-sm">Chudi Measurement</p>
            {filledCount > 0 && (
              <p className="text-xs text-purple-600">{filledCount} field(s) filled</p>
            )}
          </div>
        </div>
        <span className="text-gray-400 text-lg">{isOpen ? '▾' : '▸'}</span>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="p-5 bg-white space-y-6 max-h-[600px] overflow-y-auto">

          {/* Section 1: Basic Measurements */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-purple-400 inline-block" />
              Basic Measurements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Height" name="height" value={value.height || ''} onChange={handle} placeholder="e.g. 38" />
              <Field label="Chest" name="chest" value={value.chest || ''} onChange={handle} placeholder="e.g. 36" />
              <Field label="Waist / HIP Height" name="Waist_HIP_Height" value={value.Waist_HIP_Height || ''} onChange={handle} placeholder="e.g. 18" />
              <Field label="Waist / HIP Loose" name="Waist_HIP_Loose" value={value.Waist_HIP_Loose || ''} onChange={handle} placeholder="e.g. 32" />
              <Field label="Seat Loose" name="SeatLoose" value={value.SeatLoose || ''} onChange={handle} placeholder="e.g. 40" />
              <Field label="Full Shoulder" name="Full_Shoulder" value={value.Full_Shoulder || ''} onChange={handle} placeholder="e.g. 14" />
            </div>
          </div>

          {/* Section 2: Neck */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-purple-400 inline-block" />
              Neck Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Front Neck Height" name="Front_Neck_Height" value={value.Front_Neck_Height || ''} onChange={handle} placeholder="e.g. 7" />
              <Field label="Back Neck Height" name="Back_Neck_Height" value={value.Back_Neck_Height || ''} onChange={handle} placeholder="e.g. 4" />
            </div>
          </div>

          {/* Section 3: Sleeve */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-purple-400 inline-block" />
              Sleeve Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Sleeve Length" name="Sleeve_Length" value={value.Sleeve_Length || ''} onChange={handle} placeholder="e.g. 24" />
              <Field label="Sleeve Round" name="Sleeve_Round" value={value.Sleeve_Round || ''} onChange={handle} placeholder="e.g. 14" />
              <Field label="Middle Hand Round" name="Middle_Hand_Round" value={value.Middle_Hand_Round || ''} onChange={handle} placeholder="e.g. 12" />
              <Field label="Shoulder Finishing" name="Shoulder_Finishing" value={value.Shoulder_Finishing || ''} onChange={handle} placeholder="e.g. 15" />
            </div>
          </div>

          {/* Section 4: Fit & Style */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-purple-400 inline-block" />
              Fit & Style
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <SelectField
                label="Fit Style"
                name="Fit_Style"
                value={value.Fit_Style || ''}
                onChange={handle}
                options={[
                  { label: 'A Size', value: 'A_SIZE' },
                  { label: 'B Type', value: 'B_TYPE' },
                  { label: 'C Type', value: 'C_TYPE' },
                ]}
              />
              <SelectField
                label="Pant Model"
                name="pantModel"
                value={value.pantModel || ''}
                onChange={handle}
                options={[
                  { label: 'Fit Slim', value: 'FIT_SLIM' },
                  { label: 'Straight Pant', value: 'STRAIGHT_PANT' },
                ]}
              />
              <SelectField
                label="Pleat Model"
                name="pleatModel"
                value={value.pleatModel || ''}
                onChange={handle}
                options={[
                  { label: 'Comfort', value: 'COMFORT' },
                  { label: 'Formal', value: 'FORMAL' },
                ]}
              />
            </div>
          </div>

          {/* Section 5: Finishing / Calculation Fields */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-purple-400 inline-block" />
              Finishing Calculations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Finishing Chest" name="FinishingChest" value={value.FinishingChest || ''} onChange={handle} placeholder="e.g. 38" />
              <Field label="Finishing Waist" name="FinishingWaist" value={value.FinishingWaist || ''} onChange={handle} placeholder="e.g. 34" />
              <Field label="Finishing Seat" name="FinishingSeat" value={value.FinishingSeat || ''} onChange={handle} placeholder="e.g. 42" />
              <Field label="Flair Opt" name="FlairOpt" value={value.FlairOpt || ''} onChange={handle} placeholder="e.g. 60" />
              <Field label="Flair Loose" name="FlairLoose" value={value.FlairLoose || ''} onChange={handle} placeholder="e.g. 2" />
            </div>
          </div>

          {/* Section 6: Pant Details */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-purple-400 inline-block" />
              Pant Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Pant Height" name="pantHeight" value={value.pantHeight || ''} onChange={handle} placeholder="e.g. 40" />
              <Field label="Bottom Loose" name="bottomLoose" value={value.bottomLoose || ''} onChange={handle} placeholder="e.g. 14" />
              <Field label="Req. Cloth (Normal)" name="requiredClothNormal" value={value.requiredClothNormal || ''} onChange={handle} placeholder="e.g. 2.5m" />
              <Field label="Req. Cloth (Model)" name="requiredClothModel" value={value.requiredClothModel || ''} onChange={handle} placeholder="e.g. 3m" />
            </div>
          </div>

          {/* Section 7: Reference & Notes */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-purple-400 inline-block" />
              Reference & Notes
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Reference" name="reference" value={value.reference || ''} onChange={handle} placeholder="Reference details..." />
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={value.notes || ''}
                  onChange={(e) => handle('notes', e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                  className={inputClass + ' resize-none'}
                />
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
