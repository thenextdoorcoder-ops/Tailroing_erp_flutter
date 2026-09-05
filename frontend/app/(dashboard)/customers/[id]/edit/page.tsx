'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { User, Phone, MapPin, Briefcase, Calendar, Gift, MessageCircle, CornerUpLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

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

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    profession: '',
    preferredStyle: '',
    mobile: '',
    whatsapp: '',
    alternativeMobile: '',
    address: '',
    city: '',
    dob: '',
    specialOccasion: '',
    email: '',
    countryCode: '91',
  });

  useEffect(() => {
    fetchCustomer();
  }, [params.id]);

  const fetchCustomer = async () => {
    try {
      const response = await apiClient.get(`/customers/${params.id}`);
      const customer = response.data;

      setFormData({
        name: customer.name || '',
        profession: customer.profession || '',
        preferredStyle: customer.preferredStyle || '',
        mobile: customer.mobile || '',
        whatsapp: customer.whatsapp || '',
        alternativeMobile: customer.alternativeMobile || '',
        address: customer.address || '',
        city: customer.city || '',
        dob: customer.dob ? customer.dob.split('T')[0] : '',
        specialOccasion: customer.specialOccasion || '',
        email: customer.email || '',
        countryCode: customer.countryCode || '91',
      });
    } catch (error) {
      console.error('Failed to fetch customer:', error);
      toast({
        title: "Error",
        description: "Failed to load customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (['mobile', 'whatsapp', 'alternativeMobile'].includes(name)) {
      // Strip all non-digit characters (handles +, spaces, dashes, brackets on paste)
      let num = value.replace(/\D/g, '');
      // Auto-strip country code prefix if the user pasted a full international number
      // e.g. pasting "+1 (647) 961-2759" with Canada selected → stores "6479612759"
      const code = formData.countryCode;
      if (code && num.startsWith(code) && num.length > code.length) {
        num = num.substring(code.length);
      }
      setFormData((prev) => ({ ...prev, [name]: num.substring(0, 15) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await apiClient.put(`/customers/${params.id}`, formData);
      toast({
        title: "Success",
        description: "Customer updated successfully!",
        variant: "success",
      });
      router.push('/customers');
    } catch (error) {
      console.error('Update customer error:', error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Styles
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5";
  const inputClass = "w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all placeholder:text-gray-400";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-pink-600 font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fadeIn">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-slate-500 hover:text-pink-600 mb-2 text-sm font-medium transition-colors"
        >
          <CornerUpLeft className="w-4 h-4 mr-1" /> Back to Customers
        </button>
        <h1 className="text-3xl font-bold text-slate-800">Edit Customer</h1>
        <p className="text-slate-500 mt-1">Update customer information and preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity */}
          <div className="md:col-span-2 pb-2 mb-2 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-pink-500" /> Personal Info
            </h2>
          </div>

          <div>
            <label className={labelClass}>
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Profession
            </label>
            <input
              type="text"
              name="profession"
              value={formData.profession}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              <Gift className="w-3.5 h-3.5 text-slate-400" /> Preferred Style
            </label>
            <input
              type="text"
              name="preferredStyle"
              value={formData.preferredStyle}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. Modern, Traditional"
            />
          </div>

          <div>
            <label className={labelClass}>
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date of Birth
            </label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Contact */}
          <div className="md:col-span-2 pb-2 mb-2 mt-4 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Phone className="w-5 h-5 text-pink-500" /> Contact Details
            </h2>
          </div>

          <div>
            <label className={labelClass}>Country</label>
            <select
              name="countryCode"
              value={formData.countryCode}
              onChange={(e) => setFormData(prev => ({ ...prev, countryCode: e.target.value }))}
              className={inputClass}
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Mobile Number *
            </label>
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-slate-600 font-medium shrink-0">+{formData.countryCode}</span>
              <input
                type="tel"
                name="mobile"
                required
                value={formData.mobile}
                onChange={handleChange}
                className={inputClass}
                placeholder="Number without country code"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={inputClass}
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <label className={labelClass}>
              <MessageCircle className="w-3.5 h-3.5 text-slate-400" /> WhatsApp
            </label>
            <input
              type="tel"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Alternative Mobile
            </label>
            <input
              type="tel"
              name="alternativeMobile"
              value={formData.alternativeMobile}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2 pb-2 mb-2 mt-4 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-pink-500" /> Address
            </h2>
          </div>

          <div>
            <label className={labelClass}>
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              special Occasion
            </label>
            <input
              type="text"
              name="specialOccasion"
              value={formData.specialOccasion}
              onChange={handleChange}
              placeholder="e.g., Wedding, Anniversary"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>
              Full Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-8 flex gap-4 justify-end border-t border-gray-50 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-white border border-gray-300 text-slate-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-2.5 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}