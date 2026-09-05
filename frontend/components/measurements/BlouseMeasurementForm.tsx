'use client';

import { useState } from 'react';
import { BlouseMeasurementData } from '@/types/measurement.types';

interface BlouseMeasurementFormProps {
  value: BlouseMeasurementData;
  onChange: (data: BlouseMeasurementData) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-white placeholder-gray-300 transition';

const labelClass =
  'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

const sectionTitleClass =
  'text-xs font-bold text-rose-700 uppercase tracking-widest mb-3 mt-1 flex items-center gap-2';

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: keyof BlouseMeasurementData;
  value: string;
  onChange: (field: keyof BlouseMeasurementData, val: string) => void;
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
  name: keyof BlouseMeasurementData;
  value: string;
  onChange: (field: keyof BlouseMeasurementData, val: string) => void;
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

export default function BlouseMeasurementForm({
  value,
  onChange,
}: BlouseMeasurementFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handle = (field: keyof BlouseMeasurementData, val: string) => {
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
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-rose-50 to-orange-50 hover:from-rose-100 hover:to-orange-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white text-sm font-bold shadow">
            B
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800 text-sm">Blouse Measurement</p>
            {filledCount > 0 && (
              <p className="text-xs text-rose-600">{filledCount} field(s) filled</p>
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
              <span className="w-4 h-px bg-rose-400 inline-block" />
              Body Measurements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Height" name="height" value={value.height || ''} onChange={handle} placeholder="e.g. 38" />
              <Field label="Upper Chest" name="Upper_Chest" value={value.Upper_Chest || ''} onChange={handle} placeholder="e.g. 34" />
              <Field label="Center Chest" name="Center_Chest" value={value.Center_Chest || ''} onChange={handle} placeholder="e.g. 36" />
              <Field label="Waist Loose" name="Waist_Loose" value={value.Waist_Loose || ''} onChange={handle} placeholder="e.g. 30" />
              <Field label="Full Shoulder" name="Full_Shoulder" value={value.Full_Shoulder || ''} onChange={handle} placeholder="e.g. 14" />
              <Field label="Arm Round" name="Arm_Round" value={value.Arm_Round || ''} onChange={handle} placeholder="e.g. 13" />
            </div>
          </div>

          {/* Section 2: Neck */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-rose-400 inline-block" />
              Neck Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Front Neck Height" name="Front_Neck_Height" value={value.Front_Neck_Height || ''} onChange={handle} placeholder="e.g. 7" />
              <Field label="Back Neck Height" name="Back_Neck_Height" value={value.Back_Neck_Height || ''} onChange={handle} placeholder="e.g. 4" />
              <Field label="Front Point Center" name="Front_Point_Center" value={value.Front_Point_Center || ''} onChange={handle} placeholder="e.g. 9" />
            </div>
          </div>

          {/* Section 3: Sleeve */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-rose-400 inline-block" />
              Sleeve Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Sleeve Length" name="Sleeve_Length" value={value.Sleeve_Length || ''} onChange={handle} placeholder="e.g. 24" />
              <Field label="Sleeve Round" name="Sleeve_Round" value={value.Sleeve_Round || ''} onChange={handle} placeholder="e.g. 14" />
              <Field label="Middle Hand Loose" name="Middle_Hand_Loose" value={value.Middle_Hand_Loose || ''} onChange={handle} placeholder="e.g. 12" />
              <Field label="Shoulder Finishing" name="Shoulder_Finishing" value={value.Shoulder_Finishing || ''} onChange={handle} placeholder="e.g. 15" />
            </div>
          </div>

          {/* Section 4: Model Type */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-rose-400 inline-block" />
              Model & Style
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <SelectField
                label="Model Type"
                name="Model_Type"
                value={value.Model_Type || ''}
                onChange={handle}
                options={[
                  { label: 'Regular', value: 'REGULAR' },
                  { label: 'Designer', value: 'DESIGNER' },
                  { label: 'Bridal', value: 'BRIDAL' },
                  { label: 'Other', value: 'OTHER' },
                ]}
              />
              <Field label="Enter Model Type" name="Enter_model_type" value={value.Enter_model_type || ''} onChange={handle} placeholder="Specify model..." />
              <Field label="Req. Cloth (Normal)" name="Required_Cloth_for_Normal" value={value.Required_Cloth_for_Normal || ''} onChange={handle} placeholder="e.g. 1m" />
              <Field label="Req. Cloth (Model)" name="Required_Cloth_for_Model" value={value.Required_Cloth_for_Model || ''} onChange={handle} placeholder="e.g. 1.5m" />
            </div>
          </div>

          {/* Section 5: Notes */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-rose-400 inline-block" />
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
