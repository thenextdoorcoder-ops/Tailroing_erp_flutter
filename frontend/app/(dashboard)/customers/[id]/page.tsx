'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { User, Phone, MapPin, Mail, Briefcase, Calendar, ChevronLeft, ShoppingBag, Edit2, Clock, CheckCircle } from 'lucide-react';
import WhatsAppButton from '@/components/WhatsAppButton';
import MeasurementSection from '@/components/measurements/MeasurementSection';

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'measurements'>('profile');

  useEffect(() => {
    if (id) fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/customers/${id}`);
      setCustomer(response.data);
    } catch (err: any) {
      console.error('Failed to fetch customer:', err);
      setError(err.response?.data?.error || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: any = {
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
    COMPLETED: 'bg-green-50 text-green-700 border-green-200',
    DELIVERED: 'bg-purple-50 text-purple-700 border-purple-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl flex items-center justify-between">
          <span>{error || 'Customer not found'}</span>
          <button onClick={() => router.push('/customers')} className="text-sm font-medium hover:underline">
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* ── Breadcrumb & Actions ────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link 
          href="/customers" 
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Customers
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/orders/new?customerId=${customer.id}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors font-medium shadow-sm hover:shadow"
          >
            <ShoppingBag className="w-4 h-4" />
            Create Order
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: Profile Card ───────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-pink-50 to-white px-6 py-8 border-b border-gray-100 flex flex-col items-center relative group">
              <Link 
                href={`/customers/${customer.id}/edit`} 
                className="absolute top-4 right-4 p-2 bg-white/50 backdrop-blur-sm rounded-full text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Edit Customer"
              >
                <Edit2 className="w-4 h-4" />
              </Link>
              <div className="w-20 h-20 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-3xl font-bold mb-4 shadow-sm ring-4 ring-white">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-xl font-bold text-slate-900 text-center">{customer.name}</h1>
              {customer.profession && (
                <p className="text-slate-500 text-sm mt-1">{customer.profession}</p>
              )}
            </div>
            
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm font-medium">+{customer.countryCode || '91'} {customer.mobile}</span>
                  <WhatsAppButton mobile={customer.mobile} countryCode={customer.countryCode} size="sm" />
                </div>
              </div>
              
              {customer.email && (
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-sm">{customer.email}</span>
                </div>
              )}

              <div className="flex flex-col gap-1 text-slate-600 pt-2 border-t border-gray-50">
                <div className="flex items-start gap-3 mt-2">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-sm">
                    {customer.address ? (
                      <>
                        <p>{customer.address}</p>
                        {customer.city && <p className="text-slate-500 mt-0.5">{customer.city}</p>}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">No address provided</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-600 pt-3 border-t border-gray-50">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-slate-500">Customer Since</p>
                  <p>{formatDate(customer.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Tabs (Orders/Measurements) ───── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-4 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'profile'
                    ? 'border-pink-600 text-pink-600 bg-pink-50/30'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                Order History
              </button>
              <button
                onClick={() => setActiveTab('measurements')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === 'measurements'
                    ? 'border-pink-600 text-pink-600 bg-pink-50/30'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                Measurements Hub
                {!customer.measurement?.length && (
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                )}
              </button>
            </div>

            <div className="p-6">
              {/* Order History Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Recent Orders</h3>
                    <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
                      {customer.orders?.length || 0} Total
                    </span>
                  </div>

                  {customer.orders && customer.orders.length > 0 ? (
                    <div className="space-y-3">
                      {customer.orders.map((order: any) => (
                        <Link 
                          href={`/orders/${order.id}`} 
                          key={order.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-pink-200 hover:bg-pink-50/30 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {order.status === 'COMPLETED' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-2">
                                {order.orderNumber}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusColors[order.status] || statusColors.PENDING}`}>
                                  {order.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Ordered {formatDate(order.createdAt)} • Due {formatDate(order.dueDate)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">{formatCurrency(order.grandTotal)}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {order.balanceDue > 0 ? (
                                <span className="text-red-600 font-medium">{formatCurrency(order.balanceDue)} due</span>
                              ) : (
                                <span className="text-green-600 font-medium">Paid in full</span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No orders found for this customer.</p>
                      <p className="text-sm text-slate-400 mt-1">Create their first order to get started.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Measurements Tab */}
              {activeTab === 'measurements' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 text-sm flex gap-3">
                    <div className="mt-0.5 text-blue-500">💡</div>
                    <div>
                      <p className="font-medium">Save measurements securely</p>
                      <p className="text-blue-600/80 mt-1">
                        Select a category below to load, edit, or save new measurements for <b>{customer.name}</b>. You can do this at any time, even without creating an order first.
                      </p>
                    </div>
                  </div>

                  <MeasurementSection
                    customerId={customer.id}
                    customerName={customer.name}
                    onSaved={() => {
                       // Refresh customer data to update measurement counts
                       fetchCustomerDetails();
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
