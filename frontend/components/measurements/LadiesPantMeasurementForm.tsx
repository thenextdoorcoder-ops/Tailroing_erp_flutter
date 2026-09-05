'use client';

import { useState } from 'react';
import { LadiesPantMeasurementData } from '@/types/measurement.types';

interface LadiesPantMeasurementFormProps {
  value: LadiesPantMeasurementData;
  onChange: (data: LadiesPantMeasurementData) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white placeholder-gray-300 transition';

const labelClass =
  'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

const sectionTitleClass =
  'text-xs font-bold text-teal-700 uppercase tracking-widest mb-3 mt-1 flex items-center gap-2';

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: keyof LadiesPantMeasurementData;
  value: string;
  onChange: (field: keyof LadiesPantMeasurementData, val: string) => void;
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
  name: keyof LadiesPantMeasurementData;
  value: string;
  onChange: (field: keyof LadiesPantMeasurementData, val: string) => void;
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

export default function LadiesPantMeasurementForm({
  value,
  onChange,
}: LadiesPantMeasurementFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handle = (field: keyof LadiesPantMeasurementData, val: string) => {
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
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-sm font-bold shadow">
            L
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800 text-sm">Ladies Pant Measurement</p>
            {filledCount > 0 && (
              <p className="text-xs text-teal-600">{filledCount} field(s) filled</p>
            )}
          </div>
        </div>
        <span className="text-gray-400 text-lg">{isOpen ? '▾' : '▸'}</span>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="p-5 bg-white space-y-6 max-h-[600px] overflow-y-auto">

          {/* Section 1: Body Measurements */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-teal-400 inline-block" />
              Body Measurements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Height" name="height" value={value.height || ''} onChange={handle} placeholder="e.g. 38" />
              <Field label="Waist" name="Waist" value={value.Waist || ''} onChange={handle} placeholder="e.g. 28" />
              <Field label="Seat" name="Seat" value={value.Seat || ''} onChange={handle} placeholder="e.g. 38" />
              <Field label="Thigh" name="Thigh" value={value.Thigh || ''} onChange={handle} placeholder="e.g. 22" />
              <Field label="Knee" name="Knee" value={value.Knee || ''} onChange={handle} placeholder="e.g. 16" />
              <Field label="Bottom" name="Bottom" value={value.Bottom || ''} onChange={handle} placeholder="e.g. 14" />
              <Field label="Zip Length" name="Zip_Length" value={value.Zip_Length || ''} onChange={handle} placeholder="e.g. 7" />
              <Field label="Total Round" name="Total_Round" value={value.Total_Round || ''} onChange={handle} placeholder="e.g. 90" />
            </div>
          </div>

          {/* Section 2: Pant Style */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-teal-400 inline-block" />
              Pant Style
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <SelectField
                label="Pant Model"
                name="Pant_Model"
                value={value.Pant_Model || ''}
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
              <SelectField
                label="Model Type"
                name="Model_Type"
                value={value.Model_Type || ''}
                onChange={handle}
                options={[
                  { label: 'Regular', value: 'REGULAR' },
                  { label: 'Palazzo', value: 'PALAZZO' },
                  { label: 'Cigarette', value: 'CIGARETTE' },
                  { label: 'Other', value: 'OTHER' },
                ]}
              />
              <Field
                label="Enter Model Type"
                name="Enter_model_type"
                value={value.Enter_model_type || ''}
                onChange={handle}
                placeholder="Specify model..."
              />
            </div>
          </div>

          {/* Section 3: Cloth Requirements */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-teal-400 inline-block" />
              Cloth Requirements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Req. Cloth (Normal)" name="Required_Cloth_for_Normal" value={value.Required_Cloth_for_Normal || ''} onChange={handle} placeholder="e.g. 2m" />
              <Field label="Req. Cloth (Model)" name="Required_Cloth_for_Model" value={value.Required_Cloth_for_Model || ''} onChange={handle} placeholder="e.g. 2.5m" />
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-teal-400 inline-block" />
              Notes
            </p>
            <div>
              <label className={labelClass}>Additional Notes</label>
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
      )}
    </div>
  );
}
