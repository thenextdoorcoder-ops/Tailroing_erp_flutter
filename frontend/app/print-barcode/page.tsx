'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
// @ts-ignore
import Barcode from 'react-barcode';

function PrintBarcodeContent() {
    const searchParams = useSearchParams();
    const sku = searchParams.get('sku') || 'NO-SKU';
    const name = searchParams.get('name') || 'Unnamed Product';

    return (
        <div className="p-8 bg-white min-h-screen flex flex-col items-center">
            <div className="mb-8 print:hidden flex gap-4">
                <button
                    onClick={() => {
                        window.print();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition-colors"
                >
                    <Printer size={20} /> Print Barcode
                </button>
            </div>

            <div className="border border-slate-200 p-6 rounded-xl shadow-sm text-center bg-white print:border-none print:shadow-none print:p-0 flex flex-col items-center max-w-sm w-full mx-auto">
                <h3 className="text-lg font-bold text-slate-800 mb-2 truncate px-2">{name}</h3>
                <div className="flex justify-center bg-white p-2">
                    <Barcode
                        value={sku}
                        format="CODE128"
                        width={2.2}
                        height={70}
                        displayValue={true}
                        fontSize={16}
                        margin={10}
                        background="#ffffff"
                        lineColor="#000000"
                    />
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { size: auto; margin: 0; }
                    body { 
                        margin: 1cm; 
                        background: white; 
                    }
                    /* Ensure no background wrappers interfere */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default function PrintBarcodePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading barcode...</div>}>
            <PrintBarcodeContent />
        </Suspense>
    );
}
