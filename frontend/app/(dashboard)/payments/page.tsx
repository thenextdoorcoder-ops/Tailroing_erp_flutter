'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard, Search, Filter, FileDown } from 'lucide-react';
import { downloadCSV, csvDate } from '@/lib/csv-export';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await apiClient.get('/payments');
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-pink-600" />
            Payments
          </h1>
          <p className="text-slate-500 mt-1">Track comprehensive payment history.</p>
        </div>
        <button
          onClick={() => downloadCSV(
            `payments-${csvDate()}.csv`,
            ['Date', 'Order ID', 'Customer', 'Method', 'Amount (₹)'],
            payments.map(p => [
              formatDate(p.paymentDate),
              p.order?.orderId ?? '',
              p.customer?.name ?? '',
              p.paymentMethod ?? '',
              p.amount,
            ])
          )}
          disabled={payments.length === 0}
          className="flex items-center gap-2 bg-white border border-gray-200 text-slate-600 px-4 py-2.5 rounded-full hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <FileDown className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-pink-50/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800 font-bold">
                    {payment.order?.orderId}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {payment.customer?.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-slate-600">
                      {payment.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}