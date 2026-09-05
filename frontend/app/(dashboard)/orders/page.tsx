'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from "next/link";
import { useSearchParams, useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ConfirmationModal';
import AlertModal from '@/components/AlertModal';
import { Plus, Filter, Trash2, Eye, Download, Edit2, Barcode, ArrowUpDown, FileDown, MessageSquare } from 'lucide-react';
import WhatsAppButton from '@/components/WhatsAppButton';
import { downloadCSV, csvDate } from '@/lib/csv-export';

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL
  const initialStatus = searchParams.get('status') || '';
  const initialActive = searchParams.get('active') === 'true' ? 'ACTIVE' : '';
  const initialOverdue = searchParams.get('overdue') === 'true' ? 'OVERDUE' : '';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialOverdue || initialActive || initialStatus);
  const [dueStartDate, setDueStartDate] = useState('');
  const [dueEndDate, setDueEndDate] = useState('');
  
  // Sorting
  const [sortOption, setSortOption] = useState('createdAt_desc');

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Alert State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ title: '', message: '', type: 'info' });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertConfig({ title, message, type });
    setAlertOpen(true);
  };

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (statusFilter === 'ACTIVE') {
        params.append('active', 'true');
      } else if (statusFilter === 'OVERDUE') {
        params.append('overdue', 'true');
      } else if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (dueStartDate) params.append('dueStartDate', dueStartDate);
      if (dueEndDate) params.append('dueEndDate', dueEndDate);

      params.append('page', page.toString());
      params.append('limit', '10');

      // Sorting
      const [sortBy, sortOrder] = sortOption.split('_');
      if (sortBy && sortOrder) {
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
      }

      const response = await apiClient.get(`/orders?${params.toString()}`);

      // Handle response structure change
      if (response.data.pagination) {
        setOrders(Array.isArray(response.data.data) ? response.data.data : []);
        setPagination(response.data.pagination);
      } else {
        // Fallback if backend hasn't updated yet or different structure
        setOrders(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await apiClient.get('/users');
      setStaffUsers(response.data.filter((u: any) => u.role === 'STAFF'));
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dueStartDate, dueEndDate, sortOption]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchOrders(newPage);
    }
  };

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteModalOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      await apiClient.delete(`/orders/${orderToDelete}`);
      fetchOrders(pagination.page); // Refresh current page
      showAlert('Success', 'Order deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete order:', error);
      showAlert('Error', 'Failed to delete order', 'error');
    }
  };

  const handleStaffAssignment = async (orderId: string, stage: string, userId: string) => {
    try {
      if (!userId) return; // Ignore unassign for now

      await apiClient.post('/work-assignments', {
        orderId,
        userId,
        stage,
      });

      showAlert('Success', 'Staff assigned successfully', 'success');
      fetchOrders(pagination.page);
    } catch (error) {
      console.error('Failed to assign staff:', error);
      showAlert('Error', 'Failed to assign staff', 'error');
    }
  };

  const exportCSV = () => {
    downloadCSV(
      `orders-${csvDate()}.csv`,
      ['Order ID', 'Date', 'Customer', 'Mobile', 'Due Date', 'Status', 'Items', 'Total (₹)', 'Balance Due (₹)', 'Attender'],
      orders.map(o => [
        `#${o.orderId}`,
        formatDate(o.createdAt),
        o.customer?.name,
        `+${o.customer?.countryCode ?? '91'} ${o.customer?.mobile}`,
        formatDate(o.dueDate),
        o.status?.replace(/_/g, ' '),
        o._count?.orderItems ?? 0,
        o.grandTotal,
        o.balanceDue,
        o.attender?.name ?? '',
      ])
    );
  };

  const notifyReadyOrders = () => {
    const readyOrders = orders.filter(o => o.status === 'READY_TO_DELIVER');
    if (readyOrders.length === 0) return;
    if (!window.confirm(`Open WhatsApp for ${readyOrders.length} customer${readyOrders.length !== 1 ? 's' : ''}? Your browser may ask to allow popups.`)) return;
    readyOrders.forEach((order, i) => {
      setTimeout(() => {
        const msg = `Dear ${order.customer.name}, your order #${order.orderId} is ready for delivery/pickup! Please contact us to schedule. Thank you 🙏`;
        const num = `${order.customer.countryCode ?? '91'}${order.customer.mobile}`;
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
      }, i * 600);
    });
  };

  const downloadInvoice = (orderId: string) => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api');
    const token = localStorage.getItem('token');
    window.open(`${baseURL}/pdf/invoice/${orderId}?token=${token}`, '_blank');
  };

  const downloadBarcode = (orderId: string) => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api');
    const token = localStorage.getItem('token');
    window.open(`${baseURL}/pdf/barcode/${orderId}?token=${token}`, '_blank');
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      ORDER_CREATED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      DESIGNING_STARTED: 'bg-pink-100 text-pink-700 border-pink-200',
      DESIGNING_COMPLETED: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
      CUTTING_STARTED: 'bg-purple-100 text-purple-700 border-purple-200',
      CUTTING_COMPLETED: 'bg-purple-50 text-purple-600 border-purple-200',
      STITCHING_STARTED: 'bg-amber-100 text-amber-700 border-amber-200',
      STITCHING_COMPLETED: 'bg-amber-50 text-amber-600 border-amber-200',
      READY_TO_DELIVER: 'bg-blue-100 text-blue-700 border-blue-200',
      DELIVERED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage customer orders.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={exportCSV}
            disabled={orders.length === 0}
            className="flex items-center gap-2 bg-white border border-gray-200 text-slate-600 px-4 py-2.5 rounded-full hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export current page to CSV"
          >
            <FileDown className="w-4 h-4" />
            Export CSV
          </button>
          <Link
            href="/orders/new"
            className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-full hover:bg-pink-700 transition-all shadow-md hover:shadow-lg font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Order
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-auto flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Status</label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-sm appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Orders (In Progress)</option>
              <option value="OVERDUE">Overdue Orders</option>
              <option value="ORDER_CREATED">Order Created</option>
              <option value="DESIGNING_STARTED">Designing Started</option>
              <option value="DESIGNING_COMPLETED">Designing Completed</option>
              <option value="CUTTING_STARTED">Cutting Started</option>
              <option value="CUTTING_COMPLETED">Cutting Completed</option>
              <option value="STITCHING_STARTED">Stitching Started</option>
              <option value="STITCHING_COMPLETED">Stitching Completed</option>
              <option value="READY_TO_DELIVER">Ready to Deliver</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Due Date From</label>
          <input
            type="date"
            value={dueStartDate}
            onChange={(e) => setDueStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-sm"
          />
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Due Date To</label>
          <input
            type="date"
            value={dueEndDate}
            onChange={(e) => setDueEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-sm"
          />
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Sort By</label>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-sm appearance-none min-w-[200px]"
            >
              <option value="createdAt_desc">Newest Orders</option>
              <option value="createdAt_asc">Oldest Orders</option>
              <option value="dueDate_asc">Due Date (Earliest First)</option>
              <option value="dueDate_desc">Due Date (Latest First)</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setStatusFilter('');
            setDueStartDate('');
            setDueEndDate('');
            setSortOption('createdAt_desc');
          }}
          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors h-[38px]"
        >
          Clear
        </button>
      </div>

      {/* Bulk WhatsApp Banner — shown when any READY_TO_DELIVER orders are in current page */}
      {orders.some(o => o.status === 'READY_TO_DELIVER') && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <p className="text-sm font-semibold text-blue-800">
              {orders.filter(o => o.status === 'READY_TO_DELIVER').length} order
              {orders.filter(o => o.status === 'READY_TO_DELIVER').length !== 1 ? 's' : ''} ready to deliver on this page
            </p>
          </div>
          <button
            onClick={notifyReadyOrders}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors shadow-sm shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Notify All via WhatsApp
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.isArray(orders) && orders.length > 0 ? (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-pink-50/30 transition-colors group">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/orders/${order.id}`} className="text-pink-600 hover:text-pink-800 hover:underline">
                        #{order.orderId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">{order.customer.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-400">
                            {order.customer.countryCode ? `+${order.customer.countryCode} ` : ''}
                            {order.customer.mobile}
                          </span>
                          <WhatsAppButton mobile={order.customer.mobile} countryCode={order.customer.countryCode} size="xs" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {order.attender?.name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {order._count?.orderItems || 0} items
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(order.dueDate)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {formatCurrency(order.grandTotal)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                      {formatCurrency(order.balanceDue)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const currentAssignment = order.workAssignments?.find((wa: any) => wa.stage === order.status);
                        return (
                          <div className="w-32">
                            <select
                              value={currentAssignment?.userId || ""}
                              onChange={(e) => handleStaffAssignment(order.id, order.status, e.target.value)}
                              className="w-full px-2 py-1 text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 cursor-pointer transition-colors appearance-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">+ Assign Staff</option>
                              {Array.from(new Set(staffUsers.map(s => s.staffRole))).map(role => (
                                <optgroup key={role} label={role ? role.replace(/_/g, ' ') : 'General'}>
                                  {staffUsers.filter(s => s.staffRole === role).map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                      {staff.firstName} {staff.lastName?.charAt(0)}.
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/orders/${order.id}`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/orders/${order.id}/edit`}
                          className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                          title="Edit Order"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <WhatsAppButton mobile={order.customer.mobile} countryCode={order.customer.countryCode} />
                        <button
                          onClick={() => downloadBarcode(order.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Download Barcode"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadInvoice(order.id)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Download Invoice"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(order.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                !loading && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No orders found matching your filters.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-slate-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> orders
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
            >
              Result
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteOrder}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
      />

      <AlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
}
