'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (mode === 'camera') {
      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 100 }, // Rectangular for barcodes
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          onScan(decodedText);
          scanner.clear();
        },
        (error) => {
          // console.warn(error);
        }
      );

      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        }
      };
    }
  }, [mode, onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Camera className="w-5 h-5 text-pink-600" />
            Scan Order Barcode
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setMode('camera')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'camera' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
                }`}
            >
              <Camera className="w-4 h-4" /> Camera
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'manual' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
                }`}
            >
              <Keyboard className="w-4 h-4" /> Manual Entry
            </button>
          </div>

          {mode === 'camera' ? (
            <div className="relative">
              <div id="reader" className="overflow-hidden rounded-xl border-2 border-slate-100 min-h-[250px] bg-slate-50"></div>
              <p className="text-center text-xs text-slate-400 mt-4 italic">
                Hold the barcode steady within the scanning area.
              </p>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Order ID</label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. ORD2405001"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-100 focus:border-pink-500 outline-none transition-all font-mono"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                Search Order
              </button>
            </form>
          )}
        </div>

        <div className="p-4 bg-slate-50 text-center">
          <p className="text-[10px] text-slate-400">
            Powered by AntiGravity Barcode Engine v1.0
          </p>
        </div>
      </div>
    </div>
  );
}