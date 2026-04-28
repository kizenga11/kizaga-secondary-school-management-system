import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { Upload, Image } from 'lucide-react';

interface SchoolSettingsProps {
  token: string;
}

export default function SchoolSettings({ token }: SchoolSettingsProps) {
  const [data, setData] = useState({
    school_name: '',
    academic_year: '',
    address: '',
    phone: '',
    email: '',
    region: '',
    district: '',
    ward: '',
    postal_code: '',
    website: '',
    motto: '',
    vision: '',
    mission: '',
    establishment_year: '',
    school_type: '',
    registration_number: '',
    bank_name: '',
    bank_account: '',
    headmaster_name: '',
    headmaster_phone: '',
    academic_head_name: '',
    academic_head_phone: '',
    logo_url: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useToast();

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/school', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load settings (HTTP ${res.status}). ${text.slice(0, 200)}`);
      }
      const json = await res.json();
      setData({
        school_name: json.school_name || '',
        academic_year: json.academic_year || '',
        address: json.address || '',
        phone: json.phone || '',
        email: json.email || '',
        region: json.region || '',
        district: json.district || '',
        ward: json.ward || '',
        postal_code: json.postal_code || '',
        website: json.website || '',
        motto: json.motto || '',
        vision: json.vision || '',
        mission: json.mission || '',
        establishment_year: json.establishment_year || '',
        school_type: json.school_type || '',
        registration_number: json.registration_number || '',
        bank_name: json.bank_name || '',
        bank_account: json.bank_account || '',
        headmaster_name: json.headmaster_name || '',
        headmaster_phone: json.headmaster_phone || '',
        academic_head_name: json.academic_head_name || '',
        academic_head_phone: json.academic_head_phone || '',
        logo_url: json.logo_url || '',
      });
      setLogoPreview(json.logo_url || '');
    } catch (e: any) {
      showError(e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showError('Image size must be less than 2MB');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async () => {
    if (!logoFile) return data.logo_url;

    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to upload logo');
      }

      const result = await res.json();
      return result.url;
    } catch (error) {
      showError('Failed to upload logo');
      return data.logo_url;
    }
  };



  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Upload logo first if there's a new one
      const logoUrl = await uploadLogo();
      
      const res = await fetch('/api/settings/school', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_name: data.school_name,
          academic_year: data.academic_year,
          address: data.address,
          phone: data.phone,
          email: data.email,
          region: data.region,
          district: data.district,
          ward: data.ward,
          postal_code: data.postal_code,
          website: data.website,
          motto: data.motto,
          vision: data.vision,
          mission: data.mission,
          establishment_year: data.establishment_year,
          school_type: data.school_type,
          registration_number: data.registration_number,
          bank_name: data.bank_name,
          bank_account: data.bank_account,
          headmaster_name: data.headmaster_name,
          headmaster_phone: data.headmaster_phone,
          academic_head_name: data.academic_head_name,
          academic_head_phone: data.academic_head_phone,
          logo_url: logoUrl,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to save settings (HTTP ${res.status}). ${text.slice(0, 200)}`);
      }
      localStorage.removeItem('school_settings');
      showSuccess('Settings saved successfully.');
    } catch (e: any) {
      showError(e?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data.school_name) {
    return <div className="p-8 text-center text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-slate-800">SCHOOL <span className="text-brand-primary">SETTINGS</span></h2>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Configure institution details</p>
      </header>

      <div className="card-app p-6 space-y-6">
        {/* School Logo */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">School Logo</h3>
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              {logoPreview ? (
                <img 
                  src={logoPreview} 
                  alt="School Logo" 
                  className="w-24 h-24 object-contain border-2 border-slate-200 rounded-lg bg-white p-2"
                />
              ) : (
                <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                  <Image size={32} className="text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                <div>
                  <label className="label-app">Upload Logo</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer transition-colors"
                    >
                      <Upload size={16} />
                      <span className="text-sm font-medium">Choose Image</span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    PNG, JPG or GIF (max. 2MB)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">School Name</label>
              <input
                type="text"
                value={data.school_name}
                onChange={(e) => setData({ ...data, school_name: e.target.value })}
                className="input-app"
              />
            </div>
            <div>
              <label className="label-app">Academic Year</label>
              <input
                type="text"
                value={data.academic_year}
                onChange={(e) => setData({ ...data, academic_year: e.target.value })}
                className="input-app"
                placeholder="2026"
              />
            </div>
            <div>
              <label className="label-app">School Type</label>
              <select
                value={data.school_type}
                onChange={(e) => setData({ ...data, school_type: e.target.value })}
                className="input-app"
              >
                <option value="">Select Type</option>
                <option value="Secondary">Secondary School</option>
                <option value="Technical">Technical School</option>
                <option value="Primary">Primary School</option>
              </select>
            </div>
            <div>
              <label className="label-app">Establishment Year</label>
              <input
                type="text"
                value={data.establishment_year}
                onChange={(e) => setData({ ...data, establishment_year: e.target.value })}
                className="input-app"
                placeholder="1990"
              />
            </div>
            <div>
              <label className="label-app">Registration Number</label>
              <input
                type="text"
                value={data.registration_number}
                onChange={(e) => setData({ ...data, registration_number: e.target.value })}
                className="input-app"
                placeholder="EM.12345"
              />
            </div>
            <div>
              <label className="label-app">Motto</label>
              <input
                type="text"
                value={data.motto}
                onChange={(e) => setData({ ...data, motto: e.target.value })}
                className="input-app"
                placeholder="Education for Excellence"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">Address</label>
              <input
                type="text"
                value={data.address}
                onChange={(e) => setData({ ...data, address: e.target.value })}
                className="input-app"
                placeholder="P.O. Box 1234"
              />
            </div>
            <div>
              <label className="label-app">Phone</label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                className="input-app"
                placeholder="+255 712 123 456"
              />
            </div>
            <div>
              <label className="label-app">Email</label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className="input-app"
                placeholder="info@school.ac.tz"
              />
            </div>
            <div>
              <label className="label-app">Website</label>
              <input
                type="url"
                value={data.website}
                onChange={(e) => setData({ ...data, website: e.target.value })}
                className="input-app"
                placeholder="www.school.ac.tz"
              />
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Location Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">Region</label>
              <input
                type="text"
                value={data.region}
                onChange={(e) => setData({ ...data, region: e.target.value })}
                className="input-app"
                placeholder="Dar es Salaam"
              />
            </div>
            <div>
              <label className="label-app">District</label>
              <input
                type="text"
                value={data.district}
                onChange={(e) => setData({ ...data, district: e.target.value })}
                className="input-app"
                placeholder="Kinondoni"
              />
            </div>
            <div>
              <label className="label-app">Ward</label>
              <input
                type="text"
                value={data.ward}
                onChange={(e) => setData({ ...data, ward: e.target.value })}
                className="input-app"
                placeholder="Mikocheni"
              />
            </div>
            <div>
              <label className="label-app">Postal Code</label>
              <input
                type="text"
                value={data.postal_code}
                onChange={(e) => setData({ ...data, postal_code: e.target.value })}
                className="input-app"
                placeholder="12345"
              />
            </div>
          </div>
        </div>

        {/* Vision & Mission */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Vision & Mission</h3>
          <div className="space-y-4">
            <div>
              <label className="label-app">Vision</label>
              <textarea
                value={data.vision}
                onChange={(e) => setData({ ...data, vision: e.target.value })}
                className="input-app w-full h-20 resize-none"
                placeholder="To be a center of excellence in education..."
              />
            </div>
            <div>
              <label className="label-app">Mission</label>
              <textarea
                value={data.mission}
                onChange={(e) => setData({ ...data, mission: e.target.value })}
                className="input-app w-full h-20 resize-none"
                placeholder="To provide quality education that nurtures..."
              />
            </div>
          </div>
        </div>

        {/* Leadership */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Leadership</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">Headmaster Name</label>
              <input
                type="text"
                value={data.headmaster_name}
                onChange={(e) => setData({ ...data, headmaster_name: e.target.value })}
                className="input-app"
                placeholder="Mr. John Doe"
              />
            </div>
            <div>
              <label className="label-app">Headmaster Phone</label>
              <input
                type="tel"
                value={data.headmaster_phone}
                onChange={(e) => setData({ ...data, headmaster_phone: e.target.value })}
                className="input-app"
                placeholder="+255 712 123 456"
              />
            </div>
            <div>
              <label className="label-app">Academic Head Name</label>
              <input
                type="text"
                value={data.academic_head_name}
                onChange={(e) => setData({ ...data, academic_head_name: e.target.value })}
                className="input-app"
                placeholder="Ms. Jane Smith"
              />
            </div>
            <div>
              <label className="label-app">Academic Head Phone</label>
              <input
                type="tel"
                value={data.academic_head_phone}
                onChange={(e) => setData({ ...data, academic_head_phone: e.target.value })}
                className="input-app"
                placeholder="+255 712 123 456"
              />
            </div>
          </div>
        </div>

        {/* Banking Information */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Banking Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">Bank Name</label>
              <input
                type="text"
                value={data.bank_name}
                onChange={(e) => setData({ ...data, bank_name: e.target.value })}
                className="input-app"
                placeholder="NBC Bank"
              />
            </div>
            <div>
              <label className="label-app">Bank Account Number</label>
              <input
                type="text"
                value={data.bank_account}
                onChange={(e) => setData({ ...data, bank_account: e.target.value })}
                className="input-app"
                placeholder="015123456789"
              />
            </div>
          </div>
        </div>







        <button onClick={handleSave} disabled={loading} className="btn-dark">
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}