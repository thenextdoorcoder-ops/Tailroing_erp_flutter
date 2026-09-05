'use client';

import MeasurementSection from '@/components/measurements/MeasurementSection';
import { MeasurementType } from '@/types/measurement.types';

interface CreateMeasurementModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName?: string;
    onSaved: (id: string) => void;
}

export default function CreateMeasurementModal({
    isOpen,
    onClose,
    customerId,
    customerName,
    onSaved,
}: CreateMeasurementModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Add New Measurement</h2>
                        {customerName && <p className="text-sm text-slate-500 mt-0.5">for {customerName}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                    <MeasurementSection
                        customerId={customerId}
                        customerName={customerName}
                        onSaved={(id) => {
                            onSaved(id);
                            onClose();
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
