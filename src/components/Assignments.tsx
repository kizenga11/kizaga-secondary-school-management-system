import React, { useState, useEffect } from 'react';
import { Subject, User } from '../types.ts';
import { Plus, UserPlus, Trash2, Pencil, ShieldCheck, BookOpen, GraduationCap, Search, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';

interface AssignmentsProps {
  token: string;
}

export default function Assignments({ token }: AssignmentsProps) {
  const toast = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [assignData, setAssignData] = useState({
    teacher_id: 0,
    subject_id: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, uRes, aRes] = await Promise.all([
        fetch('/api/subjects', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/assignments', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const [sData, uData, aData] = await Promise.all([
        sRes.json(),
        uRes.json(),
        aRes.json()
      ]);

      setSubjects(Array.isArray(sData) ? sData : []);
      setTeachers(Array.isArray(uData) ? uData.filter((u: User) => u.role === 'teacher') : []);
      setAssignments(Array.isArray(aData) ? aData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setAssignData({ teacher_id: 0, subject_id: 0 });
    setShowModal(true);
  };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    setAssignData({
      teacher_id: Number(a.teacher_id) || 0,
      subject_id: Number(a.subject_id) || 0,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assignData.teacher_id === 0 || assignData.subject_id === 0) {
      toast.showError('Please select both staff and subject');
      return;
    }

    setLoading(true);
    try {
      const url = editingId ? `/api/assignments/${editingId}` : '/api/assignments';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(assignData)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.showError(data?.error || 'Failed to save deployment');
        return;
      }
      setShowModal(false);
      setAssignData({ teacher_id: 0, subject_id: 0 });
      setEditingId(null);
      toast.showSuccess('Deployment saved successfully!');
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (assignment: any) => {
    setAssignmentToDelete(assignment);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setAssignmentToDelete(null);
  };

  const handleRemove = async () => {
    if (!assignmentToDelete) return;

    try {
      await fetch(`/api/assignments/${assignmentToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      closeDeleteConfirm();
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">FACULTY <span className="text-brand-primary">ASSIGNMENTS</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Authorize and deploy academic staff to core subjects</p>
        </div>
        <button 
          onClick={openAdd}
          className="btn-primary flex items-center space-x-2"
        >
          <UserPlus size={14} />
          <span>New Deployment</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-app p-5 bg-white flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-brand-primary/10 border border-brand-primary/15 flex items-center justify-center text-brand-primary">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Active Deployments</p>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{assignments.length}</p>
          </div>
        </div>
        <div className="card-app p-5 bg-white flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Teaching Staff</p>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{teachers.length}</p>
          </div>
        </div>
        <div className="card-app p-5 bg-white flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Available Courses</p>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{subjects.length}</p>
          </div>
        </div>
      </div>

      <div className="card-app overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Deployment Registry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest bg-slate-50/30 font-mono italic">
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Assigned Course</th>
                <th className="px-6 py-4">Academic Level</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px] italic">
              {assignments.map((a) => {
                const teacherName = a.users?.full_name || 'Unknown';
                const subjectName = a.subjects?.name || 'Unknown';
                const form = a.subjects?.form || '—';

                return (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          {teacherName.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-700">{teacherName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight">
                        {subjectName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-bold uppercase text-[11px] tracking-widest">
                      {form}
                    </td>
                  <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors mr-1"
                      title="Edit"
                      aria-label="Edit deployment"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => openDeleteConfirm(a)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                      title="Delete"
                      aria-label="Delete deployment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
                );
              })}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Search className="mx-auto mb-3 text-slate-200" size={32} />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No staff deployments recorded in database.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-slate-200"
          >
            <form onSubmit={handleSave}>
              <div className="bg-brand-sidebar p-5 text-white flex justify-between items-center">
                <h2 className="text-sm font-bold tracking-tight uppercase flex items-center space-x-2">
                  <UserPlus size={18} className="text-brand-primary" />
                  <span>{editingId ? 'Edit Staff Deployment' : 'Execute Staff Deployment'}</span>
                </h2>
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
                  <label className="label-app">Teacher</label>
                  <select 
                    className="input-app" 
                    required
                    value={assignData.teacher_id}
                    onChange={e => setAssignData({...assignData, teacher_id: parseInt(e.target.value)})}
                  >
                    <option value="0">--- SELECT QUALIFIED TEACHER ---</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-app">Subject</label>
                  <select 
                    className="input-app" 
                    required
                    value={assignData.subject_id}
                    onChange={e => setAssignData({...assignData, subject_id: parseInt(e.target.value)})}
                  >
                    <option value="0">--- SELECT SUBJECT / LEVEL ---</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} - {s.form}</option>)}
                  </select>
                </div>
                <div className="p-4 bg-brand-primary/10 border border-brand-primary/15 rounded-lg">
                  <p className="text-[10px] text-brand-primary font-bold leading-relaxed uppercase italic">
                    Note: Direct deployment will grant the selected staff member authority to manage topics and student results for the assigned course.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 flex justify-end space-x-2 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="px-4 py-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest"
                >
                  Terminate
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-dark px-6 disabled:opacity-50"
                >
                  {editingId ? 'Update Deployment' : 'Commit Deployment'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-rose-100"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} className="text-rose-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2">REMOVE DEPLOYMENT?</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6 italic">
                  You are about to remove deployment for <span className="text-slate-700 font-bold">{assignmentToDelete?.users?.full_name || 'selected staff'}</span>.
                </p>
                <div className="flex flex-col space-y-2">
                  <button onClick={handleRemove} className="btn-dark bg-rose-600 hover:bg-rose-700 py-3">Yes, Remove Deployment</button>
                  <button onClick={closeDeleteConfirm} className="py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
