import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../types.ts';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  TrendingUp,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  user: User;
  setView: (view: string) => void;
}

type CoverageRow = {
  form: string;
  total_topics: number;
  completed_topics: number;
  on_progress_topics: number;
  pending_topics: number;
  tested_topics: number;
};

type StatsData = {
  totalStudents: number;
  syllabusCoverage: number;
  examAverage: number;
  criticalTopics: number;
  totalSubjects: number;
  totalTeachers: number;
  recentExams: number;
};

export default function Dashboard({ user, setView }: DashboardProps) {
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalStudents: 0,
    syllabusCoverage: 0,
    examAverage: 0,
    criticalTopics: 0,
    totalSubjects: 0,
    totalTeachers: 0,
    recentExams: 0,
  });
  const [loading, setLoading] = useState(true);
  
  const token = useMemo(() => localStorage.getItem('token') || '', []);
  
  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all needed data in parallel
      const [studentsRes, subjectsRes, usersRes, curriculumRes, examsRes] = await Promise.all([
        fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/subjects', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/curriculum/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/exams', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [students, subjects, users, curriculum, exams] = await Promise.all([
        studentsRes.json(),
        subjectsRes.json(),
        usersRes.json(),
        curriculumRes.json(),
        examsRes.json(),
      ]);

      // Process curriculum for overview
      const rows = curriculum || [];
      const grouped: Record<string, CoverageRow> = {};
      for (const r of rows) {
        const f = r.form || 'Unknown';
        if (!grouped[f]) {
          grouped[f] = { form: f, total_topics: 0, completed_topics: 0, on_progress_topics: 0, pending_topics: 0, tested_topics: 0 };
        }
        grouped[f].total_topics += Number(r.total_topics || 0);
        grouped[f].completed_topics += Number(r.completed_topics || 0);
        grouped[f].on_progress_topics += Number(r.on_progress_topics || 0);
        grouped[f].pending_topics += Number(r.pending_topics || 0);
        grouped[f].tested_topics += Number(r.tested_topics || 0);
      }
      setCoverage(Object.values(grouped));

      // Calculate syllabus coverage
      const totalTopics = grouped['Form 1']?.total_topics || 0 + grouped['Form 2']?.total_topics || 0 + grouped['Form 3']?.total_topics || 0 + grouped['Form 4']?.total_topics || 0;
      const completedTopics = grouped['Form 1']?.completed_topics || 0 + grouped['Form 2']?.completed_topics || 0 + grouped['Form 3']?.completed_topics || 0 + grouped['Form 4']?.completed_topics || 0;
      const syllabusCoverage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

      // Count critical topics (pending > completed)
      const criticalTopics = Object.values(grouped).filter((c: CoverageRow) => c.pending_topics > c.completed_topics).length;

      // Count exams this term
      const currentYear = new Date().getFullYear().toString();
      const safeExams = Array.isArray(exams) ? exams : [];
      const recentExams = safeExams.filter((e: any) => e.academic_year === currentYear).length;

      setStats({
        totalStudents: (students || []).length,
        syllabusCoverage,
        examAverage: 0, // Will be calculated if exam results exist
        criticalTopics,
        totalSubjects: (subjects || []).length,
        totalTeachers: (users || []).filter((u: any) => u.role === 'teacher').length,
        recentExams,
      });
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTopics = coverage.reduce((acc, c) => acc + c.total_topics, 0);
  const completedTopics = coverage.reduce((acc, c) => acc + c.completed_topics, 0);
  const onProgressTopics = coverage.reduce((acc, c) => acc + c.on_progress_topics, 0);
  const pendingTopics = coverage.reduce((acc, c) => acc + c.pending_topics, 0);
  const pendingCritical = coverage.filter(c => c.pending_topics > c.completed_topics);

  const cards = [
    { 
      label: 'Total Students', 
      value: String(stats.totalStudents), 
      icon: GraduationCap, 
      trend: `${stats.totalSubjects} subjects`, 
      color: 'text-emerald-600', 
      view: 'students',
      empty: stats.totalStudents === 0
    },
    { 
      label: 'Syllabus Coverage', 
      value: `${stats.syllabusCoverage}%`, 
      icon: BookOpen, 
      trend: `${completedTopics}/${totalTopics} topics`, 
      color: stats.syllabusCoverage >= 50 ? 'text-emerald-600' : 'text-amber-600',
      view: 'curriculum',
      empty: stats.totalStudents === 0
    },
    { 
      label: 'Exams This Year', 
      value: String(stats.recentExams), 
      icon: CheckCircle2, 
      trend: 'All classes', 
      color: 'text-brand-primary', 
      view: 'examination',
      empty: stats.recentExams === 0
    },
    { 
      label: 'Critical Topics', 
      value: String(pendingCritical.length), 
      icon: AlertTriangle, 
      trend: 'Action Required', 
      color: pendingCritical.length > 0 ? 'text-rose-500' : 'text-slate-500', 
      view: 'curriculum',
      empty: pendingCritical.length === 0
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  const schoolLogo = (() => {
    try {
      const raw = localStorage.getItem('school_settings');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.school_logo || '';
    } catch {
      return '';
    }
  })();

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {schoolLogo ? (
            <img src={schoolLogo} alt="School Logo" className="w-12 h-12 object-contain" />
          ) : (
            <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center">
              <GraduationCap size={24} className="text-brand-primary" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">DASHBOARD <span className="text-brand-primary">OVERVIEW</span></h2>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Academic Performance Insights</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('students')} className="btn-primary">Register Student</button>
          <button onClick={() => setView('reports')} className="btn-secondary">View Analysis</button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat, i) => (
          <motion.button
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setView(stat.view)}
            className="group card-app p-5 hover:border-brand-primary transition-all text-left relative"
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className={`text-3xl font-black mt-1 tracking-tighter ${stat.color}`}>{stat.value}</p>
            <div className={`mt-2 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 ${stat.color}`}>
              {stat.trend}
            </div>
            <div className="absolute top-4 right-4 text-slate-100 group-hover:text-brand-primary/10 transition-colors">
              <stat.icon size={32} />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Coverage Overview Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-app">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">Syllabus Coverage by Class</h3>
            <button onClick={() => setView('curriculum')} className="text-[10px] font-bold text-brand-primary uppercase">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase text-slate-400 border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 font-bold">Class</th>
                  <th className="px-5 py-3 font-bold text-center">Total Topics</th>
                  <th className="px-5 py-3 font-bold text-center">Completed</th>
                  <th className="px-5 py-3 font-bold text-center">On Progress</th>
                  <th className="px-5 py-3 font-bold text-center">Pending</th>
                  <th className="px-5 py-3 font-bold">Coverage</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {coverage.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-300 font-bold text-xs uppercase">
                      No curriculum data found. Add topics to subjects.
                    </td>
                  </tr>
                ) : coverage.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${row.pending_topics > row.completed_topics ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-5 py-3 font-bold text-slate-800 font-mono tracking-tighter">{row.form}</td>
                    <td className="px-5 py-3 text-center font-bold text-slate-600">{row.total_topics}</td>
                    <td className="px-5 py-3 text-center font-bold text-emerald-600">{row.completed_topics}</td>
                    <td className="px-5 py-3 text-center font-bold text-brand-primary">{row.on_progress_topics}</td>
                    <td className="px-5 py-3 text-center font-bold text-rose-600">{row.pending_topics}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`${row.pending_topics > row.completed_topics ? 'bg-rose-500' : row.total_topics > 0 && row.completed_topics / row.total_topics >= 0.5 ? 'bg-emerald-500' : 'bg-amber-500'} h-full rounded-full`} 
                            style={{ width: row.total_topics > 0 ? `${(row.completed_topics / row.total_topics) * 100}%` : '0%' }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-8">
                          {row.total_topics > 0 ? Math.round((row.completed_topics / row.total_topics) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Critical Alerts */}
        <div className="space-y-6">
          {(pendingCritical.length > 0 || stats.recentExams === 0) && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-lg border border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} />
                <h4 className="font-bold text-sm">Attention Required</h4>
              </div>
              {pendingCritical.length > 0 && (
                <p className="text-xs mb-1">{pendingCritical.length} class(es) have pending topics greater than completed.</p>
              )}
              {stats.totalStudents === 0 && (
                <p className="text-xs">No students registered yet.</p>
              )}
            </div>
          )}
          
          <div className="bg-white p-5 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Users className="text-brand-primary" size={18} />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Stats</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Teachers</span>
                <span className="font-bold">{stats.totalTeachers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subjects</span>
                <span className="font-bold">{stats.totalSubjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Classes</span>
                <span className="font-bold">{coverage.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Exams This Year</span>
                <span className="font-bold">{stats.recentExams}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setView('curriculum')}
            className="w-full py-3 bg-brand-primary text-white font-bold text-xs uppercase tracking-widest rounded hover:brightness-95 transition-all"
          >
            Manage Curriculum
          </button>
        </div>
      </div>
    </div>
  );
}