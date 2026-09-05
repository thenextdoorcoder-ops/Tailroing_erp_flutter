'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, Filter, ShoppingBag, FileDown } from 'lucide-react';
import { downloadCSV, csvDate } from '@/lib/csv-export';
import WhatsAppButton from '@/components/WhatsAppButton';

// Common country dial codes
const COUNTRY_CODES = [
  { code: '91', label: '🇮🇳 India (+91)' },
  { code: '1', label: '🇺🇸🇨🇦 USA/Canada (+1)' },
  { code: '44', label: '🇬🇧 UK (+44)' },
  { code: '61', label: '🇦🇺 Australia (+61)' },
  { code: '971', label: '🇦🇪 UAE (+971)' },
  { code: '966', label: '🇸🇦 Saudi Arabia (+966)' },
  { code: '65', label: '🇸🇬 Singapore (+65)' },
  { code: '60', label: '🇲🇾 Malaysia (+60)' },
  { code: '49', label: '🇩🇪 Germany (+49)' },
  { code: '33', label: '🇫🇷 France (+33)' },
  { code: '81', label: '🇯🇵 Japan (+81)' },
  { code: '86', label: '🇨🇳 China (+86)' },
  { code: '7', label: '🇷🇺 Russia (+7)' },
  { code: '55', label: '🇧🇷 Brazil (+55)' },
  { code: '27', label: '🇿🇦 South Africa (+27)' },
];

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Pagination & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    whatsapp: '',
    address: '',
    city: '',
    profession: '',
    email: '',
    countryCode: '91',
  });

  useEffect(() => {
    fetchCustomers(page, searchQuery);
    fetchStats();
    if (searchParams.get('new') === 'true') {
      setShowForm(true);
    }
  }, [page, searchParams]); // Don't add searchQuery here to avoid rapid firing, handle in separate effect or debounce

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to page 1 on new search
      fetchCustomers(1, searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCustomers = async (currentPage: number, search: string) => {
    try {
      setLoading(true);
      setError('');
      const params = { page: currentPage, limit: LIMIT, search };
      const response = await apiClient.get('/customers', { params });

      if (response.data.pagination) {
        setCustomers(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        // Fallback
        setCustomers(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch customers:', error);
      setError(error.response?.data?.error || 'Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handlePhoneChange = (field: 'mobile' | 'whatsapp', value: string) => {
    // Strip all non-digit characters (handles +, spaces, dashes, brackets)
    let num = value.replace(/\D/g, '');
    // If the pasted number already includes the selected country code prefix, remove it
    // e.g. pasting "+91 98765 43210" when India (+91) is selected → strip leading "91"
    const code = formData.countryCode;
    if (code && num.startsWith(code) && num.length > code.length) {
      num = num.substring(code.length);
    }
    setFormData(prev => ({ ...prev, [field]: num.substring(0, 15) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      const response = await apiClient.post('/customers', formData);
      setShowForm(false);

      // Auto-redirect to the new customer details page
      if (response.data && response.data.id) {
        router.push(`/customers/${response.data.id}`);
      } else {
        setFormData({
          name: '',
          mobile: '',
          whatsapp: '',
          address: '',
          city: '',
          profession: '',
          email: '',
          countryCode: '91',
        });
        fetchCustomers(1, ''); // Refresh list
      }
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      setError(error.response?.data?.error || 'Failed to create customer. Please try again.');
    }
  };

  const exportCSV = () => {
    downloadCSV(
      `customers-${csvDate()}.csv`,
      ['Name', 'Mobile', 'WhatsApp', 'Email', 'City', 'Address', 'Profession', 'Orders', 'Added On'],
      customers.map(c => [
        c.name,
        `+${c.countryCode ?? '91'} ${c.mobile}`,
        c.whatsapp ?? '',
        c.email ?? '',
        c.city ?? '',
        c.address ?? '',
        c.profession ?? '',
        c._count?.orders ?? 0,
        formatDate(c.createdAt),
      ])
    );
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/customers/${id}`);
      fetchCustomers(page, searchQuery);
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      alert(error.response?.data?.error || 'Failed to delete customer. Please try again.');
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
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your client details.
            {stats && (
              <span className="ml-2 font-medium text-slate-400">
                ({stats.totalCustomers} / {stats.customerLimit === 999999 ? '∞' : stats.customerLimit} used)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats?.totalCustomers >= stats?.customerLimit && !showForm && (
            <Link
              href="/subscription"
              className="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-2 rounded-full border border-pink-100 hover:bg-pink-100 transition-colors"
            >
              Upgrade for More Space
            </Link>
          )}
          <button
            onClick={exportCSV}
            disabled={customers.length === 0}
            className="flex items-center gap-2 bg-white border border-gray-200 text-slate-600 px-4 py-2.5 rounded-full hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export current page to CSV"
          >
            <FileDown className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={!showForm && stats?.totalCustomers >= stats?.customerLimit}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all shadow-md font-medium text-sm ${showForm
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
              }`}
          >
            {showForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Add New Customer</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </div>
      )}

      {/* Add Customer Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 animate-slideDown">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Customer Details</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Country</label>
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mobile *</label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-slate-600 font-medium shrink-0">+{formData.countryCode}</span>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => handlePhoneChange('mobile', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                  placeholder="Enter number without country code"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">WhatsApp</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => handlePhoneChange('whatsapp', e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                placeholder="WhatsApp number (optional)"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Profession</label>
              <input
                type="text"
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                placeholder="e.g. Teacher, Doctor"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                placeholder="City"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                placeholder="Full address"
              />
            </div>
            <div className="col-span-1 md:col-span-2 pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium shadow-sm hover:shadow-md transition-all"
              >
                Create Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, or city..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
          <span>Showing {customers.length} customers</span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mobile</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Orders</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((customer) => (
                <tr 
                  key={customer.id} 
                  className="hover:bg-pink-50/30 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{customer.name}</div>
                        {customer.profession && (
                          <div className="text-xs text-slate-500">{customer.profession}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>{customer.countryCode ? `+${customer.countryCode} ` : ''}{customer.mobile}</span>
                      <WhatsAppButton mobile={customer.mobile} countryCode={customer.countryCode} size="sm" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.city || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {customer._count?.orders || 0} orders
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div 
                      className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking actions
                    >
                      <Link
                        href={`/orders/new?customerId=${customer.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors text-xs font-semibold"
                        title="Create Order"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Create Order</span>
                      </Link>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {searchQuery ? 'No customers found matching your search.' : 'No customers found. Create your first one!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-800">{page}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
