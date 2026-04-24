import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { User } from '../types.ts';

type Props = {
  token: string;
  user: User;
  onUserUpdated: (u: User) => void;
};

type Profile = {
  full_name: string;
  gender: string;
  education_level: string;
  studied_subjects: string;
  teaching_subjects: string;
  tsc_no: string;
  cheque_no: string;
  employment_date: string;
  confirmation_date: string;
  retirement_date: string;
  salary_scale: string;
  date_of_birth: string;
  nida_no: string;
};

export default function MyProfile({ token, user, onUserUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Profile>({
    full_name: user.full_name || '',
    gender: '',
    education_level: '',
    studied_subjects: '',
    teaching_subjects: '',
    tsc_no: user.tsc_no || '',
    cheque_no: '',
    employment_date: '',
    confirmation_date: '',
    retirement_date: '',
    salary_scale: '',
    date_of_birth: '',
    nida_no: '',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert(json?.error || 'Failed to load profile');
        return;
      }
      setData({
        full_name: json?.full_name || user.full_name || '',
        gender: json?.gender || '',
        education_level: json?.education_level || '',
        studied_subjects: json?.studied_subjects || '',
        teaching_subjects: json?.teaching_subjects || '',
        tsc_no: json?.tsc_no || user.tsc_no || '',
        cheque_no: json?.cheque_no || '',
        employment_date: json?.employment_date || '',
        confirmation_date: json?.confirmation_date || '',
        retirement_date: json?.retirement_date || '',
        salary_scale: json?.salary_scale || '',
        date_of_birth: json?.date_of_birth || '',
        nida_no: json?.nida_no || '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const namesCount = String(data.full_name || '').trim().split(/\s+/).filter(Boolean).length;
    if (namesCount < 3) {
      alert('Full Name must contain at least 3 names.');
      return;
    }
    if (data.nida_no && !/^\d{20}$/.test(String(data.nida_no).trim())) {
      alert('NIDA Number must be exactly 20 digits.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error || `Failed to save profile (HTTP ${res.status})`;
        alert(msg);
        console.error('Save profile error:', res.status, json);
        return;
      }

      const nextUser: User = { ...user, full_name: data.full_name, tsc_no: data.tsc_no };
      onUserUpdated(nextUser);
      try {
        localStorage.setItem('user', JSON.stringify(nextUser));
      } catch {
        // ignore
      }

      alert('Profile saved successfully.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">MY <span className="text-brand-primary">PROFILE</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Fill your staff details for reporting</p>
        </div>
      </header>

      <div className="card-app p-6">
        <form onSubmit={save} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">Full Name (3 Names)</label>
              <input
                className="input-app"
                value={data.full_name}
                onChange={e => setData({ ...data, full_name: e.target.value })}
                required
                disabled={loading || saving}
                placeholder="First Middle Last"
              />
            </div>

            <div>
              <label className="label-app">Gender</label>
              <select
                className="input-app"
                value={data.gender}
                onChange={e => setData({ ...data, gender: e.target.value })}
                disabled={loading || saving}
                required
              >
                <option value="">Select gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">Education Level</label>
              <select
                className="input-app"
                value={data.education_level}
                onChange={e => setData({ ...data, education_level: e.target.value })}
                disabled={loading || saving}
                required
              >
                <option value="">Select level</option>
                <option value="Certificate">Certificate</option>
                <option value="Diploma">Diploma</option>
                <option value="Bachelor">Bachelor Degree</option>
                <option value="Masters">Masters</option>
                <option value="PhD">PhD</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="label-app">Salary Scale</label>
              <input
                className="input-app"
                value={data.salary_scale}
                onChange={e => setData({ ...data, salary_scale: e.target.value })}
                disabled={loading || saving}
                placeholder="e.g. TGTS D1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">TSC Number</label>
              <input
                className="input-app font-mono"
                value={data.tsc_no}
                onChange={e => setData({ ...data, tsc_no: e.target.value })}
                disabled={loading || saving}
                placeholder="TSC-123456"
              />
            </div>

            <div>
              <label className="label-app">Cheque Number</label>
              <input
                className="input-app font-mono"
                value={data.cheque_no}
                onChange={e => setData({ ...data, cheque_no: e.target.value })}
                disabled={loading || saving}
                placeholder="Cheque No"
              />
            </div>
          </div>

          <div>
            <label className="label-app">Subjects Studied</label>
            <textarea
              className="input-app min-h-24"
              value={data.studied_subjects}
              onChange={e => setData({ ...data, studied_subjects: e.target.value })}
              disabled={loading || saving}
              placeholder="Write subjects separated by commas"
            />
          </div>

          <div>
            <label className="label-app">Subjects Taught</label>
            <textarea
              className="input-app min-h-24"
              value={data.teaching_subjects}
              onChange={e => setData({ ...data, teaching_subjects: e.target.value })}
              disabled={loading || saving}
              placeholder="Write subjects separated by commas"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">Employment Date</label>
              <input
                type="date"
                className="input-app"
                value={data.employment_date}
                onChange={e => setData({ ...data, employment_date: e.target.value })}
                disabled={loading || saving}
              />
            </div>
            <div>
              <label className="label-app">Confirmation Date</label>
              <input
                type="date"
                className="input-app"
                value={data.confirmation_date}
                onChange={e => setData({ ...data, confirmation_date: e.target.value })}
                disabled={loading || saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-app">Retirement Date</label>
              <input
                type="date"
                className="input-app"
                value={data.retirement_date}
                onChange={e => setData({ ...data, retirement_date: e.target.value })}
                disabled={loading || saving}
              />
            </div>

            <div>
              <label className="label-app">Date of Birth</label>
              <input
                type="date"
                className="input-app"
                value={data.date_of_birth}
                onChange={e => setData({ ...data, date_of_birth: e.target.value })}
                disabled={loading || saving}
              />
            </div>
          </div>

          <div>
            <label className="label-app">NIDA Number (20 digits)</label>
            <input
              className="input-app font-mono"
              value={data.nida_no}
              onChange={e => setData({ ...data, nida_no: e.target.value })}
              disabled={loading || saving}
              placeholder="20 digits"
              inputMode="numeric"
              required
            />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-300 italic">
              Must be exactly 20 digits.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button type="submit" className="btn-dark flex items-center gap-2 disabled:opacity-50" disabled={loading || saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
