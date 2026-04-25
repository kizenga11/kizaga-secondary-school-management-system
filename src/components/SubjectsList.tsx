import React, { useState, useEffect } from 'react';
import { Subject, User } from '../types.ts';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from './Toast';

interface SubjectsListProps {
  token: string;
}

export default function SubjectsList({ token }: SubjectsListProps) {
  const toast = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [subjectData, setSubjectData] = useState({
    name: '', code: '', form: 'Form 1', has_practical: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const sRes = await fetch('/api/subjects', { headers: { 'Authorization': `Bearer ${token}` } });
      const aRes = await fetch('/api/assignments', { headers: { 'Authorization': `Bearer ${token}` } });

      const sData = await sRes.json();
      const aData = await aRes.json();

      // Only set arrays – fall back to [] if the response isn't a real array
      setSubjects(
        Array.isArray(sData)
          ? sData.map((s: any) => ({ ...s, has_practical: Boolean(s.has_practical) }))
          : []
      );
      setAssignments(Array.isArray(aData) ? aData : []);
    } catch (err) {
      console.error('Failed to load subjects/assignments', err);
      setSubjects([]);
      setAssignments([]);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setSubjectData({ name: '', code: '', form: 'Form 1', has_practical: false });
    setShowModal(true);
  };

  const openEdit = (s: Subject) => {
    setEditingId(s.id);
    setSubjectData({
      name: s.name ?? '',
      code: s.code ?? '',
      form: s.form ?? 'Form 1',
      has_practical: Boolean(s.has_practical),
    });
    setShowModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/subjects/${editingId}` : '/api/subjects';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(subjectData)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.showError(data?.error || 'Failed to save subject');
      return;
    }

    setShowModal(false);
    toast.showSuccess('Subject saved successfully!');
    fetchData();
  };

  const handleDelete = async (s: Subject) => {
    if (!confirm(`Delete subject ${s.name} (${s.code})?`)) return;
    const res = await fetch(`/api/subjects/${s.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.showError(data?.error || 'Failed to delete subject');
      return;
    }
    toast.showSuccess('Subject deleted successfully!');
    fetchData();
  };

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">CURRICULUM <span className="text-brand-primary">MAP</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Manage subjects and department assignments</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={openAdd} className="btn-primary flex items-center space-x-2">
            <Plus size={14} />
            <span className="text-[10px]">Add Subject</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-app overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Subject Repository</div>
          <div className="divide-y divide-slate-100 italic">
            {subjects.map(s => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-brand-primary/10 border border-brand-primary/15 rounded flex items-center justify-center font-black text-brand-primary font-mono text-xs">
                    {s.code}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 uppercase tracking-tight text-sm">{s.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.form} {s.has_practical ? '• LAB REQ' : ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                    aria-label={`Edit ${s.name}`}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    className="p-2 rounded-md hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors"
                    aria-label={`Delete ${s.name}`}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {subjects.length === 0 && (
              <div className="p-8 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">No subjects defined.</div>
            )}
          </div>
        </div>

        <div className="card-app overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">Faculty Assignments</div>
          <div className="divide-y divide-slate-100">
            {assignments.map(a => {
              const teacherName = a.users?.full_name || 'Unknown';
              const subjectName = a.subjects?.name || 'Unknown';
              const form = a.subjects?.form || '—';

              return (
                <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-9 h-9 bg-brand-dark text-white rounded flex items-center justify-center text-[10px] font-black uppercase">
                      {teacherName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 uppercase tracking-tight text-sm italic">{teacherName}</p>
                      <p className="text-[9px] font-bold text-brand-primary uppercase tracking-widest">{subjectName} • {form}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {assignments.length === 0 && (
              <div className="p-8 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">No active assignments found.</div>
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
            <form onSubmit={handleSaveSubject}>
              <div className="bg-brand-sidebar p-5 text-white flex justify-between items-center">
                <h2 className="text-sm font-bold tracking-tight uppercase">{editingId ? 'Edit Subject' : 'Register Subject'}</h2>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label-app">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Mathematics, History, etc."
                    className="input-app"
                    value={subjectData.name}
                    onChange={e => setSubjectData({ ...subjectData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-app">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 011"
                    className="input-app"
                    value={subjectData.code}
                    onChange={e => setSubjectData({ ...subjectData, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-app">Form</label>
                  <select
                    className="input-app"
                    value={subjectData.form}
                    onChange={e => setSubjectData({ ...subjectData, form: e.target.value })}
                  >
                    <option>Form 1</option><option>Form 2</option><option>Form 3</option><option>Form 4</option>
                  </select>
                </div>
                <label className="flex items-center space-x-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-200"
                    checked={subjectData.has_practical}
                    onChange={e => setSubjectData({ ...subjectData, has_practical: e.target.checked })}
                  />
                  <span className="group-hover:text-brand-primary transition-colors">Has Practical</span>
                </label>
              </div>
              <div className="p-4 bg-slate-50 flex justify-end space-x-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                <button type="submit" className="btn-dark px-6">Save Subject</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
