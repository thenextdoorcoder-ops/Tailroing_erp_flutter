'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SearchableSelect from '@/components/SearchableSelect';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { measurementService } from '@/lib/measurement-service';

// ── Icons ────────────────────────────────────────────────────
import {
  User, Calendar, Mic, Paperclip, Ruler, ShoppingBag,
  CreditCard, Save, CornerUpLeft, Trash2, Plus, FileText, CheckCircle2, PenLine,
  Layers, ChevronRight, AlertCircle
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// ── Measurement Forms ────────────────────────────────────────
import ChudiMeasurementForm from '@/components/measurements/ChudiMeasurementForm';
import LadiesPantMeasurementForm from '@/components/measurements/LadiesPantMeasurementForm';
import KidsMeasurementForm from '@/components/measurements/KidsMeasurementForm';
import BlouseMeasurementForm from '@/components/measurements/BlouseMeasurementForm';
import LoadMeasurementModal from '@/components/measurements/LoadMeasurementModal';

// ── Other feature components ─────────────────────────────────
import VoiceRecorder from '@/components/VoiceRecorder';
import OrderAttachments, { AttachmentPreview } from '@/components/OrderAttachments';
import SketchCanvas, { SketchCanvasHandle } from '@/components/SketchCanvas';

// ── Types ────────────────────────────────────────────────────
import {
  MeasurementType,
  ChudiMeasurementData,
  BlouseMeasurementData,
  LadiesPantMeasurementData,
  KidsMeasurementData,
  Measurement,
} from '@/types/measurement.types';

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // ── Global loading ───────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const sketchRef = useRef<SketchCanvasHandle>(null);

  // ── Dropdown data ────────────────────────────────────────
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<any[]>([]);
  const [attenders, setAttenders] = useState<any[]>([]);
  const [availableAddOns, setAvailableAddOns] = useState<any[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // ── Category/SubCategory selection ───────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // ── Attachments ──────────────────────────────────────────
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Voice note ───────────────────────────────────────────
  const [voiceBlob, setVoiceBlob] = useState<Blob[]>([]);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  // ── Measurement modal ────────────────────────────────────
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);

  // ── Measurement type (driven by category selection) ──────
  const [selectedMeasurementType, setSelectedMeasurementType] =
    useState<MeasurementType>('CHUDI');

  const [chudiMeasurement, setChudiMeasurement] = useState<ChudiMeasurementData>({});
  const [ladiesMeasurement, setLadiesMeasurement] = useState<LadiesPantMeasurementData>({});
  const [blouseMeasurement, setBlouseMeasurement] = useState<BlouseMeasurementData>({});
  const [kidsMeasurement, setKidsMeasurement] = useState<KidsMeasurementData>({});

  const [measurementNotes, setMeasurementNotes] = useState('');
  const [savedMeasurementId, setSavedMeasurementId] = useState<string | null>(null);

  // ── Order form ───────────────────────────────────────────
  const [formData, setFormData] = useState({
    customerId: '',
    orderingFor: '',
    dueDate: '',
    items: [{ productId: '', quantity: 1, rate: 0, total: 0 }],
    addOns: [] as { addOnId: string; quantity: number; rate: number; total: number }[],
    materials: [] as { itemId: string; quantity: number; rate: number; total: number }[],
    deliveryCharges: 0,
    gstAmount: 0,
    discount: 0,
    advancePaid: 0,
    attenderId: '',
  });

  const [stats, setStats] = useState<any>(null);

  // ── Initial data fetch ───────────────────────────────────
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchCategories();
    fetchSubCategories();
    fetchStats();
    fetchAttenders();
    fetchAvailableAddOns();
    fetchAvailableMaterials();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchSubCategories = async () => {
    try {
      const res = await apiClient.get('/sub-categories');
      setSubCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch subcategories:', err);
    }
  };

  const fetchAttenders = async () => {
    try {
      const res = await apiClient.get('/attenders');
      setAttenders(res.data.filter((a: any) => a.isActive));
    } catch (err) {
      console.error('Failed to fetch attenders:', err);
    }
  };

  const fetchAvailableAddOns = async () => {
    try {
      const res = await apiClient.get('/add-ons');
      setAvailableAddOns(res.data);
    } catch (err) {
      console.error('Failed to fetch add-ons:', err);
    }
  };

  const fetchAvailableMaterials = async () => {
    try {
      const res = await apiClient.get('/items');
      setAvailableMaterials(res.data);
    } catch (err) {
      console.error('Failed to fetch inventory items:', err);
    }
  };

  /* ===============================
     EFFECT: Filter Subcategories + Set Measurement Type
  ================================ */
  useEffect(() => {
    if (!selectedCategoryId) {
      setFilteredSubCategories([]);
      return;
    }

    const seen = new Set<string>();
    const filtered = subCategories.filter((sub) => {
      if (sub.categoryId !== selectedCategoryId) return false;
      if (seen.has(sub.id)) return false;
      seen.add(sub.id);
      return true;
    });

    setFilteredSubCategories(filtered);

    const selectedCategory = categories.find(
      (cat) => cat.id === selectedCategoryId
    );

    if (selectedCategory?.measurementType) {
      setSelectedMeasurementType(
        selectedCategory.measurementType as MeasurementType
      );
    }
  }, [selectedCategoryId, categories, subCategories]);

  useEffect(() => {
    fetchProducts(selectedCategoryId);
  }, [selectedCategoryId]);

  const fetchCustomers = async () => {
    try {
      const res = await apiClient.get('/customers', { params: { limit: 1000 } });
      const customersData = res.data.pagination ? res.data.data : res.data;
      setCustomers(customersData);

      const customerId = searchParams.get('customerId');
      if (customerId) {
        const customer = customersData.find((c: any) => c.id === customerId);
        if (customer) {
          setFormData(prev => ({ ...prev, customerId }));
          setSelectedCustomer(customer);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchProducts = async (catId?: string) => {
    try {
      const params = new URLSearchParams();
      if (catId) params.append('categoryId', catId);
      const res = await apiClient.get(`/products?${params.toString()}`);
      setProducts(res.data);
      setFilteredProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  // ── Measurement Handlers ─────────────────────────────────────
  const loadMeasurementData = (measurement: Measurement) => {
    switch (measurement.type) {
      case 'CHUDI':
        setChudiMeasurement(measurement.data as ChudiMeasurementData);
        break;
      case 'LADIES_PANT':
        setLadiesMeasurement(measurement.data as LadiesPantMeasurementData);
        break;
      case 'KIDS':
        setKidsMeasurement(measurement.data as KidsMeasurementData);
        break;
      case 'BLOUSE':
        setBlouseMeasurement(measurement.data as BlouseMeasurementData);
        break;
    }
    setMeasurementNotes(measurement.notes || '');
    setSelectedMeasurementType(measurement.type);
  };

  const getCurrentMeasurementData = () => {
    switch (selectedMeasurementType) {
      case 'CHUDI': return chudiMeasurement;
      case 'LADIES_PANT': return ladiesMeasurement;
      case 'KIDS': return kidsMeasurement;
      case 'BLOUSE': return blouseMeasurement;
    }
  };

  const handleSaveMeasurement = async () => {
    if (!formData.customerId) {
      toast({ title: "Customer Required", description: "Please select a customer first", variant: "destructive" });
      return;
    }
    const measurementData = getCurrentMeasurementData();
    const hasData = Object.values(measurementData || {}).some((v) => v) || measurementNotes.trim().length > 0;
    if (!hasData) {
      toast({ title: "Measurement Required", description: "Please enter at least one measurement or a note", variant: "destructive" });
      return;
    }

    try {
      if (savedMeasurementId) {
        await measurementService.updateMeasurement(savedMeasurementId, { data: measurementData, notes: measurementNotes });
        toast({ title: "Success", description: "Measurement updated!", variant: "success" });
      } else {
        const result = await measurementService.createMeasurement({
          customerId: formData.customerId,
          type: selectedMeasurementType,
          data: measurementData,
          notes: measurementNotes,
        });
        setSavedMeasurementId(result.id);
        toast({ title: "Success", description: "Measurement saved!", variant: "success" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save measurement", variant: "destructive" });
    }
  };

  const handleMeasurementSelect = (measurement: Measurement) => {
    loadMeasurementData(measurement);
    setSavedMeasurementId(measurement.id);
    setShowMeasurementModal(false);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSavedMeasurementId(null);
    // Removed clearing of measurement states to prevent data loss on accidental/intentional category switch
    const cat = categories.find((c) => c.id === categoryId);
    if (cat?.measurementType) setSelectedMeasurementType(cat.measurementType as MeasurementType);
  };

  // ── Row Management (Items, Add-ons, Materials) ───────────────
  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const newItems = [...formData.items];
    const rate = parseFloat(product?.sellingPrice || '0');
    newItems[index] = { ...newItems[index], productId, rate, total: newItems[index].quantity * rate };
    setFormData({ ...formData, items: newItems });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], quantity, total: quantity * newItems[index].rate };
    setFormData({ ...formData, items: newItems });
  };

  const handleTotalChange = (index: number, total: number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], total };
    if (newItems[index].quantity > 0) newItems[index].rate = total / newItems[index].quantity;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { productId: '', quantity: 1, rate: 0, total: 0 }] });
  const removeItem = (index: number) => {
    if (formData.items.length === 1) return;
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  // ── Add-ons Handlers ─────────────────────────────────────────
  const handleAddOnChange = (index: number, addOnId: string) => {
    const addon = availableAddOns.find(a => a.id === addOnId);
    const newAddOns = [...formData.addOns];
    const rate = parseFloat(addon?.price || '0');
    newAddOns[index] = { ...newAddOns[index], addOnId, rate, total: newAddOns[index].quantity * rate };
    setFormData({ ...formData, addOns: newAddOns });
  };
  const handleAddOnQuantityChange = (index: number, quantity: number) => {
    const newAddOns = [...formData.addOns];
    newAddOns[index] = { ...newAddOns[index], quantity, total: quantity * newAddOns[index].rate };
    setFormData({ ...formData, addOns: newAddOns });
  };
  const addAddOn = () => setFormData({ ...formData, addOns: [...formData.addOns, { addOnId: '', quantity: 1, rate: 0, total: 0 }] });
  const removeAddOn = (index: number) => setFormData({ ...formData, addOns: formData.addOns.filter((_, i) => i !== index) });

  // ── Materials Handlers ───────────────────────────────────────
  const handleMaterialChange = (index: number, itemId: string) => {
    const item = availableMaterials.find(i => i.id === itemId);
    const newMaterials = [...formData.materials];
    const rate = parseFloat(item?.sellingPrice || '0');
    newMaterials[index] = { ...newMaterials[index], itemId, rate, total: newMaterials[index].quantity * rate };
    setFormData({ ...formData, materials: newMaterials });
  };
  const handleMaterialQuantityChange = (index: number, quantity: number) => {
    const newMaterials = [...formData.materials];
    newMaterials[index] = { ...newMaterials[index], quantity, total: quantity * newMaterials[index].rate };
    setFormData({ ...formData, materials: newMaterials });
  };
  const addMaterial = () => setFormData({ ...formData, materials: [...formData.materials, { itemId: '', quantity: 1, rate: 0, total: 0 }] });
  const removeMaterial = (index: number) => setFormData({ ...formData, materials: formData.materials.filter((_, i) => i !== index) });

  // ── Submit Handlers ──────────────────────────────────────────
  const calculateGrandTotal = () => {
    const productTotal = formData.items.reduce((sum, i) => sum + i.total, 0);
    const addOnsTotal = formData.addOns.reduce((sum, i) => sum + i.total, 0);
    const materialsTotal = formData.materials.reduce((sum, i) => sum + i.total, 0);
    return productTotal + addOnsTotal + materialsTotal + formData.deliveryCharges + formData.gstAmount - formData.discount;
  };

  const uploadVoiceNotes = async (): Promise<string[]> => {
    if (voiceBlob.length === 0) return [];
    try {
      setUploadingVoice(true);
      const fd = new FormData();
      fd.append('voiceNote', voiceBlob[0], 'voice-note.webm');
      const res = await apiClient.post('/voice-notes/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return [res.data.url];
    } catch (err) { console.error(err); return []; }
    finally { setUploadingVoice(false); }
  };

  const uploadAttachments = async (): Promise<any[]> => {
    if (attachments.length === 0) return [];
    try {
      setUploadingAttachments(true);
      const fd = new FormData();
      attachments.forEach(a => fd.append('attachments', a.file));
      const res = await apiClient.post('/attachments/upload-temp', fd, {
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1))),
      });
      return res.data.files;
    } catch (err) { console.error(err); return []; }
    finally { setUploadingAttachments(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = formData.items.filter(i => i.productId !== '');
    if (!formData.customerId || !formData.dueDate || validItems.length === 0) {
      toast({ title: "Required Fields", description: "Please select a customer, due date, and at least one product.", variant: "destructive" });
      return;
    }

    if (!savedMeasurementId) {
      toast({ 
        title: "Measurement Required", 
        description: "Please save the measurements before creating the order.", 
        variant: "destructive" 
      });
      return;
    }
    setLoading(true);
    try {
      const voiceUrls = await uploadVoiceNotes();
      const attachmentFiles = await uploadAttachments();
      const sketchDataUrl = sketchRef.current?.getDataUrl() || null;

      const payload = {
        ...formData,
        items: validItems,
        addOns: formData.addOns?.filter(a => a.addOnId !== '') || [],
        materials: formData.materials?.filter(m => m.itemId !== '') || [],
        voiceNoteUrl: voiceUrls[0] || null,
        attachmentUrls: attachmentFiles,
        measurementId: savedMeasurementId,
        sketchDataUrl,
      };

      await apiClient.post('/orders', payload);
      toast({ title: "Order Created", description: "Tailoring order created successfully!", variant: "success" });
      router.push('/orders');
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.response?.data?.error || "Failed to create order", variant: "destructive" });
    } finally { setLoading(false); }
  };

  // ── Styles ───────────────────────────────────────────────
  const inputClass = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none text-slate-700 shadow-sm";
  const labelClass = "block text-sm font-medium text-slate-600 mb-1.5 ml-1";
  const selectClass = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none text-slate-700 shadow-sm appearance-none";
  const sectionClass = "bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-6";

  const isLimitReached = stats?.ordersThisMonth >= stats?.limit;

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Link href="/orders" className="hover:text-pink-600 transition-colors">Orders</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-medium">Create New</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Tailoring Order</h1>
        </div>
        {isLimitReached && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Order Limit Reached</p>
              <p>You have reached your monthly order limit ({stats?.limit}). Please upgrade your plan.</p>
            </div>
          </div>
        )}
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
                onChange={(val) => {
                  setFormData({ ...formData, customerId: val });
                  setSelectedCustomer(customers.find(c => c.id === val));
                }}
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
              <label className={labelClass}>Ordering For (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Daughter, Self"
                value={formData.orderingFor}
                onChange={(e) => setFormData({ ...formData, orderingFor: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Due Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. CATEGORY & MEASUREMENTS */}
        <div className={sectionClass}>
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <Ruler className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-semibold text-slate-800">Category & Measurements</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Primary Category</label>
                <select
                  className={selectClass}
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="">Choose Category</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Subcategory (Optional)</label>
                <select
                  className={selectClass}
                  disabled={!selectedCategoryId || filteredSubCategories.length === 0}
                  onChange={(e) => {
                    /* Optional: Handle subcategory selection if needed in the future */
                  }}
                >
                  <option value="">All Subcategories</option>
                  {filteredSubCategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
              </div>

            <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Measurement Form</span>
                <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded">{selectedMeasurementType}</span>
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm max-h-[550px] overflow-y-auto custom-scrollbar">
                {selectedMeasurementType === 'CHUDI' && <ChudiMeasurementForm value={chudiMeasurement} onChange={setChudiMeasurement} />}
                {selectedMeasurementType === 'LADIES_PANT' && <LadiesPantMeasurementForm value={ladiesMeasurement} onChange={setLadiesMeasurement} />}
                {selectedMeasurementType === 'BLOUSE' && <BlouseMeasurementForm value={blouseMeasurement} onChange={setBlouseMeasurement} />}
                {selectedMeasurementType === 'KIDS' && <KidsMeasurementForm value={kidsMeasurement} onChange={setKidsMeasurement} />}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className={labelClass}>Measurement Notes</label>
                  <textarea
                    className={`${inputClass} h-24 resize-none`}
                    value={measurementNotes}
                    onChange={(e) => setMeasurementNotes(e.target.value)}
                    placeholder="Type measurements manually or specific fitting instructions here (if you prefer not to use the form above)..."
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveMeasurement}
                    className="flex-1 px-4 py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-all font-bold flex items-center justify-center gap-2 shadow-md shadow-pink-200"
                  >
                    <Save className="w-5 h-5" /> Save Measurements
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMeasurementModal(true)}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-semibold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CornerUpLeft className="w-5 h-5" /> Load Past
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SKETCH & MEDIA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={sectionClass}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <PenLine className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-slate-800">Design Sketch</h2>
            </div>
            <SketchCanvas ref={sketchRef} />
          </div>

          <div className={sectionClass}>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
              <Mic className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-slate-800">Voice & Files</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Voice Note</label>
                <VoiceRecorder onRecordingComplete={(blob) => setVoiceBlob([blob])} />
              </div>
              <div>
                <label className={labelClass}>Attachments</label>
                <OrderAttachments attachments={attachments} onAttachmentsChange={setAttachments} />
              </div>
            </div>
          </div>
        </div>

        {/* 4. ORDER ITEMS (Products) */}
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
                <div className="md:col-span-6">
                  <label className={labelClass}>Product *</label>
                  <select required value={item.productId} onChange={(e) => handleProductChange(idx, e.target.value)} className={selectClass}>
                    <option value="">Select Product</option>
                    {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} — ₹{p.sellingPrice}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Qty</label>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)} className={inputClass} />
                </div>
                <div className="md:col-span-3">
                  <label className={labelClass}>Total</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input type="number" step="0.01" value={item.total} onChange={(e) => handleTotalChange(idx, parseFloat(e.target.value) || 0)} className={`${inputClass} pl-8 font-medium`} />
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

        {/* 5. ADD-ONS & MATERIALS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={sectionClass}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-pink-500" />
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
                    <input type="number" min="1" value={ao.quantity} onChange={(e) => handleAddOnQuantityChange(idx, parseInt(e.target.value) || 1)} className={inputClass} placeholder="Qty" />
                  </div>
                  <div className="w-28 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₹</span>
                    <input
                      type="number"
                      value={ao.total}
                      onChange={(e) => {
                        const newTotal = parseFloat(e.target.value) || 0;
                        const newAddOns = [...formData.addOns];
                        newAddOns[idx] = {
                          ...newAddOns[idx],
                          total: newTotal,
                          rate: ao.quantity > 0 ? (newTotal / ao.quantity) : 0
                        };
                        setFormData({ ...formData, addOns: newAddOns });
                      }}
                      className={`${inputClass} pl-5 text-sm font-semibold`}
                    />
                  </div>
                  <button type="button" onClick={() => removeAddOn(idx)} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
              {formData.addOns.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No add-ons selected</p>}
            </div>
          </div>

          <div className={sectionClass}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-semibold text-slate-800">Materials (Stock Items)</h2>
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
                      options={availableMaterials.map(i => ({ id: i.id, label: i.name, subLabel: `${i.stockQuantity} in stock` }))}
                      value={m.itemId}
                      onChange={(val) => handleMaterialChange(idx, val)}
                      placeholder="Select Material"
                    />
                  </div>
                  <div className="w-20">
                    <input type="number" min="1" value={m.quantity} onChange={(e) => handleMaterialQuantityChange(idx, parseInt(e.target.value) || 1)} className={inputClass} placeholder="Qty" />
                  </div>
                  <div className="w-28 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">₹</span>
                    <input
                      type="number"
                      value={m.total}
                      onChange={(e) => {
                        const newTotal = parseFloat(e.target.value) || 0;
                        const newMaterials = [...formData.materials];
                        newMaterials[idx] = {
                          ...newMaterials[idx],
                          total: newTotal,
                          rate: m.quantity > 0 ? (newTotal / m.quantity) : 0
                        };
                        setFormData({ ...formData, materials: newMaterials });
                      }}
                      className={`${inputClass} pl-5 text-sm font-semibold`}
                    />
                  </div>
                  <button type="button" onClick={() => removeMaterial(idx)} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
              {formData.materials.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No materials added</p>}
            </div>
          </div>
        </div>

        {/* 6. CHARGES & TOTALS */}
        <div className={sectionClass}>
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <CreditCard className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-semibold text-slate-800">Charges & Totals</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className={labelClass}>Delivery Charges</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input type="number" value={formData.deliveryCharges} onChange={(e) => setFormData({ ...formData, deliveryCharges: parseFloat(e.target.value) || 0 })} className={`${inputClass} pl-8`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>GST Amount</label>
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
              <label className={labelClass}>Advance Paid</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input type="number" value={formData.advancePaid} onChange={(e) => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })} className={`${inputClass} pl-8`} />
              </div>
            </div>
          </div>

          {/* Totals Box */}
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
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3 bg-white border border-gray-200 text-slate-600 font-semibold rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploadingVoice || uploadingAttachments || isLimitReached}
            className="px-10 py-3 bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-3"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Creating Order...' : 'Create Tailoring Order'}
          </button>
        </div>
      </form>

      <LoadMeasurementModal
        isOpen={showMeasurementModal}
        onClose={() => setShowMeasurementModal(false)}
        onSelect={handleMeasurementSelect}
        measurementType={selectedMeasurementType}
      />
    </div>
  );
}
