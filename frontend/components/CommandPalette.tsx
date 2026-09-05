'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Search, X, ArrowRight, Loader2, Users, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus & reset on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setCustomers([]);
      setOrders([]);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setCustomers([]);
      setOrders([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const [custRes, ordRes] = await Promise.all([
          apiClient.get('/customers', { params: { search: q, limit: 4 } }),
          apiClient.get('/orders', { params: { search: q, limit: 4 } }),
        ]);
        const custData = custRes.data?.data ?? (Array.isArray(custRes.data) ? custRes.data : []);
        const ordData  = ordRes.data?.data  ?? (Array.isArray(ordRes.data)  ? ordRes.data  : []);
        setCustomers(custData.slice(0, 4));
        setOrders(ordData.slice(0, 4));
      } catch { } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const navigate = (url: string) => {
    onClose();
    router.push(url);
  };

  if (!open) return null;

  const hasResults = customers.length > 0 || orders.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          {searching
            ? <Loader2 size={18} className="text-slate-400 animate-spin shrink-0" />
            : <Search size={18} className="text-slate-400 shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search customers, orders…"
            className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
            autoComplete="off"
          />
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-slate-600 transition-colors rounded">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto">
          {!query.trim() && (
            <div className="py-10 text-center text-slate-400 text-sm">
              Start typing to search customers or orders
            </div>
          )}

          {query.trim() && !searching && !hasResults && (
            <div className="py-10 text-center text-slate-400 text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {customers.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <Users size={11} className="text-slate-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customers</p>
              </div>
              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pink-50 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm shrink-0">
                    {c.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">+{c.countryCode ?? '91'} {c.mobile}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-pink-500 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {orders.length > 0 && (
            <div className={`p-2 ${customers.length > 0 ? 'border-t border-slate-50' : ''}`}>
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <ShoppingCart size={11} className="text-slate-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Orders</p>
              </div>
              {orders.map(o => (
                <button
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pink-50 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] shrink-0">
                    #{String(o.orderId ?? '').slice(-3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      #{o.orderId} — {o.customer?.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {o.status?.replace(/_/g, ' ')} · {formatCurrency(o.grandTotal)}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-pink-500 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 px-1.5 py-0.5 rounded">↵</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-slate-100 px-1.5 py-0.5 rounded">Esc</kbd> Close
          </span>
          <span className="ml-auto">⌘K to reopen</span>
        </div>
      </div>
    </div>
  );
}
