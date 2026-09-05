'use client';

import { useState } from 'react';
import { KidsMeasurementData } from '@/types/measurement.types';

interface KidsMeasurementFormProps {
  value: KidsMeasurementData;
  onChange: (data: KidsMeasurementData) => void;
}

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white placeholder-gray-300 transition';

const labelClass =
  'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

const sectionTitleClass =
  'text-xs font-bold text-amber-700 uppercase tracking-widest mb-3 mt-1 flex items-center gap-2';

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: keyof KidsMeasurementData;
  value: string;
  onChange: (field: keyof KidsMeasurementData, val: string) => void;
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
  name: keyof KidsMeasurementData;
  value: string;
  onChange: (field: keyof KidsMeasurementData, val: string) => void;
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

export default function KidsMeasurementForm({
  value,
  onChange,
}: KidsMeasurementFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handle = (field: keyof KidsMeasurementData, val: string) => {
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
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white text-sm font-bold shadow">
            K
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-800 text-sm">Kids Measurement</p>
            {filledCount > 0 && (
              <p className="text-xs text-amber-600">{filledCount} field(s) filled</p>
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
              <span className="w-4 h-px bg-amber-400 inline-block" />
              Body Measurements
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Height" name="height" value={value.height || ''} onChange={handle} placeholder="e.g. 28" />
              <Field label="Body Loose" name="Body_Loose" value={value.Body_Loose || ''} onChange={handle} placeholder="e.g. 26" />
              <Field label="Waist Height" name="Waist_Height" value={value.Waist_Height || ''} onChange={handle} placeholder="e.g. 14" />
              <Field label="Waist Loose" name="Waist_Loose" value={value.Waist_Loose || ''} onChange={handle} placeholder="e.g. 22" />
              <Field label="Hip Loose" name="Hip_Loose" value={value.Hip_Loose || ''} onChange={handle} placeholder="e.g. 24" />
              <Field label="Full Shoulder" name="Full_Shoulder" value={value.Full_Shoulder || ''} onChange={handle} placeholder="e.g. 10" />
            </div>
          </div>

          {/* Section 2: Neck */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-amber-400 inline-block" />
              Neck Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Front Neck Height" name="Front_Neck_Height" value={value.Front_Neck_Height || ''} onChange={handle} placeholder="e.g. 5" />
              <Field label="Back Neck Height" name="Back_Neck_Height" value={value.Back_Neck_Height || ''} onChange={handle} placeholder="e.g. 3" />
            </div>
          </div>

          {/* Section 3: Hand / Sleeve */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-amber-400 inline-block" />
              Hand / Sleeve Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Hand Height" name="Hand_Height" value={value.Hand_Height || ''} onChange={handle} placeholder="e.g. 16" />
              <Field label="Hand Loose" name="Hand_Loose" value={value.Hand_Loose || ''} onChange={handle} placeholder="e.g. 10" />
              <Field label="Middle Hand Loose" name="Middle_Hand_Loose" value={value.Middle_Hand_Loose || ''} onChange={handle} placeholder="e.g. 9" />
              <Field label="Shoulder Finishing" name="Shoulder_Finishing" value={value.Shoulder_Finishing || ''} onChange={handle} placeholder="e.g. 10" />
            </div>
          </div>

          {/* Section 4: Bottom & Body Part */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-amber-400 inline-block" />
              Bottom & Body Part
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Bottom Height" name="Bottom_Height" value={value.Bottom_Height || ''} onChange={handle} placeholder="e.g. 10" />
              <Field label="Body Part Height" name="Body_Part_Height" value={value.Body_Part_Height || ''} onChange={handle} placeholder="e.g. 12" />
            </div>
          </div>

          {/* Section 5: Model & Style */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-amber-400 inline-block" />
              Model & Style
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <SelectField
                label="Model Type"
                name="Model_Type"
                value={value.Model_Type || ''}
                onChange={handle}
                options={[
                  { label: 'Frock', value: 'FROCK' },
                  { label: 'Salwar', value: 'SALWAR' },
                  { label: 'Chudi', value: 'CHUDI' },
                  { label: 'Pant', value: 'PANT' },
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

          {/* Section 6: Cloth Requirements */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-amber-400 inline-block" />
              Cloth Requirements & Reference
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Req. Cloth (Normal)" name="Required_Cloth_for_Normal" value={value.Required_Cloth_for_Normal || ''} onChange={handle} placeholder="e.g. 1.5m" />
              <Field label="Req. Cloth (Model)" name="Required_Cloth_for_Model" value={value.Required_Cloth_for_Model || ''} onChange={handle} placeholder="e.g. 2m" />
              <Field label="Measurement Reference" name="Measurement_Reference" value={value.Measurement_Reference || ''} onChange={handle} placeholder="Reference details..." />
            </div>
          </div>

          {/* Section 7: Notes */}
          <div>
            <p className={sectionTitleClass}>
              <span className="w-4 h-px bg-amber-400 inline-block" />
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
