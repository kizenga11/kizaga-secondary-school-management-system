import React, { useState, useEffect } from 'react';
import { Student } from '../types.ts';
import { 
  UserPlus, 
  Search, 
  GraduationCap, 
  X, 
  Filter, 
  Trash2, 
  Edit3, 
  Upload, 
  Download, 
  ArrowUpCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentsListProps {
  token: string;
}

type Stream = {
  id: number;
  form: string;
  name: string;
  subject_ids: number[];
};

export default function StudentsList({ token }: StudentsListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedForm, setSelectedForm] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'M',
    form: 'Form 1',
    parent_phone: '',
    stream_id: null as number | null,
  });

  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    // Streams are only relevant for active forms.
    if (formData.form === 'Graduated') {
      setStreams([]);
      if (formData.stream_id !== null) setFormData({ ...formData, stream_id: null });
      return;
    }
    fetchStreamsForForm(formData.form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, formData.form]);

  const fetchStudents = async () => {
    const res = await fetch('/api/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setStudents(data);
  };

  const fetchStreamsForForm = async (form: string) => {
    const res = await fetch(`/api/streams?form=${encodeURIComponent(form)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setStreams(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
    const method = editingStudent ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json' 
      },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      handleCloseModal();
      fetchStudents();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setFormData({ full_name: '', gender: 'M', form: 'Form 1', parent_phone: '', stream_id: null });
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name,
      gender: student.gender,
      form: student.form,
      parent_phone: student.parent_phone || '',
      stream_id: student.stream_id ?? null,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this student? All academic history will be inaccessible.')) return;
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchStudents();
  };

  const handlePromote = async () => {
    const res = await fetch('/api/students/promote', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      setShowPromoteConfirm(false);
      fetchStudents();
      alert('Promotion successful! Students have moved to the next academic level.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const data = lines.slice(1).filter(line => line.trim() !== '').map(line => {
        const [full_name, gender, form, parent_phone] = line.split(',').map(s => s.trim());
        return { full_name, gender, form, parent_phone };
      });
      setCsvPreview(data);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (csvPreview.length === 0) return;
    const res = await fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(csvPreview)
    });
    if (res.ok) {
      setShowImportModal(false);
      setCsvPreview([]);
      fetchStudents();
    }
  };

  const downloadTemplate = () => {
    const headers = 'full_name,gender,form,parent_phone\n';
    const example = 'John Doe,M,Form 1,0712345678\nJane Smith,F,Form 2,0654321098';
    const blob = new Blob([headers + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesForm = selectedForm === '' || s.form === selectedForm;
    return matchesSearch && matchesForm;
  });

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">STUDENT <span className="text-brand-primary">ENROLLMENT</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Manage school-wide student registry</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowPromoteConfirm(true)} className="btn-dark flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700">
            <ArrowUpCircle size={14} />
            <span className="hidden sm:inline">Promote All</span>
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn-dark flex items-center space-x-2">
            <Upload size={14} />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center space-x-2">
            <UserPlus size={14} />
            <span>New Enrollment</span>
          </button>
        </div>
      </header>

      <div className="card-app">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-app pl-10"
            />
          </div>
          <div className="relative w-full md:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select 
              value={selectedForm}
              onChange={(e) => setSelectedForm(e.target.value)}
              className="input-app pl-9 text-[11px] font-bold uppercase tracking-wider"
            >
              <option value="">All Levels</option>
              {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Graduated'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest bg-slate-50/30">
                <th className="px-6 py-3">Full Legal Name</th>
                <th className="px-6 py-3 text-center">Gender</th>
                <th className="px-6 py-3 text-center">Level</th>
                <th className="px-6 py-3">Stream</th>
                <th className="px-6 py-3">Guardian Contact</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-3 font-semibold text-slate-700">{s.full_name}</td>
                  <td className="px-6 py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter bg-brand-primary/10 text-brand-primary">
                      {s.gender === 'M' ? 'Male' : 'Female'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`font-bold italic ${s.form === 'Graduated' ? 'text-slate-400' : 'text-brand-primary'}`}>{s.form}</span>
                  </td>
                  <td className="px-6 py-3 text-slate-600 font-semibold">
                    {s.stream_name ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">{s.stream_name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-300 font-bold text-[10px] uppercase tracking-widest italic">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono text-[11px] text-slate-500">{s.parent_phone || 'NOT PROVIDED'}</td>
                  <td className="px-6 py-3 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(s)} className="p-1.5 text-slate-400 hover:text-brand-primary transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div className="p-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px] italic">No matching records found.</div>
          )}
        </div>
      </div>

      {/* Main Registration/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-slate-200"
            >
              <form onSubmit={handleSubmit}>
                <div className="bg-brand-sidebar p-5 text-white flex justify-between items-center">
                  <h2 className="text-sm font-bold flex items-center space-x-2 tracking-tight uppercase">
                    <GraduationCap size={18} className="text-brand-primary" />
                    <span>{editingStudent ? 'Update Profile' : 'Student Registration'}</span>
                  </h2>
                  <button type="button" onClick={handleCloseModal} className="text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="label-app">Full Name (Majina 3)</label>
                    <input 
                      type="text" required 
                      value={formData.full_name}
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                      className="input-app"
                      placeholder="Enter full legal name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-app">Gender</label>
                      <select 
                        value={formData.gender}
                        onChange={e => setFormData({...formData, gender: e.target.value})}
                        className="input-app"
                      >
                        <option value="M">Male (M)</option>
                        <option value="F">Female (F)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-app">Academic Level</label>
                      <select 
                        value={formData.form}
                        onChange={e => setFormData({ ...formData, form: e.target.value, stream_id: null })}
                        className="input-app"
                      >
                        <option>Form 1</option>
                        <option>Form 2</option>
                        <option>Form 3</option>
                        <option>Form 4</option>
                        <option>Graduated</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label-app">Stream (Mkondo)</label>
                    <select
                      value={formData.stream_id ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFormData({ ...formData, stream_id: v === '' ? null : Number(v) });
                      }}
                      className="input-app"
                      disabled={formData.form === 'Graduated'}
                    >
                      <option value="">No stream</option>
                      {streams.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                    {formData.form !== 'Graduated' && streams.length === 0 && (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-300 italic">No streams for this form. Create streams first.</p>
                    )}
                  </div>
                  <div>
                    <label className="label-app">Guardian Contact Number</label>
                    <input 
                      type="tel" 
                      value={formData.parent_phone}
                      onChange={e => setFormData({...formData, parent_phone: e.target.value})}
                      className="input-app"
                      placeholder="e.g. 0712 000 000"
                    />
                  </div>
                </div>
                <div className="p-4 bg-slate-50 flex justify-end space-x-2 border-t border-slate-200">
                  <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest transition-colors hover:text-slate-700">Cancel</button>
                  <button type="submit" className="btn-dark px-6">
                    {editingStudent ? 'Save Changes' : 'Submit Enrollment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="bg-brand-sidebar p-5 text-white flex justify-between items-center">
                <h2 className="text-sm font-bold flex items-center space-x-2 tracking-tight uppercase">
                  <Upload size={18} className="text-brand-primary" />
                  <span>Bulk Registry Import</span>
                </h2>
                <button type="button" onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">1. Preparation Guide</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed italic">
                        Download the CSV template below. Ensure the columns are in the exact same order. Use "M" or "F" for gender and ensure forms match shool nomenclature (e.g. "Form 1").
                      </p>
                      <button onClick={downloadTemplate} className="flex items-center space-x-2 text-brand-primary font-bold text-[10px] uppercase tracking-widest hover:underline pt-2">
                        <Download size={14} />
                        <span>Download Template (.csv)</span>
                      </button>
                    </div>

                    <div className="p-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 text-center">
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileUpload}
                        className="hidden" 
                        id="csv-upload" 
                      />
                      <label htmlFor="csv-upload" className="cursor-pointer group block">
                        <FileText size={32} className="mx-auto text-slate-300 group-hover:text-brand-primary transition-colors mb-3" />
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Select CSV File</span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-xl flex flex-col max-h-80">
                    <div className="p-3 border-b border-slate-200 bg-white/50 text-[9px] font-black uppercase tracking-widest text-slate-400 flex justify-between">
                      <span>Data Preview</span>
                      <span className="text-brand-primary">{csvPreview.length} Records</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 text-[10px] space-y-2">
                      {csvPreview.length > 0 ? (
                        csvPreview.map((item, idx) => (
                          <div key={idx} className="p-2 bg-white rounded border border-slate-100 flex justify-between items-center italic">
                            <span className="font-bold text-slate-700 truncate max-w-[120px]">{item.full_name}</span>
                            <span className="text-brand-primary px-1.5 py-0.5 bg-brand-primary/10 rounded font-black">{item.form}</span>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase tracking-widest italic pt-12">No data loaded.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-2 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => setShowImportModal(false)} className="px-6 py-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Discard</button>
                  <button 
                    onClick={handleImportSubmit}
                    disabled={csvPreview.length === 0}
                    className="btn-dark px-10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Import
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promotion Confirm Modal */}
      <AnimatePresence>
        {showPromoteConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-rose-100"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowUpCircle size={32} className="text-rose-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2">PROMOTE STUDENTS?</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6 italic">
                  This will move all students to the next academic level. Form 4 students will be flagged as <span className="text-brand-primary font-bold">Graduated</span>. This action is final.
                </p>
                <div className="flex flex-col space-y-2">
                  <button onClick={handlePromote} className="btn-dark bg-rose-600 hover:bg-rose-700 py-3">Yes, Execute Promotion</button>
                  <button onClick={() => setShowPromoteConfirm(false)} className="py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Go Back</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
