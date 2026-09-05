'use client';

import { useState } from 'react';
import {
  MeasurementType,
  ChudiMeasurementData,
  BlouseMeasurementData,
  LadiesPantMeasurementData,
  KidsMeasurementData,
} from '@/types/measurement.types';

interface MeasurementDisplayProps {
  measurement: {
    id: string;
    type: MeasurementType;
    data: any;
    notes?: string;
    createdAt: string;
  };
  onEdit?: (measurementId: string) => void;
  editable?: boolean;
}

export default function MeasurementDisplay({
  measurement,
  onEdit,
  editable = true,
}: MeasurementDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getTypeColor = (type: MeasurementType) => {
    switch (type) {
      case 'CHUDI':       return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'BLOUSE':      return 'bg-rose-100 text-rose-700 border-rose-300';
      case 'LADIES_PANT': return 'bg-teal-100 text-teal-700 border-teal-300';
      case 'KIDS':        return 'bg-amber-100 text-amber-700 border-amber-300';
    }
  };

  const getTypeLabel = (type: MeasurementType) => {
    switch (type) {
      case 'CHUDI':       return 'Chudi';
      case 'BLOUSE':      return 'Blouse';
      case 'LADIES_PANT': return 'Ladies Pant';
      case 'KIDS':        return 'Kids';
    }
  };

  const formatFieldName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const renderMeasurementFields = () => {
    const entries = Object.entries(measurement.data).filter(
      ([key, value]) => value !== null && value !== undefined && value !== ''
    );

    if (entries.length === 0) {
      return (
        <p className="text-sm text-gray-500 italic">No measurements recorded</p>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {entries.map(([key, value]) => (
          <div key={key} className="bg-gray-50 px-3 py-2 rounded border border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">{formatFieldName(key)}</p>
            <p className="text-sm font-semibold text-gray-900">{value as string}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          <span
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getTypeColor(
              measurement.type
            )}`}
          >
            {getTypeLabel(measurement.type)}
          </span>

          <span className="text-xs text-gray-500">
            {new Date(measurement.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {editable && onEdit && (
          <button
            type="button"
            onClick={() => onEdit(measurement.id)}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>
        )}
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Measurement Fields */}
          {renderMeasurementFields()}

          {/* Notes */}
          {measurement.notes && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">Notes:</p>
              <p className="text-sm text-gray-700 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
                {measurement.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
