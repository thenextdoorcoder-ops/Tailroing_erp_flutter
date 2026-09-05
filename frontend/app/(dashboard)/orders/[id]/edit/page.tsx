'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { measurementService } from '@/lib/measurement-service';

// ── Icons ────────────────────────────────────────────────────
import {
  User, Calendar, Mic, Paperclip, Ruler, ShoppingBag,
  CreditCard, Save, CornerUpLeft, Trash2, Plus, FileText, CheckCircle2, PenLine,
  Layers, ChevronRight, AlertCircle, X
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// ── Measurement Components ─────────────────────────────────────
import MeasurementDisplay from '@/components/measurements/MeasurementDisplay';
import EditMeasurementModal from '@/components/measurements/EditMeasurementModal';
import LoadMeasurementModal from '@/components/measurements/LoadMeasurementModal';
import CreateMeasurementModal from '@/components/measurements/CreateMeasurementModal';

// ── Other feature components ─────────────────────────────────
import VoiceRecorder from '@/components/VoiceRecorder';
import OrderAttachments, { AttachmentPreview } from '@/components/OrderAttachments';
import SketchCanvas, { SketchCanvasHandle } from '@/components/SketchCanvas';

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const orderId = params.id as string;

  // ── Global states ────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sketchRef = useRef<SketchCanvasHandle>(null);

  // ── Dropdown data ────────────────────────────────────────
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [attenders, setAttenders] = useState<any[]>([]);
  const [availableAddOns, setAvailableAddOns] = useState<any[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);

  // ── Measurements ─────────────────────────────────────────
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [editingMeasurement, setEditingMeasurement] = useState<any | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ── Media ────────────────────────────────────────────────
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [existingVoiceUrl, setExistingVoiceUrl] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Order form ───────────────────────────────────────────
  const [order, setOrder] = useState<any>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    orderingFor: '',
    dueDate: '',
    status: '',
    items: [] as any[],
    addOns: [] as any[],
    materials: [] as any[],
    deliveryCharges: 0,
    gstAmount: 0,
    discount: 0,
    advancePaid: 0,
    attenderId: '',
    notes: '',
  });

  // ── Initial data fetch ───────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchOrder(),
        fetchCustomers(),
        fetchProducts(),
        fetchAttenders(),
        fetchAvailableAddOns(),
        fetchAvailableMaterials()
      ]);
      setLoading(false);
    };
    init();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await apiClient.get(`/orders/${orderId}`);
      const data = res.data;
      setOrder(data);

      setFormData({
        customerId: data.customerId,
        orderingFor: data.orderingFor || '',
        dueDate: data.dueDate?.split('T')[0] || '',
        status: data.status,
        items: data.orderItems?.map((i: any) => ({
          productId: i.productId,
          quantity: i.quantity,
          rate: parseFloat(i.rate),
          total: parseFloat(i.total),
        })) || [],
        addOns: data.orderAddOns?.map((a: any) => ({
          addOnId: a.addOnId,
          quantity: a.quantity,
          rate: parseFloat(a.rate),
          total: parseFloat(a.total),
        })) || [],
        materials: data.orderMaterials?.map((m: any) => ({
          itemId: m.itemId,
          quantity: parseFloat(m.quantity),
          rate: parseFloat(m.price),
          total: parseFloat(m.total),
        })) || [],
        deliveryCharges: parseFloat(data.deliveryCharges || 0),
        gstAmount: parseFloat(data.gstAmount || 0),
        discount: parseFloat(data.discount || 0),
        advancePaid: parseFloat(data.advancePaid || 0),
        attenderId: data.attenderId || '',
        notes: data.notes || '',
      });

      if (data.voiceNoteUrl) {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '');
        setExistingVoiceUrl(`${baseUrl}${data.voiceNoteUrl}`);
      }
      setExistingAttachments(data.attachments || []);

      if (data.customerId) {
        fetchMeasurements(data.customerId, data.id);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load order data.", variant: "destructive" });
    }
  };

  const fetchMeasurements = async (cId: string, oId: string) => {
    try {
      const res = await apiClient.get(`/measurements/customer/${cId}`);
      // Find measurements linked to this order, or most recent ones for profile
      const linked = res.data.filter((m: any) => m.orderId === oId);
      if (linked.length > 0) {
        setMeasurements(linked);
      } else {
        const profile = res.data.filter((m: any) => !m.orderId);
        const latest: Record<string, any> = {};
        profile.forEach((m: any) => {
          if (!latest[m.type] || new Date(m.createdAt) > new Date(latest[m.type].createdAt)) latest[m.type] = m;
        });
        setMeasurements(Object.values(latest));
      }
    } catch (err) { console.error(err); }
  };

  const handleMeasurementSelect = async (m: any) => {
    try {
      // Link this existing measurement to the current order
      await apiClient.put(`/measurements/${m.id}`, { orderId });
      setShowLoadModal(false);
      fetchMeasurements(formData.customerId, orderId);
      toast({ title: "Measurement Loaded", description: "Successfully linked to this order." });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load measurement.", variant: "destructive" });
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiClient.get('/customers', { params: { limit: 1000 } });
      setCustomers(res.data.pagination ? res.data.data : res.data);
    } catch (err) { console.error(err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products');
      setProducts(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAttenders = async () => {
    try {
      const res = await apiClient.get('/attenders');
      setAttenders(res.data.filter((a: any) => a.isActive || a.id === formData.attenderId));
    } catch (err) { console.error(err); }
  };

  const fetchAvailableAddOns = async () => {
    try {
      const res = await apiClient.get('/add-ons');
      setAvailableAddOns(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAvailableMaterials = async () => {
    try {
      const res = await apiClient.get('/items');
      setAvailableMaterials(res.data);
    } catch (err) { console.error(err); }
  };

  // ── Computation ──────────────────────────────────────────
  const calculateGrandTotal = () => {
    const productsSum = formData.items.reduce((s, i) => s + i.total, 0);
    const addonsSum = formData.addOns.reduce((s, a) => s + a.total, 0);
    const materialsSum = formData.materials.reduce((s, m) => s + m.total, 0);
    return productsSum + addonsSum + materialsSum + formData.deliveryCharges + formData.gstAmount - formData.discount;
  };

  // ── Form Handlers (Sync with NewOrderPage logic) ───────────────
  const handleProductChange = (idx: number, pId: string) => {
    const p = products.find(prod => prod.id === pId);
    const newItems = [...formData.items];
    const rate = parseFloat(p?.sellingPrice || '0');
    newItems[idx] = { ...newItems[idx], productId: pId, rate, total: newItems[idx].quantity * rate };
    setFormData({ ...formData, items: newItems });
  };
  const handleQuantityChange = (idx: number, qty: number) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], quantity: qty, total: qty * newItems[idx].rate };
    setFormData({ ...formData, items: newItems });
  };
  const addItem = () => setFormData({ ...formData, items: [...formData.items, { productId: '', quantity: 1, rate: 0, total: 0 }] });
  const removeItem = (idx: number) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) });

  const handleAddOnChange = (idx: number, aId: string) => {
    const a = availableAddOns.find(ao => ao.id === aId);
    const newAddOns = [...formData.addOns];
    const rate = parseFloat(a?.price || '0');
    newAddOns[idx] = { ...newAddOns[idx], addOnId: aId, rate, total: newAddOns[idx].quantity * rate };
    setFormData({ ...formData, addOns: newAddOns });
  };
  const addAddOn = () => setFormData({ ...formData, addOns: [...formData.addOns, { addOnId: '', quantity: 1, rate: 0, total: 0 }] });
  const removeAddOn = (idx: number) => setFormData({ ...formData, addOns: formData.addOns.filter((_, i) => i !== idx) });

  const handleMaterialChange = (idx: number, itemId: string) => {
    const item = availableMaterials.find(i => i.id === itemId);
    const newMaterials = [...formData.materials];
    const rate = parseFloat(item?.sellingPrice || '0');
    newMaterials[idx] = { ...newMaterials[idx], itemId, rate, total: newMaterials[idx].quantity * rate };
    setFormData({ ...formData, materials: newMaterials });
  };
  const addMaterial = () => setFormData({ ...formData, materials: [...formData.materials, { itemId: '', quantity: 1, rate: 0, total: 0 }] });
  const removeMaterial = (idx: number) => setFormData({ ...formData, materials: formData.materials.filter((_, i) => i !== idx) });

  // ── Media Uploads ────────────────────────────────────────
  const uploadVoice = async () => {
    if (!voiceBlob) return null;
    try {
      setUploadingVoice(true);
      const fd = new FormData();
      fd.append('voiceNote', voiceBlob, 'voice-note.webm');
      const res = await apiClient.post('/voice-notes/upload', fd);
      return res.data.url;
    } catch (err) { console.error(err); return null; }
    finally { setUploadingVoice(false); }
  };

  const deleteAttachment = async (id: string) => {
    if (!confirm('Permanently delete this attachment?')) return;
    try {
      await apiClient.delete(`/attachments/${id}`);
      setExistingAttachments(prev => prev.filter(a => a.id !== id));
      toast({ title: "Deleted", description: "Attachment removed." });
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = formData.items.filter(i => i.productId !== '');
    if (!formData.customerId || !formData.dueDate || validItems.length === 0) {
      toast({ title: "Required Fields", description: "Please select a customer, due date, and at least one product.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const vnUrl = await uploadVoice();
      const sketchUrl = sketchRef.current?.getDataUrl() || order.sketchDataUrl;

      // New attachments for order update
      if (attachments.length > 0) {
        const fd = new FormData();
        attachments.forEach(a => fd.append('attachments', a.file));
        await apiClient.post(`/orders/${orderId}/attachments`, fd, {
          onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1))),
        });
      }

      await apiClient.put(`/orders/${orderId}`, {
        ...formData,
        items: validItems,
        addOns: formData.addOns?.filter(a => a.addOnId !== '') || [],
        materials: formData.materials?.filter(m => m.itemId !== '') || [],
        voiceNoteUrl: vnUrl || order.voiceNoteUrl,
        sketchDataUrl: sketchUrl,
      });

      toast({ title: "Success", description: "Order updated successfully!", variant: "success" });
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.response?.data?.error || "Failed to update order", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ── Styling ──────────────────────────────────────────────
  const inputClass = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none text-slate-700 shadow-sm";
  const labelClass = "block text-sm font-medium text-slate-600 mb-1.5 ml-1";
  const selectClass = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none text-slate-700 shadow-sm appearance-none";
  const sectionClass = "bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-6";

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading order details...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Link href="/orders" className="hover:text-pink-600 transition-colors">Orders</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/orders/${orderId}`} className="hover:text-pink-600 transition-colors uppercase text-xs font-bold tracking-widest">{order?.orderId}</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-medium">Edit</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Edit Order</h1>
        </div>
        <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          {['PENDING', 'PROCESSING', 'COMPLETED', 'DELIVERED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFormData({ ...formData, status: s })}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${formData.status === s
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. CUSTOMER & STAFF */}
        <div className={sectionClass}>
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <User className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-semibold text-slate-800">Customer Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className={labelClass}>Customer *</label>
              <SearchableSelect
                options={customers.map(c => ({ id: c.id, label: `${c.name} (${c.mobile})` }))}
                value={formData.customerId}
                onChange={(val) => setFormData({ ...formData, customerId: val })}
                placeholder="Search customer..."
              />
            </div>
            <div>
              <label className={labelClass}>Order Created By (Attender) *</label>
              <SearchableSelect
                options={attenders.map(a => ({ id: a.id, label: a.name }))}
                value={formData.attenderId}
                onChange={(val) => setFormData({ ...formData, attenderId: val })}
                placeholder="Select Attender..."
              />
            </div>
            <div>
              <label className={labelClass}>Ordering For</label>
              <input type="text" value={formData.orderingFor} onChange={(e) => setFormData({ ...formData, orderingFor: e.target.value })} className={inputClass} placeholder="e.g. Self, Daughter" />
            </div>
            <div>
              <label className={labelClass}>Due Date *</label>
              <div className="relative text-accent">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input type="date" required value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className={`${inputClass} pl-10`} />
              </div>
            </div>
          </div>
        </div>

        {/* 2. MEASUREMENTS */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between pb-2 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-slate-800">Measurements</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                disabled={!formData.customerId}
                className="text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 px-3 py-1.5 rounded-lg border border-pink-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3 h-3" /> New
              </button>
              <button
                type="button"
                onClick={() => setShowLoadModal(true)}
                disabled={!formData.customerId}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 bg-pink-50 px-3 py-1.5 rounded-lg border border-pink-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CornerUpLeft className="w-3 h-3" /> Load Past
              </button>
              <p className="text-xs text-slate-400 italic hidden sm:block">Editing measurements here updates the order records</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {measurements.length > 0 ? (
              measurements.map((m) => (
                <MeasurementDisplay key={m.id} measurement={m} editable={true} onEdit={setEditingMeasurement} />
              ))
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">No measurements found for this customer.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. SKETCH & MEDIA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={sectionClass}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <PenLine className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-slate-800">Design Sketch</h2>
            </div>
            <SketchCanvas ref={sketchRef} defaultDataUrl={order?.sketchDataUrl} />
          </div>
          <div className={sectionClass}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <Mic className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-slate-800">Voice & Files</h2>
            </div>
            <div className="space-y-6">
              <VoiceRecorder onRecordingComplete={setVoiceBlob} existingVoiceUrl={existingVoiceUrl || undefined} />
              <div className="space-y-4">
                <label className={labelClass}>Attachments</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {existingAttachments.map((a) => (
                    <div key={a.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                      <img src={a.fileUrl} alt={a.fileName} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => deleteAttachment(a.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 scale-75 transition-all focus:opacity-100">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <OrderAttachments attachments={attachments} onAttachmentsChange={setAttachments} />
              </div>
            </div>
          </div>
        </div>

        {/* 4. ITEMS, ADD-ONS & MATERIALS */}
        <div className="space-y-8">
          {/* Items */}
          <div className={sectionClass}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-semibold text-slate-800">Order Items</h2>
              </div>
              <button type="button" onClick={addItem} className="px-3 py-1.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium transition-all shadow-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            <div className="space-y-4">
              {formData.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100 relative group">
                  <div className="md:col-span-4">
                    <label className={labelClass}>Product *</label>
                    <SearchableSelect
                      options={products.map(p => ({ id: p.id, label: p.name, subLabel: `₹${p.sellingPrice}` }))}
                      value={item.productId}
                      onChange={(val) => handleProductChange(idx, val)}
                      placeholder="Select Product"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Qty</label>
                    <input type="number" min="1" value={item.quantity} onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Rate (per unit)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => {
                          const newRate = parseFloat(e.target.value) || 0;
                          const newItems = [...formData.items];
                          newItems[idx] = { ...newItems[idx], rate: newRate, total: item.quantity * newRate };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className={`${inputClass} pl-8`}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelClass}>Total Price</label>
                    <div className="relative text-accent">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500 font-bold">₹</span>
                      <input
                        type="number"
                        value={item.total}
                        onChange={(e) => {
                          const newTotal = parseFloat(e.target.value) || 0;
                          const newItems = [...formData.items];
                          newItems[idx] = {
                            ...newItems[idx],
                            total: newTotal,
                            rate: item.quantity > 0 ? (newTotal / item.quantity) : 0
                          };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className={`${inputClass} pl-8 font-bold text-slate-900 border-pink-200 bg-pink-50/30`}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add-Ons & Materials Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={sectionClass}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-pink-500" />
                  <h2 className="text-lg font-semibold text-slate-800">Add-Ons</h2>
                </div>
                <button type="button" onClick={addAddOn} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {formData.addOns.map((ao, idx) => (
                  <div key={idx} className="flex gap-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <SearchableSelect
                        options={availableAddOns.map(a => ({ id: a.id, label: a.name, subLabel: `₹${a.price}` }))}
                        value={ao.addOnId}
                        onChange={(val) => handleAddOnChange(idx, val)}
                        placeholder="Select Add-on"
                      />
                    </div>
                    <div className="w-20">
                      <input type="number" min="1" value={ao.quantity} onChange={(e) => {
                        const qty = parseInt(e.target.value) || 1;
                        setFormData({ ...formData, addOns: formData.addOns.map((x, i) => i === idx ? { ...x, quantity: qty, total: qty * x.rate } : x) });
                      }} className={inputClass} placeholder="Qty" />
                    </div>
                    <div className="w-28 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₹</span>
                      <input
                        type="number"
                        value={ao.total}
                        onChange={(e) => {
                          const newTotal = parseFloat(e.target.value) || 0;
                          setFormData({
                            ...formData, addOns: formData.addOns.map((x, i) => i === idx ? {
                              ...x,
                              total: newTotal,
                              rate: x.quantity > 0 ? (newTotal / x.quantity) : 0
                            } : x)
                          });
                        }}
                        className={`${inputClass} pl-5 text-sm font-semibold`}
                      />
                    </div>
                    <button type="button" onClick={() => removeAddOn(idx)} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className={sectionClass}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-pink-500" />
                  <h2 className="text-lg font-semibold text-slate-800">Materials</h2>
                </div>
                <button type="button" onClick={addMaterial} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="space-y-3">
                {formData.materials.map((m, idx) => (
                  <div key={idx} className="flex gap-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <SearchableSelect
                        options={availableMaterials.map(i => ({ id: i.id, label: i.name, subLabel: `₹${i.sellingPrice}` }))}
                        value={m.itemId}
                        onChange={(val) => handleMaterialChange(idx, val)}
                        placeholder="Select Material"
                      />
                    </div>
                    <div className="w-20">
                      <input type="number" min="1" value={m.quantity} onChange={(e) => {
                        const qty = parseFloat(e.target.value) || 1;
                        setFormData({ ...formData, materials: formData.materials.map((x, i) => i === idx ? { ...x, quantity: qty, total: qty * x.rate } : x) });
                      }} className={inputClass} placeholder="Qty" />
                    </div>
                    <div className="w-28 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₹</span>
                      <input
                        type="number"
                        value={m.total}
                        onChange={(e) => {
                          const newTotal = parseFloat(e.target.value) || 0;
                          setFormData({
                            ...formData, materials: formData.materials.map((x, i) => i === idx ? {
                              ...x,
                              total: newTotal,
                              rate: x.quantity > 0 ? (newTotal / x.quantity) : 0
                            } : x)
                          });
                        }}
                        className={`${inputClass} pl-5 text-sm font-semibold`}
                      />
                    </div>
                    <button type="button" onClick={() => removeMaterial(idx)} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. NOTES & SUMMARY */}
        <div className={sectionClass}>
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <FileText className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-semibold text-slate-800">Order Notes & Summary</h2>
          </div>
          <textarea
            className={`${inputClass} h-32 resize-none`}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any special instructions or delivery preferences..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            <div>
              <label className={labelClass}>Delivery</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input type="number" value={formData.deliveryCharges} onChange={(e) => setFormData({ ...formData, deliveryCharges: parseFloat(e.target.value) || 0 })} className={`${inputClass} pl-8`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>GST</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input type="number" value={formData.gstAmount} onChange={(e) => setFormData({ ...formData, gstAmount: parseFloat(e.target.value) || 0 })} className={`${inputClass} pl-8`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Discount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input type="number" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} className={`${inputClass} pl-8`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Advance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input type="number" value={formData.advancePaid} onChange={(e) => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })} className={`${inputClass} pl-8`} />
              </div>
            </div>
          </div>

          <div className="mt-8 p-5 bg-slate-900 rounded-xl border border-slate-800 shadow-md">
            <div className="flex flex-col md:flex-row justify-between gap-6 items-center">
              <div className="text-center md:text-left flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subtotal</div>
                <div className="text-lg font-medium text-slate-200">₹{(calculateGrandTotal() + formData.discount - formData.gstAmount - formData.deliveryCharges).toFixed(2)}</div>
              </div>
              <div className="hidden md:block w-px h-8 bg-slate-700"></div>
              <div className="text-center md:text-left flex-1">
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">Grand Total</div>
                <div className="text-2xl font-bold text-white tracking-tight">₹{calculateGrandTotal().toFixed(2)}</div>
              </div>
              <div className="hidden md:block w-px h-8 bg-slate-700"></div>
              <div className="text-center md:text-left flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Balance Due</div>
                <div className="text-lg font-medium text-slate-200">₹{(calculateGrandTotal() - formData.advancePaid).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => router.back()} className="px-8 py-3 bg-white border border-gray-200 text-slate-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all shadow-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving || uploadingVoice} className="px-10 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center gap-3 disabled:opacity-50">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving Changes...' : 'Update Order'}
          </button>
        </div>
      </form>

      <EditMeasurementModal
        isOpen={!!editingMeasurement}
        onClose={() => setEditingMeasurement(null)}
        measurement={editingMeasurement}
        onSaved={() => fetchMeasurements(formData.customerId, orderId)}
      />

      <LoadMeasurementModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onSelect={handleMeasurementSelect}
      />

      <CreateMeasurementModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        customerId={formData.customerId}
        customerName={customers.find((c) => c.id === formData.customerId)?.name}
        onSaved={(id) => {
          // New measurement was created, we fetch all and maybe manually link it,
          // wait, MeasurementSection creates it but doesn't link it to the current open order ID!
          // We must link it.
          apiClient.put(`/measurements/${id}`, { orderId }).then(() => {
            fetchMeasurements(formData.customerId, orderId);
            toast({ title: "Measurement Added", description: "New measurement has been linked to this order." });
          });
        }}
      />
    </div>
  );
}
