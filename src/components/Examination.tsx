import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, Download, FileText, Users, TrendingUp, Activity, CheckCircle2, AlertTriangle, ChevronDown, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

interface Exam {
  id: number;
  name: string;
  type: string;
  form: string;
  academic_year: string;
  term: string;
  start_date: string;
  end_date: string;
  weight: number;
  is_composed: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  form: string;
}

interface Student {
  id: number;
  full_name: string;
  gender: string;
  form: string;
  stream_name: string;
}

interface Score {
  student_id: number;
  subject_id: number;
  score: number | null;
  absent: number;
  full_name?: string;
  gender?: string;
}

interface StudentResult {
  id: number;
  full_name: string;
  gender: string;
  form: string;
  stream_name: string;
  average: number;
  grade: string;
  division: number;
  points: number;
  position_class: number;
  remark: string;
  scores: Record<string, any>;
}

interface ExaminationProps {
  token: string;
  userRole: string;
  userId: number;
}

export default function Examination({ token, userRole }: ExaminationProps) {
  const [tab, setTab] = useState<'setup' | 'scores' | 'results' | 'compose' | 'reports'>('setup');
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examSubjects, setExamSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [results, setResults] = useState<{ subjects: Subject[]; students: StudentResult[] } | null>(null);
  const [divisionSummary, setDivisionSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showNewExamModal, setShowNewExamModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showScoresModal, setShowScoresModal] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<number, Record<number, { score: string; absent: boolean }>>({});

  const [newExam, setNewExam] = useState({ name: '', type: 'Test', form: 'Form 1', academic_year: '2026', term: 'Term 1', start_date: '', end_date: '', weight: 1 });
  const [composeData, setComposeData] = useState({ name: '', exam_weights: [] as { exam_id: number; weight: number }[] });

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    fetch('/api/subjects', { headers }).then(r => r.json()).then(setSubjects);
  }, [headers]);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchExamDetails();
    }
  }, [selectedExam]);

  const fetchExams = async () => {
    const res = await fetch('/api/exams', { headers });
    const data = await res.json();
    setExams(data || []);
  };

  const fetchExamDetails = async () => {
    if (!selectedExam) return;
    setLoading(true);
    try {
      const [subjRes, studRes, scoresRes] = await Promise.all([
        fetch(`/api/exams/${selectedExam.id}/subjects`, { headers }),
        fetch(`/api/exams/${selectedExam.id}/students`, { headers }),
        fetch(`/api/exams/${selectedExam.id}/scores`, { headers }),
      ]);
      setExamSubjects(await subjRes.json());
      setStudents(await studRes.json());
      setScores(await scoresRes.json());
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(newExam),
    });
    if (res.ok) {
      const data = await res.json();
      setShowNewExamModal(false);
      setNewExam({ name: '', type: 'Test', form: 'Form 1', academic_year: '2026', term: 'Term 1', start_date: '', end_date: '', weight: 1 });
      await fetchExams();
      setSelectedExam({ ...newExam, id: data.id } as Exam);
      setShowScoresModal(true);
    }
  };

  const handleAddSubjects = async () => {
    if (!selectedExam) return;
    const subjectIds = subjects.filter(s => s.form === selectedExam.form).map(s => s.id);
    await fetch(`/api/exams/${selectedExam.id}/subjects`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_ids: subjectIds }),
    });
    fetchExamDetails();
  };

  const handleSaveScores = async () => {
    if (!selectedExam) return;
    const flatScores: any[] = [];
    Object.entries(editingScores).forEach(([studentId, subjScores]) => {
      Object.entries(subjScores).forEach(([subjectId, data]) => {
        flatScores.push({ student_id: Number(studentId), subject_id: Number(subjectId), score: data.score === '' ? null : data.score, absent: data.absent });
      });
    });
    await fetch(`/api/exams/${selectedExam.id}/scores`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: flatScores }),
    });
    alert('Scores saved!');
    fetchExamDetails();
  };

  const handleProcessResults = async () => {
    if (!selectedExam) return;
    if (!confirm('Process all student results? This will calculate grades, divisions, and positions.')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/exams/${selectedExam.id}/process`, { method: 'POST', headers });
      const data = await res.json();
      alert(`Processed ${data.students} student results`);
      fetchExamDetails();
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    if (!selectedExam) return;
    const res = await fetch(`/api/exams/${selectedExam.id}/results`, { headers });
    setResults(await res.json());
    setTab('results');
  };

  const loadDivisionSummary = async () => {
    if (!selectedExam) return;
    const res = await fetch(`/api/exams/${selectedExam.id}/division-summary`, { headers });
    setDivisionSummary(await res.json());
    setTab('reports');
  };

  const loadTrends = async (prevExamId: number) => {
    if (!selectedExam) return;
    const res = await fetch(`/api/exams/${selectedExam.id}/trends?compare_with=${prevExamId}`, { headers });
    setTrends(await res.json());
    setTab('reports');
  };

  const handleCompose = async () => {
    if (composeData.exam_weights.length === 0) return;
    const res = await fetch('/api/exams/compose', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...composeData, form: selectedExam?.form || 'Form 1', academic_year: selectedExam?.academic_year || '2026' }),
    });
    if (res.ok) {
      alert('Composition created!');
      setShowComposeModal(false);
      setComposeData({ name: '', exam_weights: [] });
    }
  };

  const downloadBroadsheet = () => {
    if (!results) return;
    const wb = XLSX.utils.book_new();
    const headers1 = ['CNO', 'Name', 'Sex', 'AGGT', 'DIV', 'PTS', 'POS', 'REAMRK', ...results.subjects.map(s => s.code)];
    const rows = results.students.map(s => [
      s.id, s.full_name, s.gender === 'Female' ? 'F' : 'M', s.average || '-', s.grade || '-', s.points || '-', s.position_class || '-', s.remark || '-',
      ...results.subjects.map(sub => s.scores[sub.code] || '-')
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers1, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selectedExam?.name || 'results'}_broadsheet.xlsx`; a.click();
  };

  const downloadDivisionSummary = () => {
    if (!divisionSummary) return;
    const wb = XLSX.utils.book_new();
    const data = [
      ['', 'I', 'II', 'III', 'IV', '0', 'Total', 'Pass%'],
      ['Female', divisionSummary.summary.F[1] || 0, divisionSummary.summary.F[2] || 0, divisionSummary.summary.F[3] || 0, divisionSummary.summary.F[4] || 0, divisionSummary.summary.F[0] || 0, divisionSummary.totals.fTotal, divisionSummary.totals.fPassRate + '%'],
      ['Male', divisionSummary.summary.M[1] || 0, divisionSummary.summary.M[2] || 0, divisionSummary.summary.M[3] || 0, divisionSummary.summary.M[4] || 0, divisionSummary.summary.M[0] || 0, divisionSummary.totals.mTotal, divisionSummary.totals.mPassRate + '%'],
      ['Total', divisionSummary.summary.T[1] || 0, divisionSummary.summary.T[2] || 0, divisionSummary.summary.T[3] || 0, divisionSummary.summary.T[4] || 0, divisionSummary.summary.T[0] || 0, divisionSummary.totals.total, divisionSummary.totals.passRate + '%'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Division Summary');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selectedExam?.name || 'division'}_summary.xlsx`; a.click();
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A') return 'text-emerald-600 bg-emerald-50';
    if (grade === 'B') return 'text-sky-600 bg-sky-50';
    if (grade === 'C') return 'text-amber-600 bg-amber-50';
    if (grade === 'D') return 'text-orange-600 bg-orange-50';
    return 'text-rose-600 bg-rose-50';
  };

  const getTrendColor = (trend: string) => {
    if (trend === '↑') return 'text-emerald-600';
    if (trend === '↓') return 'text-rose-600';
    return 'text-slate-400';
  };

  const isAcademic = userRole === 'headmaster' || userRole === 'academic';

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">EXAMINATION <span className="text-brand-primary">PROCESSING</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Manage exams, scores, results & reports</p>
        </div>
        <div className="flex space-x-2">
          {isAcademic && (
            <button onClick={() => setShowNewExamModal(true)} className="btn-primary flex items-center space-x-2">
              <Plus size={14} /> <span>Create Exam</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['setup', 'scores', 'results', 'compose', 'reports'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest border transition-colors ${tab === t ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {t === 'setup' ? 'Exam Setup' : t === 'scores' ? 'Scores' : t === 'results' ? 'Results' : t === 'compose' ? 'Compose' : 'Reports'}
          </button>
        ))}
      </div>

      {/* EXAM LIST */}
      {tab === 'setup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map(ex => (
            <motion.div key={ex.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`card-app p-4 cursor-pointer hover:border-brand-primary transition-all ${selectedExam?.id === ex.id ? 'border-brand-primary' : ''}`} onClick={() => setSelectedExam(ex)}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-800">{ex.name}</h3>
                  <p className="text-[10px] text-slate-400 uppercase">{ex.type} • {ex.form} • {ex.academic_year}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ex.is_composed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {ex.is_composed ? 'COMPOSED' : ex.term || 'N/A'}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={(e) => { e.stopPropagation(); setSelectedExam(ex); setShowScoresModal(true); }} className="flex-1 py-1.5 text-[9px] font-bold uppercase bg-slate-100 hover:bg-slate-200 rounded">Scores</button>
                {isAcademic && <button onClick={(e) => { e.stopPropagation(); handleProcessResults(); }} className="flex-1 py-1.5 text-[9px] font-bold uppercase bg-brand-primary text-white rounded">Process</button>}
              </div>
            </motion.div>
          ))}
          {exams.length === 0 && (
            <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-12 text-center">
              <FileText className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 font-bold text-xs uppercase">No exams created yet</p>
            </div>
          )}
        </div>
      )}

      {/* SCORES ENTRY */}
      {(tab === 'scores' || showScoresModal) && selectedExam && (
        <div className="card-app overflow-hidden">
          <div className="bg-brand-sidebar p-4 text-white flex justify-between items-center">
            <div>
              <h3 className="font-bold">{selectedExam.name}</h3>
              <p className="text-[10px] opacity-80">{selectedExam.form} • {selectedExam.type}</p>
            </div>
            <div className="flex gap-2">
              {isAcademic && examSubjects.length === 0 && <button onClick={handleAddSubjects} className="btn-dark text-xs">Add All Subjects</button>}
              {scores.length > 0 && <button onClick={handleSaveScores} className="btn-dark text-xs">Save Scores</button>}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-300">Loading...</div>
            ) : (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest">
                    <th className="px-4 py-3">CNO</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Sex</th>
                    {examSubjects.map(s => <th key={s.id} className="px-4 py-3 text-center">{s.subject_code}</th>)}
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {students.map(st => {
                    const studentScores = scores.filter(s => s.student_id === st.id);
                    return (
                      <tr key={st.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-slate-500">{st.id}</td>
                        <td className="px-4 py-2 font-semibold">{st.full_name}</td>
                        <td className="px-4 py-2">{st.gender === 'Female' ? 'F' : 'M'}</td>
                        {examSubjects.map(sub => {
                          const sc = studentScores.find(s => s.subject_id === sub.subject_id);
                          return (
                            <td key={sub.id} className="px-2 py-2 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={sc?.absent ? 'ABS' : (sc?.score ?? '')}
                                disabled={!isAcademic}
                                onChange={(e) => {
                                  const newScores = { ...editingScores };
                                  if (!newScores[st.id]) newScores[st.id] = {};
                                  newScores[st.id][sub.subject_id] = { score: e.target.value, absent: false };
                                  setEditingScores(newScores);
                                }}
                                className="w-16 text-center text-xs py-1 border border-slate-200 rounded"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {tab === 'results' && results && (
        <div className="card-app overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold">Class Broadsheet - {selectedExam?.name}</h3>
            <button onClick={downloadBroadsheet} className="btn-dark text-xs flex items-center gap-2"><Download size={14} />Download Excel</button>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest">
                  <th className="px-4 py-3">CNO</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Sex</th>
                  <th className="px-4 py-3 text-center">AGGT</th>
                  <th className="px-4 py-3 text-center">DIV</th>
                  <th className="px-4 py-3 text-center">PTS</th>
                  <th className="px-4 py-3 text-center">POS</th>
                  <th className="px-4 py-3">REMARK</th>
                  {results.subjects.map(s => <th key={s.id} className="px-4 py-3 text-center">{s.code}</th>)}
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {results.students.map((st, i) => (
                  <tr key={st.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-slate-500">{st.id}</td>
                    <td className="px-4 py-2 font-semibold">{st.full_name}</td>
                    <td className="px-4 py-2">{st.gender === 'Female' ? 'F' : 'M'}</td>
                    <td className="px-4 py-2 text-center font-black text-brand-primary">{st.average?.toFixed(1) || '-'}</td>
                    <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 rounded font-bold ${getGradeColor(st.grade || '')}`}>{st.grade || '-'}</span></td>
                    <td className="px-4 py-2 text-center font-bold">{st.points || '-'}</td>
                    <td className="px-4 py-2 text-center font-bold">{st.position_class || '-'}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{st.remark || '-'}</td>
                    {results.subjects.map(sub => (
                      <td key={sub.id} className="px-4 py-2 text-center">
                        <span className={getGradeColor(String(st.scores[sub.code] || '-'))}>{st.scores[sub.code] || '-'}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPOSE */}
      {tab === 'compose' && (
        <div className="card-app p-6">
          <h3 className="font-bold mb-4">Compose Multiple Exams</h3>
          <div className="space-y-4">
            <div>
              <label className="label-app">Composition Name</label>
              <input type="text" value={composeData.name} onChange={e => setComposeData({ ...composeData, name: e.target.value })} className="input-app" placeholder="e.g. Terminal 2026 Final Results" />
            </div>
            <div>
              <label className="label-app">Select Exams & Weights</label>
              {exams.filter(e => !e.is_composed && e.form === selectedExam?.form).map(ex => (
                <div key={ex.id} className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={composeData.exam_weights.some(ew => ew.exam_id === ex.id)} onChange={(e) => {
                      if (e.target.checked) setComposeData({ ...composeData, exam_weights: [...composeData.exam_weights, { exam_id: ex.id, weight: ex.weight || 1 }] });
                      else setComposeData({ ...composeData, exam_weights: composeData.exam_weights.filter(ew => ew.exam_id !== ex.id) });
                    }} />
                    <span className="font-semibold">{ex.name}</span>
                    <span className="text-xs text-slate-400">({ex.type})</span>
                  </label>
                  <input type="number" value={composeData.exam_weights.find(ew => ew.exam_id === ex.id)?.weight || 1} onChange={(e) => {
                    const w = Number(e.target.value);
                    setComposeData({ ...composeData, exam_weights: composeData.exam_weights.map(ew => ew.exam_id === ex.id ? { ...ew, weight: w } : ew) });
                  }} className="input-app w-20" placeholder="Weight %" />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCompose} disabled={!composeData.name || composeData.exam_weights.length === 0} className="btn-dark">Create Composition</button>
            </div>
          </div>
        </div>
      )}

      {/* REPORTS */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedExam && (
              <button onClick={loadDivisionSummary} className="card-app p-4 hover:border-brand-primary text-left">
                <div className="flex items-center gap-3">
                  <Users className="text-brand-primary" size={24} />
                  <div>
                    <h4 className="font-bold">Division Summary</h4>
                    <p className="text-xs text-slate-400">By gender & division</p>
                  </div>
                </div>
              </button>
            )}
            {exams.length > 1 && (
              <div className="card-app p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-brand-primary" size={24} />
                  <div>
                    <h4 className="font-bold">Compare with Previous</h4>
                    <select className="input-app mt-1 text-xs" onChange={(e) => { if (e.target.value) loadTrends(Number(e.target.value)); }}>
                      <option value="">Select exam to compare</option>
                      {exams.filter(e => e.id !== selectedExam?.id).map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {divisionSummary && (
            <div className="card-app overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between">
                <h3 className="font-bold">Division Performance Summary</h3>
                <button onClick={downloadDivisionSummary} className="btn-dark text-xs">Download</button>
              </div>
              <table className="w-full text-center">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold">
                    <th className="px-4 py-3 text-left">SEX</th>
                    <th className="px-4 py-3">I</th>
                    <th className="px-4 py-3">II</th>
                    <th className="px-4 py-3">III</th>
                    <th className="px-4 py-3">IV</th>
                    <th className="px-4 py-3">0</th>
                    <th className="px-4 py-3">TOTAL</th>
                    <th className="px-4 py-3">PASS%</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {['F', 'M', 'T'].map(gender => (
                    <tr key={gender} className="border-b border-slate-50">
                      <td className="px-4 py-3 text-left font-bold">{gender}</td>
                      <td className="px-4 py-3 font-black text-emerald-600">{divisionSummary.summary[gender]?.[1] || 0}</td>
                      <td className="px-4 py-3 font-black text-sky-600">{divisionSummary.summary[gender]?.[2] || 0}</td>
                      <td className="px-4 py-3 font-black text-amber-600">{divisionSummary.summary[gender]?.[3] || 0}</td>
                      <td className="px-4 py-3 font-black text-orange-600">{divisionSummary.summary[gender]?.[4] || 0}</td>
                      <td className="px-4 py-3 font-black text-rose-600">{divisionSummary.summary[gender]?.[0] || 0}</td>
                      <td className="px-4 py-3 font-bold">{divisionSummary.totals[gender === 'F' ? 'fTotal' : gender === 'M' ? 'mTotal' : 'total']}</td>
                      <td className="px-4 py-3 font-black text-brand-primary">{divisionSummary.totals[gender === 'F' ? 'fPassRate' : gender === 'M' ? 'mPassRate' : 'passRate']}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {trends && (
            <div className="card-app overflow-hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                <h3 className="font-bold">Trend Analysis: {trends.exam?.name} vs {trends.prevExam?.name}</h3>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-xs uppercase text-slate-400 mb-3">Student Performance Trends</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {trends.studentTrends?.slice(0, 20).map((t: any) => (
                    <div key={t.student_id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="font-semibold text-xs">{t.student_id}</span>
                      <span className={`text-lg ${getTrendColor(t.trend)}`}>{t.trend}</span>
                      <span className="text-xs">{t.avgChange > 0 ? '+' : ''}{t.avgChange?.toFixed(1)}</span>
                      <span className="text-xs text-slate-400">Pos: {t.position_class} ({t.posChange > 0 ? '+' : ''}{t.posChange})</span>
                    </div>
                  ))}
                </div>
                <h4 className="font-bold text-xs uppercase text-slate-400 mt-4 mb-3">Subject Trends</h4>
                <div className="space-y-2">
                  {trends.subjectTrends?.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="font-semibold text-xs">{t.code} - {t.name}</span>
                      <span className={`text-lg ${getTrendColor(t.trend)}`}>{t.trend}</span>
                      <span className="text-xs">{t.change > 0 ? '+' : ''}{t.change?.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW EXAM MODAL */}
      {showNewExamModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white w-full max-w-lg rounded-xl overflow-hidden shadow-2xl">
            <form onSubmit={handleCreateExam}>
              <div className="bg-brand-sidebar p-5 text-white flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2"><Plus size={18} />Create New Exam</h2>
                <button type="button" onClick={() => setShowNewExamModal(false)}><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-app">Exam Name</label>
                    <input type="text" value={newExam.name} onChange={e => setNewExam({ ...newExam, name: e.target.value })} className="input-app" placeholder="e.g. Midterm 2026" required />
                  </div>
                  <div>
                    <label className="label-app">Type</label>
                    <select value={newExam.type} onChange={e => setNewExam({ ...newExam, type: e.target.value })} className="input-app">
                      <option value="Test">Test</option>
                      <option value="Monthly Test">Monthly Test</option>
                      <option value="Midterm">Midterm</option>
                      <option value="Terminal">Terminal</option>
                      <option value="Mock">Mock</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-app">Class</label>
                    <select value={newExam.form} onChange={e => setNewExam({ ...newExam, form: e.target.value })} className="input-app">
                      {['Form 1', 'Form 2', 'Form 3', 'Form 4'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-app">Academic Year</label>
                    <input type="number" value={newExam.academic_year} onChange={e => setNewExam({ ...newExam, academic_year: e.target.value })} className="input-app" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-app">Term</label>
                    <select value={newExam.term} onChange={e => setNewExam({ ...newExam, term: e.target.value })} className="input-app">
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-app">Weight (%)</label>
                    <input type="number" value={newExam.weight} onChange={e => setNewExam({ ...newExam, weight: Number(e.target.value) })} className="input-app" />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 flex justify-end space-x-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowNewExamModal(false)} className="px-4 py-2 text-slate-500 font-bold text-[10px] uppercase">Cancel</button>
                <button type="submit" className="btn-dark">Create Exam</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}