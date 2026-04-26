import React, { useEffect, useMemo, useState } from 'react';
import { Topic, Subject } from '../types.ts';
import { Plus, CheckCircle2, Clock, AlertCircle, Bookmark, Target, Layers, X, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from './Toast';

interface CurriculumProps {
  token: string;
  userRole: string;
  userId: number;
}

export default function Curriculum({ token, userRole, userId }: CurriculumProps) {
  const isAdmin = userRole === 'headmaster' || userRole === 'academic';
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedForm, setSelectedForm] = useState<string>('');
  const [overview, setOverview] = useState<any[]>([]);
  const [topicFilter, setTopicFilter] = useState<'all' | 'completed' | 'on_progress' | 'pending' | 'tested' | 'not_tested'>('all');
  const [showModal, setShowModal] = useState(false);
  const [topicData, setTopicData] = useState({
    name: '', competence: '', specific_competence: '', deadline: ''
  });

  const [showTestModal, setShowTestModal] = useState(false);
  const [testTopic, setTestTopic] = useState<any>(null);
  const [testStudents, setTestStudents] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<Record<number, { score: string; absent: boolean }>>({});
  const [testSaving, setTestSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [topicTestCounts, setTopicTestCounts] = useState<Record<number, { total: number; entered: number; passed: number; failed: number }>>({});
  const [adminTeacherFilter, setAdminTeacherFilter] = useState<string>('all');
  const [adminSubjectFilter, setAdminSubjectFilter] = useState<string>('all');
  const [adminClassFilter, setAdminClassFilter] = useState<string>('All');
  const [adminStreamFilter, setAdminStreamFilter] = useState<string>('all');
  const [adminDashboard, setAdminDashboard] = useState<any>({
    summary: { total_topics: 0, completed_topics: 0, on_progress_topics: 0, tested_topics: 0, coverage_percent: 0, overdue_topics: 0 },
    teacher_summary: [],
    rows: [],
    missing_topic_subjects: [],
    teachers_missing_topic_setup: [],
  });
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSubject) fetchTopics();
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedForm) return;
    fetchOverview();
  }, [selectedForm]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAdminDashboard();
  }, [isAdmin, adminTeacherFilter, adminSubjectFilter, adminClassFilter, adminStreamFilter]);

  const fetchInitialData = async () => {
    const sRes = await fetch('/api/subjects', { headers: { 'Authorization': `Bearer ${token}` } });
    const aRes = await fetch('/api/assignments', { headers: { 'Authorization': `Bearer ${token}` } });
    const uRes = isAdmin ? await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }) : null;
    const stRes = isAdmin
      ? await fetch('/api/streams', { headers: { 'Authorization': `Bearer ${token}` } })
      : null;
    
    const sData = await sRes.json();
    const aData = await aRes.json();

    // ensure arrays
    const safeSubjects = Array.isArray(sData) ? sData : [];
    const safeAssignments = Array.isArray(aData) ? aData : [];

    setSubjects(safeSubjects);
    setAssignments(safeAssignments);
    if (isAdmin) {
      const uData = await uRes?.json().catch(() => []);
      const stData = await stRes?.json().catch(() => []);
      setTeachers(Array.isArray(uData) ? uData.filter((u: any) => u.role === 'teacher') : []);
      setStreams(Array.isArray(stData) ? stData : []);
    }

    const teacherAssignedSubjectIds = new Set(
      safeAssignments
        .filter((a: any) => Number(a.teacher_id) === Number(userId))
        .map((a: any) => Number(a.subject_id))
    );
    const subjectPool = userRole === 'teacher'
      ? safeSubjects.filter((s: any) => teacherAssignedSubjectIds.has(Number(s.id)))
      : safeSubjects;
    const forms = Array.from(new Set(subjectPool.map((s: any) => s.form))).filter(Boolean);
    const initialForm = forms[0] || 'Form 1';
    setSelectedForm(initialForm);
    const initialSubject = subjectPool.find((s: any) => s.form === initialForm) || subjectPool[0];
    if (initialSubject) setSelectedSubject(initialSubject.id);
  };

  const fetchOverview = async () => {
    const res = await fetch(`/api/curriculum/overview?form=${encodeURIComponent(selectedForm)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setOverview(Array.isArray(data) ? data : []);
  };

  const fetchAdminDashboard = async () => {
    const params = new URLSearchParams();
    if (adminTeacherFilter !== 'all') params.set('teacher_id', adminTeacherFilter);
    if (adminSubjectFilter !== 'all') params.set('subject_id', adminSubjectFilter);
    if (adminClassFilter !== 'All') params.set('form', adminClassFilter);
    if (adminStreamFilter !== 'all') params.set('stream_id', adminStreamFilter);
    const q = params.toString();

    const res = await fetch(`/api/curriculum/admin-dashboard${q ? `?${q}` : ''}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      showError(data?.error || 'Failed to load curriculum dashboard');
      return;
    }
    setAdminDashboard(data || {
      summary: { total_topics: 0, completed_topics: 0, on_progress_topics: 0, tested_topics: 0, coverage_percent: 0, overdue_topics: 0 },
      teacher_summary: [],
      rows: [],
      missing_topic_subjects: [],
      teachers_missing_topic_setup: [],
    });
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch(`/api/topics?subject_id=${selectedSubject}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        console.error('Failed to fetch topics', res.status);
        setTopics([]);
        return;
      }
      const topicsData = await res.json();
      const safeTopics = Array.isArray(topicsData) ? topicsData : [];
      setTopics(safeTopics);

      const ids = safeTopics.map((t: any) => t.id).filter(Boolean);
      if (ids.length === 0) return;

      try {
        const countsRes = await fetch(`/api/topics/test-counts?ids=${ids.join(',')}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (countsRes.ok) {
          const counts = await countsRes.json();
          const map: Record<number, { total: number; entered: number; passed: number; failed: number }> = {};
          for (const c of counts) {
            map[c.topic_id] = c;
          }
          setTopicTestCounts(map);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      console.error(err);
      setTopics([]);
    }
  };

  const canManageTopics = userRole === 'teacher' && assignments.some(a => a.subject_id === selectedSubject && a.teacher_id === userId);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    try {
      const payload = { ...topicData, subject_id: selectedSubject };
      console.log('Sending payload:', payload);
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error('Server error:', errData);
        showError(errData?.error || 'Failed to add topic');
        return;
      }
      setShowModal(false);
      setTopicData({ name: '', competence: '', specific_competence: '', deadline: '' });
      fetchTopics();
    } catch (err) {
      console.error('Network error:', err);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/topics/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchTopics();
    fetchOverview();
  };

  const openTestModal = async (topic: any) => {
    setTestTopic(topic);
    setShowTestModal(true);
    setTestLoading(true);
    setTestResults({});

    try {
      const [stRes, trRes] = await Promise.all([
        fetch(`/api/topics/${topic.id}/students`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/topics/${topic.id}/test-results`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const stData = await stRes.json().catch(() => []);
      const trData = await trRes.json().catch(() => null);

      setTestStudents(stData || []);

      const existing: Record<number, { score: string; absent: boolean }> = {};
      if (trData?.results) {
        for (const r of trData.results) {
          existing[r.student_id] = {
            score: r.score === null || r.score === undefined ? '' : String(r.score),
            absent: (r.absent ?? 0) === 1,
          };
        }
      }
      setTestResults(existing);
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestScoreChange = (studentId: number, score: string) => {
    const prev = testResults[studentId] || { score: '', absent: false };
    setTestResults({ ...testResults, [studentId]: { score, absent: prev.absent } });
  };

  const handleTestAbsentChange = (studentId: number, absent: boolean) => {
    const prev = testResults[studentId] || { score: '', absent: false };
    setTestResults({
      ...testResults,
      [studentId]: { score: absent ? '' : prev.score, absent },
    });
  };

  const saveTestResults = async () => {
    if (!testTopic) return;

    for (const [studentId, entry] of Object.entries(testResults)) {
      if (entry.absent || entry.score === '') continue;
      const n = Number(entry.score);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        showError(`Invalid score for student #${studentId}. Score must be between 0 and 100.`);
        return;
      }
    }

    setTestSaving(true);
    try {
      type TestEntry = { score: string; absent: boolean };
      const entries: [string, TestEntry][] = Object.entries(testResults);
      const payload = entries.map(([sid, data]) => ({
        student_id: parseInt(sid),
        score: data.absent ? null : (data.score === '' ? null : parseFloat(data.score)),
        absent: data.absent,
      }));

      await fetch(`/api/topics/${testTopic.id}/test-results`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: payload }),
      });

      showSuccess('Test results saved successfully.');
      setShowTestModal(false);
      fetchTopics();
      fetchOverview();
    } finally {
      setTestSaving(false);
    }
  };

  const subjectsForForm = subjects.filter(s => {
    if (s.form !== selectedForm) return false;
    if (userRole !== 'teacher') return true;
    return assignments.some(a => a.subject_id === s.id && a.teacher_id === userId);
  });
  const teacherAssignedSubjects = useMemo(
    () => subjects.filter(s => assignments.some(a => a.subject_id === s.id && a.teacher_id === userId)),
    [subjects, assignments, userId]
  );
  const teacherHasAssignments = userRole !== 'teacher' || teacherAssignedSubjects.length > 0;
  const teacherOverviewRows = userRole === 'teacher'
    ? overview.filter((r: any) => teacherAssignedSubjects.some(s => s.id === r.id))
    : overview;
  const teacherSummary = useMemo(() => {
    const agg = teacherOverviewRows.reduce(
      (acc: any, r: any) => {
        acc.total += Number(r.total_topics || 0);
        acc.completed += Number(r.completed_topics || 0);
        acc.pending += Number(r.pending_topics || 0);
        acc.tested += Number(r.tested_topics || 0);
        acc.overdue += Number(r.overdue_topics || 0);
        return acc;
      },
      { total: 0, completed: 0, pending: 0, tested: 0, overdue: 0, coverage: 0 }
    );
    agg.coverage = agg.total > 0 ? Math.round((agg.completed / agg.total) * 100) : 0;
    return agg;
  }, [teacherOverviewRows]);

  const filteredTopics = topics.filter((t: any) => {
    if (topicFilter === 'all') return true;
    if (topicFilter === 'tested') return Boolean(t.tested);
    if (topicFilter === 'not_tested') return !Boolean(t.tested);
    return t.status === topicFilter;
  });

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">ACADEMIC <span className="text-brand-primary">SYLLABUS</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Monitor teaching progress & topic coverage</p>
        </div>
        <div className="flex space-x-2">
          <select
            className="input-app py-1 tracking-tight !w-auto"
            value={selectedForm}
            onChange={(e) => {
              const nextForm = e.target.value;
              setSelectedForm(nextForm);
              const nextSubject = subjects.find(
                s =>
                  s.form === nextForm &&
                  (userRole !== 'teacher' || assignments.some(a => a.subject_id === s.id && a.teacher_id === userId))
              );
              setSelectedSubject(nextSubject ? nextSubject.id : null);
              setTopics([]);
            }}
          >
            {Array.from(new Set((userRole === 'teacher' ? teacherAssignedSubjects : subjects).map(s => s.form))).map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select 
            className="input-app py-1 tracking-tight !w-auto"
            onChange={(e) => setSelectedSubject(parseInt(e.target.value))}
            value={selectedSubject || ''}
          >
            {subjectsForForm.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {canManageTopics && (
            <button 
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus size={14} />
              <span>Add Topic</span>
            </button>
          )}
        </div>
      </header>

      {userRole === 'teacher' && !teacherHasAssignments && (
        <div className="card-app p-8 text-center">
          <p className="text-sm font-black text-slate-700">No subjects assigned to you.</p>
        </div>
      )}

      {userRole === 'teacher' && teacherHasAssignments && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">My Total Topics</p><p className="text-xl font-black text-slate-800">{teacherSummary.total}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">My Completed Topics</p><p className="text-xl font-black text-emerald-600">{teacherSummary.completed}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">My Pending Topics</p><p className="text-xl font-black text-slate-700">{teacherSummary.pending}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">My Tested Topics</p><p className="text-xl font-black text-amber-600">{teacherSummary.tested}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">My Coverage %</p><p className="text-xl font-black text-brand-primary">{teacherSummary.coverage}%</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">My Overdue Topics</p><p className="text-xl font-black text-rose-600">{teacherSummary.overdue}</p></div>
        </div>
      )}

      {isAdmin && (
        <div className="card-app p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <select className="input-app" value={adminTeacherFilter} onChange={e => setAdminTeacherFilter(e.target.value)}>
              <option value="all">All Teachers</option>
              {teachers.map((t: any) => <option key={t.id} value={String(t.id)}>{t.full_name}</option>)}
            </select>
            <select className="input-app" value={adminSubjectFilter} onChange={e => setAdminSubjectFilter(e.target.value)}>
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={String(s.id)}>{s.name} ({s.form})</option>)}
            </select>
            <select className="input-app" value={adminClassFilter} onChange={e => setAdminClassFilter(e.target.value)}>
              <option value="All">All Classes</option>
              {Array.from(new Set(subjects.map(s => s.form))).map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select className="input-app" value={adminStreamFilter} onChange={e => setAdminStreamFilter(e.target.value)}>
              <option value="all">All Streams</option>
              {streams
                .filter((st: any) => adminClassFilter === 'All' || st.form === adminClassFilter)
                .map((st: any) => <option key={st.id} value={String(st.id)}>{st.form} {st.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p><p className="text-xl font-black text-slate-800">{adminDashboard.summary.total_topics}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed</p><p className="text-xl font-black text-emerald-600">{adminDashboard.summary.completed_topics}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">In Progress</p><p className="text-xl font-black text-brand-primary">{adminDashboard.summary.on_progress_topics}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tested</p><p className="text-xl font-black text-amber-600">{adminDashboard.summary.tested_topics}</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coverage</p><p className="text-xl font-black text-slate-800">{adminDashboard.summary.coverage_percent}%</p></div>
            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Overdue</p><p className="text-xl font-black text-rose-600">{adminDashboard.summary.overdue_topics}</p></div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">Teacher-wise Progress</div>
              <div className="max-h-60 overflow-auto divide-y divide-slate-100">
                {(adminDashboard.teacher_summary || []).map((t: any) => (
                  <div key={t.teacher_id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-bold text-slate-800">{t.teacher_name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.completed_topics}/{t.total_topics} completed</p>
                    </div>
                    <span className="font-black text-brand-primary">{t.coverage_percent}%</span>
                  </div>
                ))}
                {(adminDashboard.teacher_summary || []).length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No teacher summary</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">Subject Coverage</div>
              <div className="max-h-60 overflow-auto divide-y divide-slate-100">
                {(adminDashboard.rows || []).map((r: any) => (
                  <div key={r.subject_id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-800">{r.subject_code} {r.subject_name} ({r.form})</p>
                      <span className="font-black text-brand-primary">{r.coverage_percent}%</span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                      {r.teacher_name} • Completed {r.completed_topics} • Pending {r.pending_topics} • Tested {r.tested_topics} • Overdue {r.overdue_topics}
                    </p>
                  </div>
                ))}
                {(adminDashboard.rows || []).length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No subject data</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-lg border border-amber-200 overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 text-[10px] font-black uppercase tracking-widest text-amber-700">
                Subjects With No Topics Configured
              </div>
              <div className="max-h-60 overflow-auto divide-y divide-amber-100">
                {(adminDashboard.missing_topic_subjects || []).map((r: any) => (
                  <div key={`missing-subject-${r.subject_id}`} className="px-4 py-3">
                    <p className="font-bold text-slate-800">{r.subject_code} {r.subject_name} ({r.form})</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mt-1">{r.teacher_name}</p>
                  </div>
                ))}
                {(adminDashboard.missing_topic_subjects || []).length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No missing subjects</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 text-[10px] font-black uppercase tracking-widest text-amber-700">
                Teachers Missing Topic Setup
              </div>
              <div className="max-h-60 overflow-auto divide-y divide-amber-100">
                {(adminDashboard.teachers_missing_topic_setup || []).map((t: any) => (
                  <div key={`missing-teacher-${t.teacher_id}`} className="px-4 py-3 flex items-center justify-between">
                    <p className="font-bold text-slate-800">{t.teacher_name}</p>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                      {t.missing_subjects} subject{t.missing_subjects === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
                {(adminDashboard.teachers_missing_topic_setup || []).length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No missing teachers</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {teacherHasAssignments && (
      <div className="card-app overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Class Overview: {selectedForm}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest bg-slate-50/30 font-mono italic">
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Topics</th>
                <th className="px-6 py-4">Completed</th>
                <th className="px-6 py-4">On Progress</th>
                <th className="px-6 py-4">Pending</th>
                <th className="px-6 py-4">Tested</th>
              </tr>
            </thead>
            <tbody className="text-[13px] italic">
              {teacherOverviewRows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer ${selectedSubject === r.id ? 'bg-slate-50/60' : ''}`}
                  onClick={() => setSelectedSubject(r.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-primary/10 border border-brand-primary/15 rounded flex items-center justify-center font-black text-brand-primary font-mono text-[10px]">
                        {r.code}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 uppercase tracking-tight">{r.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{r.form} {r.has_practical ? '• LAB REQ' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">{r.total_topics}</td>
                  <td className="px-6 py-4 font-bold text-emerald-700">{r.completed_topics}</td>
                  <td className="px-6 py-4 font-bold text-brand-primary">{r.on_progress_topics}</td>
                  <td className="px-6 py-4 font-bold text-slate-600">{r.pending_topics}</td>
                  <td className="px-6 py-4 font-bold text-amber-700">{r.tested_topics}</td>
                </tr>
              ))}
              {teacherOverviewRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                    No subjects found for this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {teacherHasAssignments && (
      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'All'],
          ['completed', 'Completed'],
          ['on_progress', 'On Progress'],
          ['pending', 'Pending'],
          ['tested', 'Tested'],
          ['not_tested', 'Not Tested'],
        ] as Array<[typeof topicFilter, string]>).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTopicFilter(k)}
            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border transition-colors ${
              topicFilter === k
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      )}

      {teacherHasAssignments && (
      <div className="grid grid-cols-1 gap-4">
        {filteredTopics.map((t: any, i: number) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            key={t.id} 
            className="card-app p-5 relative border-l-4 border-l-brand-primary"
          >
            <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-[10px] font-black text-brand-primary font-mono tracking-widest px-2 py-0.5 bg-brand-primary/10 rounded">
                    TOPIC_{i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight">{t.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                    t.status === 'completed' ? 'bg-emerald-500 text-white shadow-sm' :
                    t.status === 'on_progress' ? 'bg-brand-primary text-white shadow-sm' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {t.status?.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                    t.tested ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {t.tested ? 'tested' : 'not tested'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Core Competence</p>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-3">{t.competence || 'Not specified'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Specific Objectives</p>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-3">{t.specific_competence || 'Not specified'}</p>
                  </div>
                </div>

                {(function () {
                  const tc = topicTestCounts[t.id];
                  const passed = tc?.passed ?? 0;
                  const failed = tc?.failed ?? 0;
                  const entered = tc?.entered ?? 0;
                  const total = tc?.total ?? 0;
                  const failRate = total > 0 ? Math.round((failed / total) * 100) : 0;
                  return entered > 0 ? (
                    <div className={`mt-4 flex flex-wrap gap-3 px-4 py-3 rounded-lg border ${
                      failRate > 40
                        ? 'bg-rose-50 border-rose-200'
                        : failRate > 20
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Class</p>
                        <p className="text-lg font-black text-slate-700">{total}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-primary">Tested</p>
                        <p className="text-lg font-black text-brand-primary">{entered}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Passed (&ge;50%)</p>
                        <p className="text-lg font-black text-emerald-600">{passed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-600">Failed (&lt;50%)</p>
                        <p className="text-lg font-black text-rose-600">{failed}</p>
                      </div>
                      {failed > 0 && failRate > 20 && (
                        <div className="flex items-center gap-1 ml-auto">
                          <AlertCircle size={14} className="text-rose-500" />
                          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{failRate}% fail rate — remedial needed</span>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              {canManageTopics && (
                <div className="lg:w-40 flex lg:flex-col gap-2 shrink-0 pt-1">
                  <button
                    onClick={() => updateStatus(t.id, 'pending')}
                    className={`flex-1 py-2 px-3 rounded-md font-bold text-[9px] uppercase tracking-widest transition-all border ${
                      t.status === 'pending' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Set Pending
                  </button>
                  <button 
                    onClick={() => updateStatus(t.id, 'on_progress')}
                    className={`flex-1 py-2 px-3 rounded-md font-bold text-[9px] uppercase tracking-widest transition-all border ${
                      t.status === 'on_progress' ? 'bg-brand-primary text-white border-brand-primary shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Mark Taught
                  </button>
                  <button 
                    onClick={() => updateStatus(t.id, 'completed')}
                    className={`flex-1 py-2 px-3 rounded-md font-bold text-[9px] uppercase tracking-widest transition-all border ${
                      t.status === 'completed' ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Mark Completed
                  </button>
                  <button
                    onClick={() => openTestModal(t)}
                    disabled={t.status !== 'completed'}
                    className={`flex-1 py-2 px-3 rounded-md font-bold text-[9px] uppercase tracking-widest transition-all border disabled:opacity-30 ${
                      (topicTestCounts[t.id]?.entered ?? 0) > 0
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                        : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50'
                    }`}
                    title={t.status !== 'completed' ? 'Topic must be completed first' : 'Enter or view test scores'}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <ClipboardList size={12} />
                      {(topicTestCounts[t.id]?.entered ?? 0) > 0 ? 'View Scores' : 'Enter Scores'}
                    </span>
                  </button>
                </div>
              )}
            </div>
            
            {t.deadline && (
              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center space-x-2 text-[9px] text-rose-500 font-bold uppercase tracking-widest">
                <Clock size={12} />
                <span>Completion Deadline: {new Date(t.deadline).toLocaleDateString()}</span>
              </div>
            )}
          </motion.div>
        ))}

        {filteredTopics.length === 0 && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg p-12 text-center">
            <Bookmark className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic leading-relaxed">No topics match this filter for the selected subject.</p>
          </div>
        )}
      </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-xl overflow-hidden shadow-2xl border border-slate-200"
          >
            <form onSubmit={handleAddTopic}>
              <div className="bg-brand-sidebar p-5 text-white flex justify-between items-center">
                <h2 className="text-sm font-bold flex items-center space-x-2 tracking-tight uppercase">
                  <Plus size={18} className="text-brand-primary" />
                  <span>Map New Topic</span>
                </h2>
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="label-app">Topic Title</label>
                  <input 
                    type="text" required 
                    value={topicData.name}
                    onChange={e => setTopicData({...topicData, name: e.target.value})}
                    className="input-app"
                    placeholder="e.g. Inorganic Chemistry fundamentals"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="label-app">Core Competence</label>
                    <textarea 
                      rows={2}
                      value={topicData.competence}
                      onChange={e => setTopicData({...topicData, competence: e.target.value})}
                      className="input-app resize-none"
                      placeholder="Student should be able to..."
                    />
                  </div>
                  <div>
                    <label className="label-app">Specific Objectives</label>
                    <textarea 
                      rows={2}
                      value={topicData.specific_competence}
                      onChange={e => setTopicData({...topicData, specific_competence: e.target.value})}
                      className="input-app resize-none"
                      placeholder="Detailed objectives..."
                    />
                  </div>
                </div>
                <div>
                  <label className="label-app">Target Completion Date</label>
                  <input 
                    type="date" 
                    value={topicData.deadline}
                    onChange={e => setTopicData({...topicData, deadline: e.target.value})}
                    className="input-app font-mono"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 flex justify-end space-x-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest transition-colors hover:text-slate-700">Cancel</button>
                <button type="submit" className="btn-dark px-6">Save Topic</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showTestModal && testTopic && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl border border-slate-200"
          >
            <div className="bg-brand-sidebar p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold flex items-center space-x-2 tracking-tight uppercase">
                  <ClipboardList size={18} className="text-brand-primary" />
                  <span>Test Scores</span>
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-widest">{testTopic.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-x-auto">
              {testLoading ? (
                <div className="p-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">Loading students...</div>
              ) : testStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">
                  No students found for this subject/form.
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest bg-slate-50/30">
                      <th className="px-6 py-3">Student</th>
                      <th className="px-6 py-3 text-center">Score (%)</th>
                      <th className="px-6 py-3 text-center">Absent</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px]">
                    {testStudents.map((s: any) => {
                      const entry = testResults[s.id] || { score: '', absent: false };
                      return (
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-semibold text-slate-700">{s.full_name}</td>
                          <td className="px-6 py-3 text-center">
                            {entry.absent ? (
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ABSENT</span>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  placeholder="0-100"
                                  value={entry.score}
                                  onChange={e => handleTestScoreChange(s.id, e.target.value)}
                                  disabled={testSaving}
                                  className="input-app w-24 text-center !py-2 disabled:opacity-50"
                                />
                                <span className="text-[11px] font-black text-slate-400">%</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={entry.absent}
                              onChange={e => handleTestAbsentChange(s.id, e.target.checked)}
                              disabled={testSaving}
                              className="w-4 h-4 rounded border-slate-200"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 bg-slate-50 flex justify-end space-x-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest transition-colors hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTestResults}
                disabled={testSaving || testStudents.length === 0}
                className="btn-dark px-6 flex items-center gap-2 disabled:opacity-50"
              >
                <ClipboardList size={14} />
                <span>{testSaving ? 'Saving...' : 'Save Test Results'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}