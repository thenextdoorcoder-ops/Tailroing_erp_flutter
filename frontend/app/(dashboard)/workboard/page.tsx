'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { LayoutGrid, Filter, Calendar, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import WhatsAppButton from '@/components/WhatsAppButton';

const ORDERS_PER_PAGE = 5;

interface Order {
  id: string;
  orderId: string;
  customer: {
    name: string;
    mobile: string;
    countryCode: string | null;
  };
  status: string;
  dueDate: string;
  createdAt: string;
}

const STATUS_COLUMNS = [
  { id: 'ORDER_CREATED', label: 'Order Created', color: 'bg-purple-50 border-purple-200 text-purple-800' },
  { id: 'DESIGNING_STARTED', label: 'Designing Started', color: 'bg-pink-50 border-pink-200 text-pink-800' },
  { id: 'DESIGNING_COMPLETED', label: 'Designing Completed', color: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800' },
  { id: 'CUTTING_STARTED', label: 'Cutting Started', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { id: 'CUTTING_COMPLETED', label: 'Cutting Completed', color: 'bg-orange-50 border-orange-200 text-orange-800' },
  { id: 'STITCHING_STARTED', label: 'Stitching Started', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { id: 'STITCHING_COMPLETED', label: 'Stitching Completed', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  { id: 'READY_TO_DELIVER', label: 'Ready to Deliver', color: 'bg-green-50 border-green-200 text-green-800' },
];

export default function WorkBoardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonths, setFilterMonths] = useState(2); // Default 2 months
  const [columnPages, setColumnPages] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchOrders();
  }, [filterMonths]);

  const fetchOrders = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - filterMonths);

      const response = await apiClient.get('/orders', {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          limit: 1000 // Get all active work for the board
        }
      });

      // Handle paginated response structure
      let fetchedOrders: Order[] = [];
      if (response.data.data && Array.isArray(response.data.data)) {
        fetchedOrders = response.data.data;
      } else if (Array.isArray(response.data)) {
        fetchedOrders = response.data;
      } else {
        fetchedOrders = [];
      }

      // Filter out 'DELIVERED' orders
      const filtered = fetchedOrders.filter((order: Order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED');
      setOrders(filtered);

    } catch (error) {
      console.error('Failed to fetch workboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter((order) => order.status === status);
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgencyColor = (daysUntil: number): string => {
    if (daysUntil < 0) return 'border-l-4 border-red-500';
    if (daysUntil <= 2) return 'border-l-4 border-orange-500';
    if (daysUntil <= 5) return 'border-l-4 border-yellow-500';
    return 'border-l-4 border-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header with Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-pink-600" />
            Production Work Board
          </h1>
          <p className="text-slate-500 mt-1">Track order progress from cutting to delivery.</p>
        </div>

        {/* 🆕 Filter Dropdown */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <label className="text-sm font-medium text-slate-700">Show from:</label>
          <select
            value={filterMonths}
            onChange={(e) => setFilterMonths(parseInt(e.target.value))}
            className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-pink-600 transition-colors"
          >
            <option value={1}>Last 1 month</option>
            <option value={2}>Last 2 months</option>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 1 year</option>
          </select>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Active Orders</p>
          <p className="text-3xl font-bold text-slate-800">{orders.length}</p>
        </div>

        {orders.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-700 rounded-full text-sm font-medium">
            <Calendar className="w-4 h-4" />
            Showing orders from last {filterMonths} month{filterMonths > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-[1000px] lg:grid lg:grid-cols-4 lg:min-w-0">
          {STATUS_COLUMNS.map((column) => {
            const columnOrders = getOrdersByStatus(column.id);

            return (
              <div key={column.id} className="flex flex-col min-w-[280px] lg:min-w-0">
                {/* Column Header */}
                <div className={`${column.color} border border-b-0 rounded-t-xl p-3`}>
                  <h3 className="font-bold text-xs uppercase tracking-wide flex justify-between items-center">
                    <span className="truncate mr-2">{column.label}</span>
                    <span className="bg-white/50 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                      {columnOrders.length}
                    </span>
                  </h3>
                </div>

                {/* Column Body */}
                <div className="flex-1 bg-gray-50/50 border border-gray-200 rounded-b-xl p-3 min-h-[500px] flex flex-col">
                  <div className="flex-1 space-y-3">
                    {columnOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 opacity-50">
                        <div className="w-12 h-12 bg-gray-100 rounded-full mb-2" />
                        <p className="text-xs text-gray-400 font-medium">No orders</p>
                      </div>
                    ) : (
                      (() => {
                        const totalPages = Math.ceil(columnOrders.length / ORDERS_PER_PAGE);
                        const currentPage = columnPages[column.id] || 1;
                        const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
                        const paginatedOrders = columnOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);

                        return paginatedOrders.map((order) => {
                          const daysUntil = getDaysUntilDue(order.dueDate);
                          return (
                            <div
                              key={order.id}
                              onClick={() => handleOrderClick(order.id)}
                              className={`bg-white rounded-lg p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer border border-gray-100 group relative overflow-hidden ${getUrgencyColor(
                                daysUntil
                              )}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-800 text-sm group-hover:text-pink-600 transition-colors">
                                  {order.orderId}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>

                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm text-slate-600 font-medium truncate">
                                  {order.customer.name}
                                </p>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <WhatsAppButton mobile={order.customer.mobile} countryCode={order.customer.countryCode} size="xs" />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  Due: <span className="text-slate-600 font-medium">{new Date(order.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                </p>

                                {daysUntil < 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                                    OVERDUE
                                  </span>
                                ) : daysUntil === 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100">
                                    TODAY
                                  </span>
                                ) : daysUntil <= 2 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100">
                                    {daysUntil}d left
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">{daysUntil}d left</span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>

                  {/* Column Pagination Controls */}
                  {columnOrders.length > ORDERS_PER_PAGE && (
                    <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                      <button
                        disabled={(columnPages[column.id] || 1) <= 1}
                        onClick={() => setColumnPages(prev => ({
                          ...prev,
                          [column.id]: (prev[column.id] || 1) - 1
                        }))}
                        className="p-1 rounded hover:bg-white disabled:opacity-30 text-slate-400 hover:text-pink-600 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-bold text-slate-500">
                        {columnPages[column.id] || 1} / {Math.ceil(columnOrders.length / ORDERS_PER_PAGE)}
                      </span>
                      <button
                        disabled={(columnPages[column.id] || 1) >= Math.ceil(columnOrders.length / ORDERS_PER_PAGE)}
                        onClick={() => setColumnPages(prev => ({
                          ...prev,
                          [column.id]: (prev[column.id] || 1) + 1
                        }))}
                        className="p-1 rounded hover:bg-white disabled:opacity-30 text-slate-400 hover:text-pink-600 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Priority Legend</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-red-500 bg-red-50 rounded-sm"></div>
            <span className="text-xs text-slate-600 font-medium">Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-orange-500 bg-orange-50 rounded-sm"></div>
            <span className="text-xs text-slate-600 font-medium">Due within 2 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-yellow-500 bg-yellow-50 rounded-sm"></div>
            <span className="text-xs text-slate-600 font-medium">Due in 3-5 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-l-4 border-green-500 bg-green-50 rounded-sm"></div>
            <span className="text-xs text-slate-600 font-medium">Due in 6+ days</span>
          </div>
        </div>
      </div>
    </div>
  );
}