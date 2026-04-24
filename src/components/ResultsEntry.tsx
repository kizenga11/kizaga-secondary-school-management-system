import React, { useState, useEffect } from 'react';
import { Exam, Student, Subject, Result } from '../types.ts';
import { Save, Plus, ClipboardList, Search, GraduationCap, X } from 'lucide-react';
import { motion } from 'motion/react';

interface ResultsEntryProps {
  token: string;
  userRole: string;
}

export default function ResultsEntry({ token, userRole }: ResultsEntryProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Record<number, { score: string; absent: boolean }>>({});
  
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [component, setComponent] = useState<'theory' | 'practical' | null>(null);
  const [showExamModal, setShowExamModal] = useState(false);
  const [examData, setExamData] = useState({ name: '', type: 'Test' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExamsAndSubjects();
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    if (component === null) return;
    fetchStudentsAndResults();
  }, [selectedExam, selectedSubject, component]);

  useEffect(() => {
    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) return;

    if (subject.has_practical) {
      setComponent(null);
    } else {
      setComponent('theory');
    }

    // Avoid showing stale candidates while the teacher picks a component.
    setStudents([]);
    setResults({});
  }, [selectedSubject, subjects]);

  const fetchExamsAndSubjects = async () => {
    const eRes = await fetch('/api/exams', { headers: { 'Authorization': `Bearer ${token}` } });
    const sRes = await fetch('/api/subjects', { headers: { 'Authorization': `Bearer ${token}` } });
    const eData = await eRes.json();
    const sData = await sRes.json();
    setExams(eData);
    setSubjects(sData);
    if (eData.length > 0) setSelectedExam(eData[0].id);
    if (sData.length > 0) setSelectedSubject(sData[0].id);
  };

  const fetchStudentsAndResults = async () => {
    setLoading(true);
    // Find form of the selected subject
    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) {
      setLoading(false);
      return;
    }

    const stRes = await fetch(`/api/students?subject_id=${selectedSubject}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const filteredStudents = await stRes.json();
    setStudents(filteredStudents);

    if (selectedExam && selectedSubject) {
      const rRes = await fetch(`/api/results?exam_id=${selectedExam}&subject_id=${selectedSubject}&component=${component}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rData = await rRes.json();
      const resMap: Record<number, { score: string; absent: boolean }> = {};
      rData.forEach((r: Result) => {
        resMap[r.student_id] = {
          score: r.score === null || r.score === undefined ? '' : String(r.score),
          absent: (r.absent ?? 0) === 1,
        };
      });
      setResults(resMap);
    }
    setLoading(false);
  };

  const handleScoreChange = (studentId: number, score: string) => {
    const prev = results[studentId] || { score: '', absent: false };
    setResults({
      ...results,
      [studentId]: {
        score,
        absent: prev.absent,
      },
    });
  };

  const handleAbsentChange = (studentId: number, absent: boolean) => {
    const prev = results[studentId] || { score: '', absent: false };
    setResults({
      ...results,
      [studentId]: {
        score: absent ? '' : prev.score,
        absent,
      },
    });
  };

  const handleSave = async () => {
    if (!selectedExam || !selectedSubject) return;
    if (component === null) {
      alert('Chagua Theory au Practical kwanza.');
      return;
    }
    setLoading(true);
    for (const [studentId, entry] of Object.entries(results) as Array<[
      string,
      { score: string; absent: boolean }
    ]>) {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          student_id: parseInt(studentId), 
          exam_id: selectedExam, 
          subject_id: selectedSubject, 
          component,
          absent: entry.absent,
          score: entry.absent ? null : (entry.score === '' ? null : parseFloat(entry.score)),
        })
      });
    }
    alert('Matokeo yamehifadhiwa kikamilifu!');
    setLoading(false);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(examData)
    });
    setShowExamModal(false);
    fetchExamsAndSubjects();
  };

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">EXAM <span className="text-brand-primary">SCORES</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Authorize and commit student academic results</p>
        </div>
        {userRole === 'academic' && (
          <button 
            onClick={() => setShowExamModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={14} />
            <span>New Exam Batch</span>
          </button>
        )}
      </header>

      {(() => {
        const subject = subjects.find(s => s.id === selectedSubject);
        if (!subject || !subject.has_practical) return null;
        if (component !== null) return null;
        return (
          <div className="card-app p-6">
            <p className="text-xs font-black uppercase tracking-widest text-slate-700">Somo lina Practical</p>
            <p className="mt-2 text-xs text-slate-500">Chagua unataka kujaza matokeo ya <span className="font-bold text-brand-primary">Theory</span> au <span className="font-bold text-brand-primary">Practical</span>.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setComponent('theory')} className="btn-primary">Theory</button>
              <button onClick={() => setComponent('practical')} className="btn-secondary">Practical</button>
            </div>
          </div>
        );
      })()}

      <div className="card-app p-6 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="label-app">Authorization Batch</label>
            <select 
              value={selectedExam || ''} 
              onChange={e => setSelectedExam(parseInt(e.target.value))}
              className="input-app"
            >
              <option value="">-- SELECT EXAM --</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label-app">Subject / Department</label>
            <select 
              value={selectedSubject || ''} 
              onChange={e => setSelectedSubject(parseInt(e.target.value))}
              className="input-app"
            >
              <option value="">-- SELECT SUBJECT --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} - {s.form}</option>)}
            </select>
          </div>
        </div>

        {(() => {
          const subject = subjects.find(s => s.id === selectedSubject);
          if (!subject) return null;
          if (!subject.has_practical) return null;
          if (component === null) return null;
          return (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Component</p>
                <p className="text-xs font-bold text-slate-800">{component === 'theory' ? 'Theory' : 'Practical'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setComponent('theory')} className={`px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest border ${component === 'theory' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Theory</button>
                <button onClick={() => setComponent('practical')} className={`px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest border ${component === 'practical' ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Practical</button>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="card-app">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Performance Matrix ({students.length} candidates)
          </h2>
          {students.length > 0 && (
            <button 
              onClick={handleSave}
              disabled={loading || component === null}
              className="btn-dark flex items-center space-x-2 disabled:opacity-50 !py-1.5"
            >
              <Save size={14} />
              <span className="text-[10px]">Commit result batch</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest bg-slate-50/30">
                <th className="px-6 py-3">Student Identity</th>
                <th className="px-6 py-3 text-center">Score (%)</th>
                <th className="px-6 py-3 text-center">Absent</th>
                <th className="px-6 py-3 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {students.map((s) => (
                (() => {
                  const entry = results[s.id] || { score: '', absent: false };
                  return (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 rounded-sm bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {s.full_name.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-700">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-center">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={entry.absent}
                        value={entry.score}
                        onChange={e => handleScoreChange(s.id, e.target.value)}
                        className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded text-center font-bold text-slate-800 outline-none focus:border-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="0.0"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-center">
                      <label className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <input
                          type="checkbox"
                          checked={entry.absent}
                          onChange={e => handleAbsentChange(s.id, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span className={entry.absent ? 'text-rose-600' : ''}>ABSENT</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {entry.absent ? (
                      <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight">Absent</span>
                    ) : entry.score !== '' ? (
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight">Verified</span>
                    ) : (
                      <span className="text-slate-300 text-[9px] font-bold uppercase tracking-tight italic">Awaiting</span>
                    )}
                  </td>
                </tr>
                  );
                })()
              ))}
            </tbody>
          </table>
          {students.length === 0 && (
            <div className="p-16 text-center">
              <ClipboardList className="mx-auto mb-4 text-slate-200" size={48} />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] italic">Select a valid exam batch to view candidates.</p>
            </div>
          )}
        </div>
      </div>

      {showExamModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-slate-200"
          >
            <form onSubmit={handleCreateExam}>
              <div className="bg-brand-sidebar p-5 text-white flex justify-between items-center">
                <h2 className="text-sm font-bold flex items-center space-x-2 tracking-tight uppercase">
                  <ClipboardList size={18} className="text-brand-primary" />
                  <span>Configure Exam Batch</span>
                </h2>
                <button type="button" onClick={() => setShowExamModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="label-app">Batch Title</label>
                  <input 
                    type="text" required 
                    value={examData.name}
                    onChange={e => setExamData({...examData, name: e.target.value})}
                    className="input-app"
                    placeholder="e.g. Mid-Term Examination 2024"
                  />
                </div>
                <div>
                  <label className="label-app">Examination Category</label>
                  <select 
                    value={examData.type}
                    onChange={e => setExamData({...examData, type: e.target.value})}
                    className="input-app"
                  >
                    <option>Weekly Test</option>
                    <option>Monthly Test</option>
                    <option>Mid-Term Exam</option>
                    <option>Terminal Exam</option>
                    <option>Annual Exam</option>
                  </select>
                </div>
              </div>
              <div className="p-4 bg-slate-50 flex justify-end space-x-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowExamModal(false)} className="px-4 py-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest transition-colors hover:text-slate-700">Cancel</button>
                <button type="submit" className="btn-dark px-6">Create Batch</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
