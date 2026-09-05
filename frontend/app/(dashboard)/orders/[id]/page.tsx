'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { formatDate, formatCurrency } from '@/lib/utils';
import AttachmentGallery from '@/components/AttachmentGallery';
import MeasurementDisplay from '@/components/measurements/MeasurementDisplay';
import EditMeasurementModal from '@/components/measurements/EditMeasurementModal';
import PaymentModal from '@/components/PaymentModal';
import {
  CornerUpLeft, Edit2, Download, Clock, User, Phone,
  ShoppingBag, Mic, Paperclip, Ruler, CreditCard, ChevronDown, Plus, Layers
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [editingMeasurement, setEditingMeasurement] = useState<any | null>(null);

  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');

  // ==============================
  // FETCH ORDER
  // ==============================
  useEffect(() => {
    if (params?.id) {
      fetchOrder();
      fetchStaff();
    }
  }, [params?.id]);

  const fetchOrder = async () => {
    try {
      const response = await apiClient.get(`/orders/${params?.id}`);
      const orderData = response.data;
      setOrder(orderData);
      setSelectedStatus(orderData.status);

      if (orderData.customerId) {
        fetchOrderMeasurements(orderData.customerId, orderData.id);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderMeasurements = async (customerId: string, orderId: string) => {
    try {
      const response = await apiClient.get(`/measurements/customer/${customerId}`);

      // 1. Get measurements explicitly linked to THIS order
      const directMeasurements = response.data.filter(
        (m: any) => m.orderId === orderId
      );

      if (directMeasurements.length > 0) {
        // If order has its own measurements, show ONLY those
        setMeasurements(directMeasurements);
      } else {
        // 2. Fallback: Show latest profile measurements (ones with no orderId)
        const profileMeasurements = response.data.filter((m: any) => !m.orderId);

        const latestByType: Record<string, any> = {};
        profileMeasurements.forEach((m: any) => {
          if (!latestByType[m.type] || new Date(m.createdAt) > new Date(latestByType[m.type].createdAt)) {
            latestByType[m.type] = m;
          }
        });

        setMeasurements(Object.values(latestByType));
      }
    } catch (error) {
      console.error('Failed to fetch measurements:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await apiClient.get('/users');
      // Ensure only staff users are selectable
      const staffList = response.data.filter((u: any) => u.role === 'STAFF');
      setStaffUsers(staffList);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  // ==============================
  const handleStatusUpdate = async () => {
    if (
      (selectedStatus === 'DELIVERED' || selectedStatus === 'READY_TO_DELIVER') &&
      order.balanceDue > 0
    ) {
      setPendingStatus(selectedStatus);
      setShowPaymentModal(true);
      return;
    }

    await updateStatus(selectedStatus);
  };

  const updateStatus = async (status: string) => {
    try {
      await apiClient.patch(`/orders/${params?.id}/status`, {
        status: status,
      });
      toast({
        title: "Success",
        description: "Status updated successfully",
        variant: "success",
      });
      fetchOrder();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handlePaymentConfirm = async (amount: number, method: string, notes: string) => {
    try {
      await apiClient.post('/payments', {
        orderId: order.id,
        amount: amount,
        paymentMethod: method,
        notes: notes || `Payment collected during status update to ${pendingStatus}`,
      });

      await updateStatus(pendingStatus);

      setShowPaymentModal(false);
      setPendingStatus('');
    } catch (error) {
      console.error('Payment processing failed:', error);
      toast({
        title: "Error",
        description: "Failed to process payment. Status not updated.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // ==============================
  // DELETE ATTACHMENT
  // ==============================
  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await apiClient.delete(`/attachments/${attachmentId}`);
      fetchOrder();
    } catch (error) {
      console.error('Delete attachment error:', error);
      toast({
        title: "Error",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    }
  };

  // ==============================
  // DOWNLOAD INVOICE
  // ==============================
  const downloadInvoice = () => {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api');
    const token = localStorage.getItem('token');
    window.open(`${baseURL}/pdf/invoice/${params?.id}?token=${token}&t=${Date.now()}`, '_blank');
  };

  const sectionClass = "bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fadeIn";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!order) return <div className="p-8 text-center text-slate-500">Order not found</div>;

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center text-slate-500 hover:text-pink-600 mb-2 text-sm font-medium transition-colors"
          >
            <CornerUpLeft className="w-4 h-4 mr-1" /> Back to Orders
          </button>

          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            Order #{order.orderId}
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
              order.status === 'READY_TO_DELIVER' ? 'bg-blue-100 text-blue-700' :
                order.status === 'ORDER_CREATED' ? 'bg-purple-100 text-purple-700' :
                  'bg-yellow-100 text-yellow-700'
              }`}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Created on {formatDate(order.createdAt)}</span>
            <span className="hidden md:inline">•</span>
            <span className="flex items-center gap-1 text-pink-600 font-medium"><Clock className="w-4 h-4" /> Due {formatDate(order.dueDate)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              const orderDetails = `*Order #${order.orderId}*
*Status:* ${order.status.replace(/_/g, ' ')}
*Due Date:* ${formatDate(order.dueDate)}

*Customer:* ${order.customer.name}
*Mobile:* ${order.customer.mobile}

*--- ITEMS ---*
${order.orderItems.map((item: any) => `- ${item.quantity}x ${item.product.name}`).join('\n')}

*--- MEASUREMENTS & NOTES ---*
${measurements.length > 0
                  ? measurements.map(m => {
                    let res = `*${m.type}*\n`;
                    if (m.data) {
                      const fields = Object.entries(m.data)
                        .filter(([_, v]) => v !== null && v !== undefined && v !== '')
                        .map(([k, v]) => `  ${k.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}: ${v}`);
                      if (fields.length > 0) res += fields.join('\n') + '\n';
                    }
                    if (m.notes) res += `  *Notes:* ${m.notes}\n`;
                    return res;
                  }).join('\n')
                  : 'No measurements/notes found.'
                }
`;
              const encodedMessage = encodeURIComponent(orderDetails.trim());
              window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
            }}
            className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-all font-medium flex items-center gap-2 shadow-sm text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
            Share to Staff
          </button>

          <button
            onClick={() => router.push(`/orders/${order.id}/edit`)}
            className="px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg hover:bg-gray-50 hover:text-pink-600 transition-all font-medium flex items-center gap-2 shadow-sm text-sm"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </button>

          <button
            onClick={downloadInvoice}
            className="px-4 py-2 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg hover:bg-pink-100 transition-all font-medium flex items-center gap-2 shadow-sm text-sm"
          >
            <Download className="w-4 h-4" /> Invoice
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT SECTION */}
        <div className="lg:col-span-2 space-y-6">

          {/* CUSTOMER INFO */}
          <div className={sectionClass}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-4">
              <User className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-slate-800">Customer Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-slate-500 uppercase font-medium mb-1">Name</p>
                <p className="font-semibold text-slate-800 text-lg">{order.customer.name}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <p className="text-xs text-slate-500 uppercase font-medium">Mobile</p>
                </div>
                <p className="font-semibold text-slate-800 text-lg">{order.customer.mobile}</p>
              </div>
            </div>

            {/* Ordering For & Attender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {order.orderingFor && (
                <div className="p-3 bg-pink-50/50 rounded-lg border border-pink-100 flex items-center gap-3">
                  <div className="bg-pink-100 p-2 rounded-full text-pink-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-pink-500 uppercase font-bold">Ordering For</p>
                    <p className="font-semibold text-slate-800">{order.orderingFor}</p>
                  </div>
                </div>
              )}
              {order.attender && (
                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-indigo-500 uppercase font-bold">Order Created By</p>
                    <p className="font-semibold text-slate-800">{order.attender.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* VOICE NOTE */}
          {order.voiceNoteUrl && (
            <div className={sectionClass}>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-4">
                <Mic className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-semibold text-slate-800">Voice Note</h2>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <audio
                  src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${order.voiceNoteUrl}`}
                  controls
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* DESIGN SKETCH */}
          {order.sketchDataUrl && (
            <div className={sectionClass}>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-4">
                <Edit2 className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-semibold text-slate-800">Design Sketch</h2>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-center">
                <img
                  src={order.sketchDataUrl}
                  alt="Order Sketch"
                  className="max-w-full max-h-[500px] object-contain rounded-lg shadow-sm bg-white"
                />
              </div>
            </div>
          )}

          {/* ORDER ITEMS */}
          <div className={sectionClass}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-4">
              <ShoppingBag className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-slate-800">Order Items</h2>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full min-w-[500px]">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Product</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Rate</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {order.orderItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-pink-50/30 transition-colors">
                      <td className="py-3 px-4 text-slate-800 font-medium">{item.product.name}</td>
                      <td className="text-right py-3 px-4 text-slate-600">{item.quantity}</td>
                      <td className="text-right py-3 px-4 text-slate-600">{formatCurrency(item.rate)}</td>
                      <td className="text-right py-3 px-4 font-bold text-slate-800">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row justify-end gap-6 text-sm">
              <div className="flex justify-between sm:block sm:text-right">
                <span className="text-slate-500 mr-4">Total Amount:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(order.grandTotal)}</span>
              </div>
              <div className="flex justify-between sm:block sm:text-right">
                <span className="text-slate-500 mr-4">Advance Paid:</span>
                <span className="font-semibold text-green-600">{formatCurrency(order.advancePaid)}</span>
              </div>
              <div className="flex justify-between sm:block sm:text-right">
                <span className="text-slate-500 mr-4">Balance Due:</span>
                <span className="font-bold text-red-500">{formatCurrency(order.balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* ADD-ONS SECTION */}
          {order.orderAddOns && order.orderAddOns.length > 0 && (
            <div className={sectionClass}>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-4">
                <Plus className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-semibold text-slate-800">Add-Ons</h2>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[400px]">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Add-On Name</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Rate</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {order.orderAddOns.map((ao: any) => (
                      <tr key={ao.id} className="hover:bg-pink-50/30 transition-colors">
                        <td className="py-3 px-4 text-slate-800 font-medium">{ao.addOn?.name}</td>
                        <td className="text-right py-3 px-4 text-slate-600">{ao.quantity}</td>
                        <td className="text-right py-3 px-4 text-slate-600">{formatCurrency(ao.rate)}</td>
                        <td className="text-right py-3 px-4 font-bold text-slate-800">{formatCurrency(ao.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MATERIALS SECTION */}
          {order.orderMaterials && order.orderMaterials.length > 0 && (
            <div className={sectionClass}>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-4">
                <Layers className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-semibold text-slate-800">Materials (Inventory)</h2>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[400px]">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Material</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Qty</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Price</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {order.orderMaterials.map((m: any) => (
                      <tr key={m.id} className="hover:bg-pink-50/30 transition-colors">
                        <td className="py-3 px-4 text-slate-800 font-medium">{m.item?.name}</td>
                        <td className="text-right py-3 px-4 text-slate-600">{m.quantity}</td>
                        <td className="text-right py-3 px-4 text-slate-600">{formatCurrency(m.price)}</td>
                        <td className="text-right py-3 px-4 font-bold text-slate-800">{formatCurrency(m.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ATTACHMENTS */}
          <div className={sectionClass}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-4">
              <Paperclip className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-slate-800">Attachments</h2>
            </div>
            <AttachmentGallery
              attachments={order.attachments || []}
              onDelete={handleDeleteAttachment}
              canDelete={true}
            />
          </div>

          {/* MEASUREMENTS */}
          {measurements.length > 0 && (
            <div className={sectionClass}>
              <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-4">
                <Ruler className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-semibold text-slate-800">Measurements</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {measurements.map((measurement: any) => (
                  <div key={measurement.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <MeasurementDisplay
                      measurement={measurement}
                      editable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR - STATUS */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50 mb-4">
              <CreditCard className="w-5 h-5 text-pink-500" />
              <h3 className="font-semibold text-slate-800">Update Status</h3>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full appearance-none px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all text-slate-700 font-medium cursor-pointer"
                >
                  <option value="ORDER_CREATED">📝 Order Created</option>
                  <option value="DESIGNING_STARTED">🎨 Designing Started</option>
                  <option value="DESIGNING_COMPLETED">✨ Designing Completed</option>
                  <option value="CUTTING_STARTED">✂️ Cutting Started</option>
                  <option value="CUTTING_COMPLETED">✅ Cutting Completed</option>
                  <option value="STITCHING_STARTED">🧵 Stitching Started</option>
                  <option value="STITCHING_COMPLETED">👕 Stitching Completed</option>
                  <option value="READY_TO_DELIVER">📦 Ready to Deliver</option>
                  <option value="DELIVERED">🎉 Delivered</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <button
                onClick={handleStatusUpdate}
                className="w-full px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Update Status
              </button>
            </div>

            {/* ASSIGN STAFF SECTION */}
            <div className="mt-8 pt-6 border-t border-gray-50">
              <div className="flex items-center gap-2 pb-2 mb-4">
                <User className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold text-slate-800 flex-1">Assign Staff</h3>
                <span className="text-xs text-slate-400 font-medium">For Current Stage</span>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full appearance-none px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-lg focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-slate-700 font-medium cursor-pointer text-sm"
                  >
                    <option value="">Select Staff Member...</option>
                    {staffUsers.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                </div>

                <button
                  onClick={async () => {
                    if (!selectedStaffId) return toast({ title: "Error", description: "Select a staff member", variant: "destructive" });
                    setIsAssigning(true);
                    try {
                      await apiClient.post('/work-assignments', {
                        orderId: order.id,
                        userId: selectedStaffId,
                        stage: order.status,
                      });
                      toast({ title: "Assigned!", description: "Staff successfully assigned to this stage.", variant: "success" });
                      setSelectedStaffId('');
                      fetchOrder();
                    } catch (error) {
                      toast({ title: "Error", description: "Failed to assign staff", variant: "destructive" });
                    } finally {
                      setIsAssigning(false);
                    }
                  }}
                  disabled={isAssigning || !selectedStaffId}
                  className="w-full px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-all disabled:opacity-50 text-sm"
                >
                  {isAssigning ? 'Assigning...' : 'Assign to ' + order.status.replace(/_/g, ' ')}
                </button>
              </div>

              {/* CURRENT ASSIGNMENTS LIST */}
              {order.workAssignments && order.workAssignments.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-slate-500">History</h4>
                  {order.workAssignments.map((wa: any) => (
                    <div key={wa.id} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-800">{wa.user?.firstName} {wa.user?.lastName}</span>
                        <span className="text-xs text-slate-400">{formatDate(wa.assignedAt)}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full self-start">
                        {wa.stage.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MEASUREMENT MODAL */}
      <EditMeasurementModal
        isOpen={!!editingMeasurement}
        onClose={() => setEditingMeasurement(null)}
        measurement={editingMeasurement}
        onSaved={() => {
          fetchOrder();
        }}
      />

      {/* PAYMENT MODAL */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          if (confirm('Proceed with status update WITHOUT collecting payment?')) {
            updateStatus(pendingStatus);
          }
          setShowPaymentModal(false);
          setPendingStatus('');
        }}
        onConfirm={handlePaymentConfirm}
        balanceDue={parseFloat(order.balanceDue)}
        orderId={order.id}
      />
    </div >
  );
}
