'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Users,
  ShoppingBag,
  CheckCircle,
  Truck,
  Clock,
  Plus,
  ArrowRight,
  Package,
  AlertCircle,
  Eye,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useToast } from "@/hooks/use-toast";
import BarcodeScanner from '@/components/BarcodeScanner';
import { useRouter } from 'next/navigation';
import { Barcode, Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  const [activeFilter, setActiveFilter] = useState('all');
  const [activePage, setActivePage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const router = useRouter();
  const { isSupported, isSubscribed, isLoading: pushLoading, error: pushError, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    // Initial data load
    fetchData();
  }, []);

  useEffect(() => {
    // Reset to page 1 when filter changes
    setActivePage(1);
    fetchActiveOrders(1);
  }, [activeFilter]);

  useEffect(() => {
    // Fetch when page changes (but skip if it's the initial page 1 load activeFilter effect handles)
    // Actually, simpler to just have one effect for both dependencies or handle carefully.
    // Let's rely on fetchActiveOrders being called by UI handlers for page changes,
    // and this effect for filter changes.
  }, []);

  const fetchStatsAndDeliveries = async () => {
    try {
      const [statsRes, upcomingRes, staffRes] = await Promise.all([
        apiClient.get('/dashboard/stats'),
        apiClient.get('/dashboard/upcoming-deliveries'),
        apiClient.get('/users')
      ]);

      setStats(statsRes.data);
      setUpcomingDeliveries(upcomingRes.data);
      setStaffUsers(staffRes.data.filter((u: any) => u.role === 'STAFF'));
    } catch (error) {
      console.error('Failed to fetch dashboard stats/deliveries/staff:', error);
    }
  };

  const fetchActiveOrders = async (page = 1) => {
    setOrdersLoading(true);
    try {
      const params: any = { page, limit: 10 }; // Show 10 per slide
      if (activeFilter !== 'all') params.filter = activeFilter;

      const activeRes = await apiClient.get('/dashboard/active-orders', { params });

      // Handle both old array format (fallback) and new paginated format
      if (activeRes.data.pagination) {
        setActiveOrders(activeRes.data.data);
        setActiveTotalPages(activeRes.data.pagination.totalPages);
        setActivePage(activeRes.data.pagination.page);
      } else if (Array.isArray(activeRes.data)) {
        setActiveOrders(activeRes.data);
        setActiveTotalPages(1);
      }
    } catch (error) {
      console.error('Failed to fetch active orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= activeTotalPages) {
      fetchActiveOrders(newPage);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await fetchStatsAndDeliveries();
      await fetchActiveOrders(activePage);
    } catch (error) {
      console.error('Initial dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // Optimistic update
      setActiveOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      );

      await apiClient.patch(`/orders/${orderId}/status`, { status: newStatus });

      // Refresh stats to keep counters in sync
      const statsRes = await apiClient.get('/dashboard/stats');
      setStats(statsRes.data);

    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
      // Revert on failure
      fetchActiveOrders(activePage);
    }
  };

  const handleStaffAssignment = async (orderId: string, stage: string, userId: string) => {
    try {
      if (!userId) return; // Ignore if they select "Unassigned" for now, or we could support unassigning

      await apiClient.post('/work-assignments', {
        orderId,
        userId,
        stage,
      });

      toast({
        title: "Assigned!",
        description: "Staff successfully assigned to this stage.",
        variant: "success",
      });
      fetchActiveOrders(activePage);
    } catch (error) {
      console.error('Failed to assign staff:', error);
      toast({
        title: "Error",
        description: "Failed to assign staff",
        variant: "destructive",
      });
    }
  };

  const handleScan = async (code: string) => {
    try {
      setIsScannerOpen(false);
      toast({
        title: "Scanning...",
        description: `Looking for order ${code}`,
      });

      const response = await apiClient.get(`/orders/lookup/${code}`);
      const { id } = response.data;

      router.push(`/orders/${id}`);
    } catch (error: any) {
      console.error('Scan lookup error:', error);
      toast({
        title: "Order Not Found",
        description: error.response?.status === 404
          ? `No order found with ID ${code} in your account.`
          : "Failed to lookup order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">

      {isSupported && !isSubscribed && (
        <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-pink-600 to-rose-500 text-white px-5 py-3 rounded-xl shadow-md">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Enable Push Notifications</p>
              <p className="text-xs text-pink-100">Get alerts for overdue orders and upcoming deliveries — even when the tab is closed.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pushError && <span className="text-xs text-pink-200 max-w-[160px] truncate">{pushError}</span>}
            <button
              onClick={subscribe}
              disabled={pushLoading}
              className="bg-white text-pink-700 text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-pink-50 transition-colors disabled:opacity-60"
            >
              {pushLoading ? 'Enabling...' : 'Enable'}
            </button>
          </div>
        </div>
      )}

      {isSupported && isSubscribed && (
        <div className="flex items-center justify-end gap-2 text-xs text-emerald-600">
          <Bell className="w-3.5 h-3.5" />
          <span>Push notifications enabled</span>
          <button onClick={unsubscribe} className="text-slate-400 hover:text-slate-600 ml-1" title="Disable notifications">
            <BellOff className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Warning Floaters (Top) ── */}
      {(stats?.overdueOrders > 0 || upcomingDeliveries.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {stats?.overdueOrders > 0 && (
            <Link
              href="/orders?overdue=true"
              className="flex-1 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between group hover:bg-rose-100 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">Action Needed</p>
                  <p className="text-sm font-semibold text-rose-900">{stats.overdueOrders} Overdue Order{stats.overdueOrders !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {upcomingDeliveries.length > 0 && (
            <Link
              href="/orders"
              className="flex-1 bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-center justify-between group hover:bg-orange-100 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Upcoming</p>
                  <p className="text-sm font-semibold text-orange-900">{upcomingDeliveries.length} Deliver{upcomingDeliveries.length !== 1 ? 'ies' : 'y'} Due Soon</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            {getGreeting()}, <span className="text-pink-600">{user?.firstName || 'Admin'}</span>
          </h1>
          <p className="text-slate-500 mt-1">Here's what's happening in your boutique today.</p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/orders/new"
            className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-full hover:bg-pink-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Link>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
          >
            <Barcode className="w-4 h-4" />
            Scan Barcode
          </button>
          <Link
            href="/customers?new=true"
            className="flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-full border border-gray-200 hover:border-pink-200 hover:bg-pink-50 transition-all shadow-sm font-medium text-sm"
          >
            <Users className="w-4 h-4 text-pink-500" />
            Add Customer
          </Link>
          <Link
            href="/products?new=true"
            className="flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-full border border-gray-200 hover:border-pink-200 hover:bg-pink-50 transition-all shadow-sm font-medium text-sm"
          >
            <Package className="w-4 h-4 text-pink-500" />
            Add Product
          </Link>
          <Link
            href="/enquiries"
            className="flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-full border border-gray-200 hover:border-pink-200 hover:bg-pink-50 transition-all shadow-sm font-medium text-sm"
          >
            <MessageSquare className="w-4 h-4 text-pink-500" />
            Add Enquiry
          </Link>
          <Link
            href="/orders/new"
            className="flex items-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-full border border-gray-200 hover:border-pink-200 hover:bg-pink-50 transition-all shadow-sm font-medium text-sm"
          >
            <Plus className="w-4 h-4 text-pink-500" />
            Measurements
          </Link>
        </div>
      </div>

      {/* 1. Main Grid - Active Orders & Upcoming Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Active Orders */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-slate-800">Active Orders</h2>
              {/* Pagination Controls */}
              {activeTotalPages > 1 && (
                <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm p-0.5">
                  <button
                    onClick={() => handlePageChange(activePage - 1)}
                    disabled={activePage === 1 || ordersLoading}
                    className="p-1 text-slate-400 hover:text-pink-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-600 px-2 min-w-[3rem] text-center">
                    {activePage} / {activeTotalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(activePage + 1)}
                    disabled={activePage === activeTotalPages || ordersLoading}
                    className="p-1 text-slate-400 hover:text-pink-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200 shadow-inner overflow-x-auto max-w-full">
              {[
                { id: 'all', label: 'All' },
                { id: 'thisWeek', label: 'This Week' },
                { id: 'nextWeek', label: 'Next Week' },
                { id: 'thisMonth', label: 'This Month' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeFilter === filter.id
                    ? 'bg-white text-pink-600 shadow-sm border border-pink-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <Link href="/orders?active=true" className="text-sm font-medium text-pink-600 hover:text-pink-700 flex items-center gap-1 group">
              View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            {ordersLoading && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Attender</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-pink-50/30 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-slate-700">
                        <Link href={`/orders/${order.id}`} className="hover:text-pink-600 hover:underline transition-colors">
                          #{order.orderId}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-xs font-bold text-pink-600 shrink-0">
                            {order.customer.name.charAt(0)}
                          </div>
                          <span className="truncate max-w-[100px]">{order.customer.name}</span>
                          <WhatsAppButton mobile={order.customer.mobile} countryCode={order.customer.countryCode} />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(order.dueDate)}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        {order.attender ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium whitespace-nowrap">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[100px]" title={order.attender.name}>{order.attender.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <div className="relative">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`w-36 px-2 py-1 text-[10px] font-bold rounded-lg border focus:outline-none focus:ring-1 focus:ring-pink-300 cursor-pointer transition-colors appearance-none ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                              order.status === 'READY_TO_DELIVER' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                                order.status === 'ORDER_CREATED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' :
                                  order.status === 'DESIGNING_STARTED' ? 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100' :
                                    order.status === 'DESIGNING_COMPLETED' ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100' :
                                      order.status === 'CUTTING_STARTED' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                                        order.status === 'STITCHING_STARTED' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                                          'bg-gray-50 text-slate-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="ORDER_CREATED">Order Created</option>
                            <option value="DESIGNING_STARTED">Designing Started</option>
                            <option value="DESIGNING_COMPLETED">Designing Completed</option>
                            <option value="CUTTING_STARTED">Cutting Started</option>
                            <option value="CUTTING_COMPLETED">Cutting Completed</option>
                            <option value="STITCHING_STARTED">Stitching Started</option>
                            <option value="STITCHING_COMPLETED">Stitching Completed</option>
                            <option value="READY_TO_DELIVER">Ready to Deliver</option>
                            <option value="DELIVERED">Delivered</option>
                          </select>
                          {/* Current Assignee Display */}
                          {(() => {
                            // Find assignment that matches current status
                            const currentAssignment = order.workAssignments?.find((wa: any) => wa.stage === order.status);
                            if (currentAssignment) {
                              return (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full w-fit">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                  {currentAssignment.user?.firstName}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-slate-700">
                        {formatCurrency(order.grandTotal)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {activeOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No active orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upcoming Deliveries Sidebar */}
        <div className="lg:col-span-2 space-y-6 lg:mt-10">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-md font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-400" />
              Upcoming Deliveries
            </h3>
            <div className="space-y-3">
              {upcomingDeliveries.map((order) => (
                <div key={order.id} className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-pink-50 transition-colors border border-transparent hover:border-pink-100">
                  <div className="flex-col text-center min-w-[3rem] p-1.5 bg-slate-50 rounded-lg group-hover:bg-white group-hover:shadow-sm">
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">{new Date(order.dueDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span className="block text-lg font-bold text-slate-700">{new Date(order.dueDate).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{order.customer.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">#{order.orderId}</p>
                      <WhatsAppButton mobile={order.customer.mobile} countryCode={order.customer.countryCode} size="xs" />
                    </div>
                  </div>
                  <Link href={`/orders/${order.id}`} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-pink-600 group-hover:text-white transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
              {upcomingDeliveries.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No deliveries due soon.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visual Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          val={stats?.totalOrders}
          icon={ShoppingBag}
          gradient="from-pink-500 to-rose-500"
          href="/orders"
        />
        <StatCard
          title="Active Orders"
          val={stats?.pendingOrders}
          icon={Clock}
          gradient="from-orange-400 to-pink-400"
          href="/orders?active=true"
        />
        <StatCard
          title="Delivered Orders"
          val={stats?.deliveredOrders || 0}
          icon={CheckCircle}
          gradient="from-emerald-400 to-teal-500"
          href="/orders?status=DELIVERED"
        />
        <StatCard
          title="Overdue Orders"
          val={stats?.overdueOrders}
          icon={AlertCircle}
          gradient="from-red-500 to-rose-500"
          href="/orders?overdue=true"
        />
        <StatCard
          title="Active Enquiries"
          val={stats?.activeEnquiries ?? 0}
          icon={MessageSquare}
          gradient="from-indigo-400 to-violet-500"
          href="/enquiries"
        />
      </div>


      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-32 rounded-full" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  );
}

function StatCard({ title, val, icon: Icon, gradient, href }: any) {
  const CardContent = (
    <div className={`relative overflow-hidden bg-white p-4 rounded-xl shadow-sm border border-gray-100 group hover:shadow-md transition-all`}>
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
        <Icon className="w-16 h-16 text-slate-900" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5 tracking-tight">{val || 0}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block transform transition-transform hover:-translate-y-0.5">{CardContent}</Link>;
  }
  return <div className="block">{CardContent}</div>;
}


