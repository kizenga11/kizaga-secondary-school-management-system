import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

type Props = {
  token: string;
};

type SchoolSettings = {
  school_name: string;
  academic_year: string;
  address: string;
  region: string;
  district: string;
};

const SETTINGS_KEY = 'school_settings';

export default function SchoolSettings({ token }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SchoolSettings>({
    school_name: '',
    academic_year: '',
    address: '',
    region: '',
    district: '',
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/school', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      const json = (() => {
        try {
          return text ? JSON.parse(text) : null;
        } catch {
          return null;
        }
      })();
      if (!res.ok) {
        alert(json?.error || `Failed to load settings (HTTP ${res.status}). ${text?.slice(0, 200) || ''}`);
        return;
      }
      setData({
        school_name: json?.school_name || '',
        academic_year: json?.academic_year || '',
        address: json?.address || '',
        region: json?.region || '',
        district: json?.district || '',
      });

      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
          school_name: json?.school_name || '',
          academic_year: json?.academic_year || '',
          address: json?.address || '',
          region: json?.region || '',
          district: json?.district || '',
        }));
      } catch {
        // ignore
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/school', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const text = await res.text();
      const json = (() => {
        try {
          return text ? JSON.parse(text) : null;
        } catch {
          return null;
        }
      })();
      if (!res.ok) {
        alert(json?.error || `Failed to save settings (HTTP ${res.status}). ${text?.slice(0, 200) || ''}`);
        return;
      }

      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }

      try {
        window.dispatchEvent(new Event('schoolSettingsUpdated'));
      } catch {
        // ignore
      }
      alert('Settings saved successfully.');
    } catch (e: any) {
      alert(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">SCHOOL <span className="text-brand-primary">SETTINGS</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">School name, academic year, and address details</p>
        </div>
      </header>

      <div className="card-app p-6">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">School Name</label>
              <input
                className="input-app"
                value={data.school_name}
                onChange={e => setData({ ...data, school_name: e.target.value })}
                required
                placeholder="Kizaga Secondary School"
                disabled={loading || saving}
              />
            </div>

            <div>
              <label className="label-app">Academic Year</label>
              <input
                className="input-app"
                value={data.academic_year}
                onChange={e => setData({ ...data, academic_year: e.target.value })}
                required
                placeholder="2026"
                disabled={loading || saving}
              />
            </div>
          </div>

          <div>
            <label className="label-app">Address</label>
            <input
              className="input-app"
              value={data.address}
              onChange={e => setData({ ...data, address: e.target.value })}
              placeholder="P.O. Box..., Street, Ward"
              disabled={loading || saving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">Region</label>
              <input
                className="input-app"
                value={data.region}
                onChange={e => setData({ ...data, region: e.target.value })}
                placeholder="Dodoma"
                disabled={loading || saving}
              />
            </div>

            <div>
              <label className="label-app">District</label>
              <input
                className="input-app"
                value={data.district}
                onChange={e => setData({ ...data, district: e.target.value })}
                placeholder="Dodoma Urban"
                disabled={loading || saving}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" className="btn-dark flex items-center gap-2 disabled:opacity-50" disabled={loading || saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
