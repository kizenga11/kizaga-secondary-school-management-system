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
  });
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
      });
    } catch (e: any) {
      showError(e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);



  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/school', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_name: data.school_name,
          academic_year: data.academic_year
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

      <div className="card-app p-6 space-y-4">
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
        </div>







        <button onClick={handleSave} disabled={loading} className="btn-dark">
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}