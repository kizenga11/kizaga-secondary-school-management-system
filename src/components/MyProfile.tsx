import React, { useEffect, useState } from 'react';
import { User } from '../types.ts';
import { useToast } from './Toast';

interface MyProfileProps {
  token: string;
  user: User;
  onUserUpdated: (user: User) => void;
}

export default function MyProfile({ token, user, onUserUpdated }: MyProfileProps) {
  const [data, setData] = useState({
    role: '',
    user_id: '',
    full_name: '',
    tsc_no: '',
    email: '',
    phone: '',
    gender: '',
    education_level: '',
    studied_subjects: '',
    teaching_subjects: '',
    cheque_no: '',
    employment_date: '',
    confirmation_date: '',
    retirement_date: '',
    salary_scale: '',
    date_of_birth: '',
    nida_no: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to load profile');
      }
      setData({
        role: json.role || '',
        user_id: json.user_id || '',
        full_name: json.full_name || '',
        tsc_no: json.tsc_no || '',
        email: json.email || '',
        phone: json.phone || '',
        gender: json.gender || '',
        education_level: json.education_level || '',
        studied_subjects: json.studied_subjects || '',
        teaching_subjects: json.teaching_subjects || '',
        cheque_no: json.cheque_no || '',
        employment_date: json.employment_date || '',
        confirmation_date: json.confirmation_date || '',
        retirement_date: json.retirement_date || '',
        salary_scale: json.salary_scale || '',
        date_of_birth: json.date_of_birth || '',
        nida_no: json.nida_no || '',
      });
    } catch (e: any) {
      showError(e?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const namesCount = String(data.full_name || '').trim().split(/\s+/).filter(Boolean).length;
    if (namesCount < 3) {
      showError('Full Name must contain at least 3 names (First Middle Last)');
      return;
    }
    if (data.nida_no && !/^\d{20}$/.test(String(data.nida_no).trim())) {
      showError('NIDA Number must be exactly 20 digits');
      return;
    }
    if (data.cheque_no && !/^\d{4,}$/.test(String(data.cheque_no).trim())) {
      showError('Cheque Number must be digits only, with at least 4 digits');
      return;
    }

    // Convert empty strings to null for date fields
    const body = {
      ...data,
      role: undefined,
      user_id: undefined,
      employment_date: data.employment_date || null,
      confirmation_date: data.confirmation_date || null,
      retirement_date: data.retirement_date || null,
      date_of_birth: data.date_of_birth || null,
    };

    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error || `Failed to save profile (HTTP ${res.status})`;
        showError(msg);
        return;
      }

      const nextUser: User = { ...user, full_name: data.full_name, tsc_no: data.tsc_no };
      onUserUpdated(nextUser);
      try {
        localStorage.setItem('user', JSON.stringify(nextUser));
      } catch {
        // ignore
      }

      showSuccess('Profile saved successfully.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800">MY <span className="text-brand-primary">PROFILE</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Personal information & employment details</p>
        </div>
      </header>

      <form onSubmit={save} className="card-app p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label-app">Role</label>
            <input type="text" value={data.role} disabled className="input-app opacity-50" />
          </div>
          <div className="md:col-span-2">
            <label className="label-app">Auth User ID</label>
            <input type="text" value={data.user_id} disabled className="input-app opacity-50 font-mono text-[11px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-app">Full Name</label>
            <input
              type="text"
              value={data.full_name}
              onChange={(e) => setData({ ...data, full_name: e.target.value })}
              className="input-app"
              placeholder="First Middle Last"
            />
          </div>
          <div>
            <label className="label-app">TSC Number</label>
            <input
              type="text"
              value={data.tsc_no}
              onChange={(e) => setData({ ...data, tsc_no: e.target.value })}
              className="input-app"
              placeholder="e.g. K15078"
            />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Example: K15078</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-app">Email</label>
            <input type="email" value={data.email} disabled className="input-app opacity-50" />
          </div>
          <div>
            <label className="label-app">Phone</label>
            <input
              type="text"
              value={data.phone}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              className="input-app"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label-app">Gender</label>
            <select
              value={data.gender}
              onChange={(e) => setData({ ...data, gender: e.target.value })}
              className="input-app"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label className="label-app">Date of Birth</label>
            <input
              type="date"
              value={data.date_of_birth}
              onChange={(e) => setData({ ...data, date_of_birth: e.target.value })}
              className="input-app"
            />
          </div>
          <div>
            <label className="label-app">NIDA Number</label>
            <input
              type="text"
              value={data.nida_no}
              onChange={(e) => setData({ ...data, nida_no: e.target.value })}
              className="input-app"
              placeholder="20 digits"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-app">Education Level</label>
            <input
              type="text"
              value={data.education_level}
              onChange={(e) => setData({ ...data, education_level: e.target.value })}
              className="input-app"
              placeholder="Degree, Diploma..."
            />
          </div>
          <div>
            <label className="label-app">Salary Scale</label>
            <input
              type="text"
              value={data.salary_scale}
              onChange={(e) => setData({ ...data, salary_scale: e.target.value })}
              className="input-app"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-app">Cheque Number</label>
            <input
              type="text"
              value={data.cheque_no}
              onChange={(e) => setData({ ...data, cheque_no: e.target.value })}
              className="input-app"
              placeholder="e.g. 11021188"
            />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Digits only. Minimum 4 digits (e.g. 11021188).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label-app">Employment Date</label>
            <input
              type="date"
              value={data.employment_date}
              onChange={(e) => setData({ ...data, employment_date: e.target.value })}
              className="input-app"
            />
          </div>
          <div>
            <label className="label-app">Confirmation Date</label>
            <input
              type="date"
              value={data.confirmation_date}
              onChange={(e) => setData({ ...data, confirmation_date: e.target.value })}
              className="input-app"
            />
          </div>
          <div>
            <label className="label-app">Retirement Date</label>
            <input
              type="date"
              value={data.retirement_date}
              onChange={(e) => setData({ ...data, retirement_date: e.target.value })}
              className="input-app"
            />
          </div>
        </div>

        <div>
          <label className="label-app">Subjects Studied</label>
          <textarea
            rows={2}
            value={data.studied_subjects}
            onChange={(e) => setData({ ...data, studied_subjects: e.target.value })}
            className="input-app resize-none"
            placeholder="Use comma-separated format. Example: Mathematics, Physics, Chemistry"
          />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Format: Subject 1, Subject 2, Subject 3</p>
        </div>

        <div>
          <label className="label-app">Subjects to Teach</label>
          <textarea
            rows={2}
            value={data.teaching_subjects}
            onChange={(e) => setData({ ...data, teaching_subjects: e.target.value })}
            className="input-app resize-none"
            placeholder="Use comma-separated format. Example: Mathematics Form 1, Physics Form 3"
          />
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tip: include subject and class for clarity.</p>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={saving} className="btn-dark">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}