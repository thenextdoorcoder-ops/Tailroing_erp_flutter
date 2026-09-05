'use client';

import React, {
    useRef,
    useEffect,
    useState,
    useCallback,
    useImperativeHandle,
    forwardRef,
} from 'react';
import { Pencil, Eraser, Trash2, Undo2 } from 'lucide-react';

// ── Public API exposed via ref ───────────────────────────────────────────────
export interface SketchCanvasHandle {
    getDataUrl: () => string;
    isEmpty: () => boolean;
    clear: () => void;
}

interface Props {
    defaultDataUrl?: string;
    disabled?: boolean;
}

type Tool = 'pen' | 'eraser';

const COLORS = ['#1e293b', '#ef4444', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];
const STROKE_SIZES = [2, 5, 10];

const SketchCanvas = forwardRef<SketchCanvasHandle, Props>(
    ({ defaultDataUrl, disabled = false }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const historyRef = useRef<ImageData[]>([]);
        const isDrawingRef = useRef(false);
        const lastPointRef = useRef<{ x: number; y: number } | null>(null);

        const [tool, setTool] = useState<Tool>('pen');
        const [color, setColor] = useState('#1e293b');
        const [size, setSize] = useState(1); // index into STROKE_SIZES

        // ── Helpers ──────────────────────────────────────────────────────────────
        const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

        const getPos = (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            if ('touches' in e) {
                const touch = e.touches[0];
                return {
                    x: (touch.clientX - rect.left) * scaleX,
                    y: (touch.clientY - rect.top) * scaleY,
                };
            }
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        };

        const saveHistory = useCallback(() => {
            const ctx = getCtx();
            const canvas = canvasRef.current;
            if (!ctx || !canvas) return;
            historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            if (historyRef.current.length > 40) historyRef.current.shift();
        }, []);

        const fillBackground = useCallback(() => {
            const ctx = getCtx();
            const canvas = canvasRef.current;
            if (!ctx || !canvas) return;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }, []);

        // ── Init canvas ──────────────────────────────────────────────────────────
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Set internal resolution for crisp drawing
            canvas.width = 900;
            canvas.height = 500;
            fillBackground();

            if (defaultDataUrl) {
                const img = new Image();
                img.onload = () => getCtx()?.drawImage(img, 0, 0);
                img.src = defaultDataUrl;
            }
            saveHistory();
        }, []);

        // ── Exposed methods ───────────────────────────────────────────────────────
        useImperativeHandle(ref, () => ({
            getDataUrl: () => canvasRef.current?.toDataURL('image/png') ?? '',
            isEmpty: () => {
                const ctx = getCtx();
                const canvas = canvasRef.current;
                if (!ctx || !canvas) return true;
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                return data.every((v, i) => i % 4 !== 3 || v === 0 || (data[i - 1] === 255 && data[i - 2] === 255 && data[i - 3] === 255));
            },
            clear: () => {
                saveHistory();
                fillBackground();
            },
        }));

        // ── Drawing ───────────────────────────────────────────────────────────────
        const startDraw = useCallback(
            (e: React.MouseEvent | React.TouchEvent) => {
                if (disabled) return;
                e.preventDefault();
                saveHistory();
                isDrawingRef.current = true;
                lastPointRef.current = getPos(e);

                const ctx = getCtx();
                if (!ctx) return;
                ctx.beginPath();
                ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            },
            [disabled, saveHistory]
        );

        const draw = useCallback(
            (e: React.MouseEvent | React.TouchEvent) => {
                if (!isDrawingRef.current) return;
                e.preventDefault();
                const ctx = getCtx();
                if (!ctx) return;

                const pos = getPos(e);

                ctx.lineWidth = STROKE_SIZES[size];
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (tool === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.strokeStyle = 'rgba(0,0,0,1)';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.strokeStyle = color;
                }

                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                lastPointRef.current = pos;
            },
            [tool, color, size]
        );

        const stopDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            const ctx = getCtx();
            if (ctx) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.closePath();
            }
            isDrawingRef.current = false;
            lastPointRef.current = null;
        }, []);

        const undo = useCallback(() => {
            const ctx = getCtx();
            const canvas = canvasRef.current;
            if (!ctx || !canvas || historyRef.current.length < 2) return;
            historyRef.current.pop();
            const prev = historyRef.current[historyRef.current.length - 1];
            ctx.putImageData(prev, 0, 0);
        }, []);

        const clearAll = useCallback(() => {
            saveHistory();
            fillBackground();
        }, [saveHistory, fillBackground]);

        // ── Attach non-passive touch listeners manually to avoid warnings ───────
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Type cast the callbacks slightly for native events
            const onTouchStart = (e: TouchEvent) => startDraw(e as unknown as React.TouchEvent);
            const onTouchMove = (e: TouchEvent) => draw(e as unknown as React.TouchEvent);
            const onTouchEnd = (e: TouchEvent) => stopDraw(e as unknown as React.TouchEvent);

            canvas.addEventListener('touchstart', onTouchStart, { passive: false });
            canvas.addEventListener('touchmove', onTouchMove, { passive: false });
            canvas.addEventListener('touchend', onTouchEnd, { passive: false });
            canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

            return () => {
                canvas.removeEventListener('touchstart', onTouchStart);
                canvas.removeEventListener('touchmove', onTouchMove);
                canvas.removeEventListener('touchend', onTouchEnd);
                canvas.removeEventListener('touchcancel', onTouchEnd);
            };
        }, [startDraw, draw, stopDraw]);

        // ── Render ────────────────────────────────────────────────────────────────
        return (
            <div className="flex flex-col gap-3">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {/* Tool toggle */}
                    <div className="flex items-center bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTool('pen')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${tool === 'pen'
                                ? 'bg-pink-600 text-white'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            Pen
                        </button>
                        <button
                            type="button"
                            onClick={() => setTool('eraser')}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${tool === 'eraser'
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <Eraser className="w-3.5 h-3.5" />
                            Eraser
                        </button>
                    </div>

                    {/* Color palette */}
                    <div className="flex items-center gap-1.5">
                        {COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => { setColor(c); setTool('pen'); }}
                                style={{ backgroundColor: c }}
                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c && tool === 'pen'
                                    ? 'border-white ring-2 ring-pink-400 scale-110'
                                    : 'border-white/70'
                                    }`}
                                title={c}
                            />
                        ))}
                    </div>

                    {/* Stroke size */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        {STROKE_SIZES.map((s, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setSize(i)}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${size === i
                                    ? 'bg-pink-100 border-pink-300 text-pink-700'
                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                    }`}
                                title={`Size ${s}px`}
                            >
                                <span
                                    className="rounded-full bg-current"
                                    style={{ width: s + 4, height: s + 4, display: 'block' }}
                                />
                            </button>
                        ))}
                    </div>

                    {/* Undo & Clear */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={undo}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            <Undo2 className="w-3.5 h-3.5" />
                            Undo
                        </button>
                        <button
                            type="button"
                            onClick={clearAll}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div
                    className="relative rounded-xl overflow-hidden border-2 border-dashed border-slate-200 bg-white"
                    style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
                >
                    <canvas
                        ref={canvasRef}
                        className="w-full touch-none"
                        style={{ display: 'block', touchAction: 'none' }}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                    />
                    {disabled && (
                        <div className="absolute inset-0 bg-gray-50/70 flex items-center justify-center">
                            <span className="text-sm text-slate-400">Select a customer to enable sketch</span>
                        </div>
                    )}
                </div>

                <p className="text-xs text-slate-400 text-center">
                    💡 Sketch the design — neckline, sleeve style, blouse cut, etc. Saved with the order.
                </p>
            </div>
        );
    }
);

SketchCanvas.displayName = 'SketchCanvas';
export default SketchCanvas;
