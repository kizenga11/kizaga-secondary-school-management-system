import React, { useEffect, useMemo, useState } from 'react';
import { Subject } from '../types.ts';
import { Plus, Pencil, Trash2, Layers, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from './Toast';

type Stream = {
  id: number;
  form: string;
  name: string;
  subject_ids: number[];
};

interface StreamsProps {
  token: string;
}

export default function Streams({ token }: StreamsProps) {
  const toast = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('Form 1');
  const [selectedStreamId, setSelectedStreamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [streamData, setStreamData] = useState({ form: 'Form 1', name: '' });

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [subjectSearch, setSubjectSearch] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchStreams();
  }, [selectedForm]);

  useEffect(() => {
    const arr = Array.isArray(streams) ? streams : [];
    const s = arr.find(x => x.id === selectedStreamId);
    setSelectedSubjectIds(s ? (s.subject_ids || []) : []);
  }, [selectedStreamId, streams]);

  const subjectsForForm = useMemo(
    () => (Array.isArray(subjects) ? subjects : []).filter(s => s.form === selectedForm),
    [subjects, selectedForm]
  );

  const streamsForForm = useMemo(
    () => (Array.isArray(streams) ? streams : []).filter(s => s.form === selectedForm),
    [streams, selectedForm]
  );

  const selectedStream = useMemo(
    () => streamsForForm.find(s => s.id === selectedStreamId) || null,
    [streamsForForm, selectedStreamId]
  );

  const filteredSubjectsForForm = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return subjectsForForm;
    return subjectsForForm.filter(
      s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [subjectsForForm, subjectSearch]);

  const fetchSubjects = async () => {
    const res = await fetch('/api/subjects', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    setSubjects(arr.map((s: any) => ({ ...s, has_practical: Boolean(s.has_practical) })));
  };

  const fetchStreams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/streams?form=${encodeURIComponent(selectedForm)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setStreams(arr);

      const first = arr[0];
      setSelectedStreamId(first ? first.id : null);
    } catch {
      setStreams([]);
      setSelectedStreamId(null);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setStreamData({ form: selectedForm, name: '' });
    setShowModal(true);
  };

  const openEdit = (s: Stream) => {
    setEditingId(s.id);
    setStreamData({ form: s.form, name: s.name });
    setShowModal(true);
  };

  const saveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/streams/${editingId}` : '/api/streams';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ form: streamData.form, name: streamData.name })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.showError(data?.error || 'Failed to save stream');
      return;
    }

    setShowModal(false);
    setEditingId(null);
    setSelectedForm(streamData.form);
    toast.showSuccess('Stream saved successfully!');
    await fetchStreams();
  };

  const deleteStream = async (s: Stream) => {
    if (!confirm(`Delete stream ${s.form} ${s.name}?`)) return;
    const res = await fetch(`/api/streams/${s.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.showError(data?.error || 'Failed to delete stream');
      return;
    }
    await fetchStreams();
    setSelectedStreamId(null);
    toast.showSuccess('Stream deleted successfully!');
  };

  const toggleSubject = (id: number) => {
    setSelectedSubjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllFilteredSubjects = () => {
    const ids = filteredSubjectsForForm.map(s => s.id);
    setSelectedSubjectIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const clearAllSubjects = () => {
    setSelectedSubjectIds([]);
  };

  const saveSubjects = async () => {
    if (!selectedStreamId) return;
    const res = await fetch(`/api/streams/${selectedStreamId}/subjects`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subject_ids: selectedSubjectIds })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.showError(data?.error || 'Failed to update subjects');
      return;
    }

    await fetchStreams();
    setSelectedStreamId(null);
    toast.showSuccess('Subjects updated successfully!');
  };

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">CLASSES <span className="text-brand-primary">& STREAMS</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Set mikondo and assign subjects per stream</p>
        </div>
        <div className="flex gap-2">
          <select
            className="input-app py-1 tracking-tight !w-auto"
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
          >
            {['Form 1', 'Form 2', 'Form 3', 'Form 4'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button onClick={openAdd} className="btn-primary flex items-center space-x-2">
            <Plus size={14} />
            <span className="text-[10px]">New Stream</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-app overflow-hidden lg:col-span-1">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Streams ({selectedForm})</div>
          <div className="divide-y divide-slate-100">
            {streamsForForm.map((s) => (
              <div
                key={s.id}
                className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedStreamId === s.id ? 'bg-slate-50' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedStreamId(s.id)}
                  className="flex items-center gap-3 text-left flex-1"
                >
                  <div className="w-9 h-9 bg-brand-dark text-white rounded flex items-center justify-center text-[10px] font-black uppercase">
                    {s.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 uppercase tracking-tight">{selectedForm} {s.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{(s.subject_ids || []).length} subjects</div>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                    title="Edit"
                    aria-label="Edit stream"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStream(s)}
                    className="p-2 rounded-md hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors"
                    title="Delete"
                    aria-label="Delete stream"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {streamsForForm.length === 0 && (
              <div className="p-8 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">No streams created.</div>
            )}
          </div>
        </div>

        <div className="card-app overflow-hidden lg:col-span-2">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <Layers size={14} className="text-brand-primary" />
              <span>Subjects For Selected Stream</span>
            </div>
            <button
              type="button"
              disabled={!selectedStreamId || loading}
              onClick={saveSubjects}
              className="btn-dark px-4 py-2 disabled:opacity-50"
            >
              Save Subjects
            </button>
          </div>

          <div className="p-6">
            {!selectedStreamId && (
              <div className="p-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                Select a stream to assign subjects.
              </div>
            )}

            {selectedStreamId && (
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Assigning for <span className="text-brand-primary">{selectedForm} {selectedStream?.name}</span>
                    <span className="ml-2 text-slate-300">({selectedSubjectIds.length} selected)</span>
                  </div>
                  <div className="flex-1 lg:max-w-sm relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      className="input-app pl-9 py-2"
                      placeholder="Search subject name or code..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredSubjects}
                      disabled={filteredSubjectsForForm.length === 0}
                      className="px-3 py-2 rounded-md border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Select Visible
                    </button>
                    <button
                      type="button"
                      onClick={clearAllSubjects}
                      disabled={selectedSubjectIds.length === 0}
                      className="px-3 py-2 rounded-md border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredSubjectsForForm.map((subj) => {
                  const checked = selectedSubjectIds.includes(subj.id);
                  return (
                    <button
                      key={subj.id}
                      type="button"
                      onClick={() => toggleSubject(subj.id)}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        checked
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 uppercase tracking-tight">{subj.name}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{subj.code} {subj.has_practical ? '• LAB REQ' : ''}</div>
                        </div>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${checked ? 'bg-brand-primary border-brand-primary' : 'bg-white border-slate-300'}`}>
                          {checked && <div className="w-2.5 h-2.5 bg-white rounded" />}
                        </div>
                      </div>
                    </button>
                  );
                })}

                  {subjectsForForm.length === 0 && (
                    <div className="p-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest md:col-span-2">
                      No subjects for {selectedForm}. Create subjects first.
                    </div>
                  )}

                  {subjectsForForm.length > 0 && filteredSubjectsForForm.length === 0 && (
                    <div className="p-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest md:col-span-2">
                      No subject matches your search.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-slate-200"
          >
            <form onSubmit={saveStream}>
              <div className="bg-brand-sidebar p-5 text-white flex justify-between items-center">
                <h2 className="text-sm font-bold tracking-tight uppercase">{editingId ? 'Edit Stream' : 'Create Stream'}</h2>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="label-app">Form</label>
                  <select
                    className="input-app"
                    value={streamData.form}
                    onChange={(e) => setStreamData({ ...streamData, form: e.target.value })}
                  >
                    {['Form 1', 'Form 2', 'Form 3', 'Form 4'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-app">Name</label>
                  <input
                    className="input-app"
                    required
                    value={streamData.name}
                    onChange={(e) => setStreamData({ ...streamData, name: e.target.value })}
                    placeholder="A, B, Science, Arts..."
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 flex justify-end space-x-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-4 py-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-dark px-6">Save</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
