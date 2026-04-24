import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../types.ts';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
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

export default function Dashboard({ user, setView }: DashboardProps) {
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const token = useMemo(() => localStorage.getItem('token') || '', []);
  
  useEffect(() => {
    fetch('/api/curriculum/overview', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const rows = data || [];
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
      })
      .finally(() => setLoading(false));
  }, [token]);

  const totals = useMemo(() => {
    return coverage.reduce((acc, c) => ({
      total: acc.total + c.total_topics,
      completed: acc.completed + c.completed_topics,
      onProgress: acc.onProgress + c.on_progress_topics,
      pending: acc.pending + c.pending_topics,
      tested: acc.tested + c.tested_topics,
      students: acc.students + 0,
    }), { total: 0, completed: 0, onProgress: 0, pending: 0, tested: 0, students: 482 });
  }, [coverage]);

  const coveragePercent = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
  const pendingCritical = coverage.filter(c => c.pending_topics > c.completed_topics);

  const stats = [
    { label: 'Total Students', value: '482', icon: GraduationCap, trend: '+12 New', color: 'text-emerald-600', view: 'students' },
    { label: 'Syllabus Coverage', value: `${coveragePercent}%`, icon: BookOpen, trend: 'View Details', color: 'text-slate-500', view: 'curriculum' },
    { label: 'School Mean Grade', value: 'C+', icon: TrendingUp, trend: 'Target: B-', color: 'text-brand-primary', view: 'reports' },
    { label: 'Critical Topics', value: String(totals.pending), icon: AlertTriangle, trend: 'Action Required', color: 'text-rose-500', view: 'curriculum' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800">DASHBOARD <span className="text-brand-primary">OVERVIEW</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Academic Performance Insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('students')} className="btn-primary">Register Student</button>
          <button onClick={() => setView('reports')} className="btn-secondary">View Analysis</button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.button
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setView(stat.view)}
            className="group card-app p-5 hover:border-brand-primary transition-all text-left relative"
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-3xl font-black mt-1 tracking-tighter text-slate-800">{stat.value}</p>
            <div className={`mt-2 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 ${stat.color}`}>
              {stat.trend}
            </div>
            <div className="absolute top-4 right-4 text-slate-100 group-hover:text-brand-primary/10 transition-colors">
              <stat.icon size={32} />
            </div>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-app">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">Syllabus Coverage & Competence</h3>
            <button className="text-[10px] font-bold text-brand-primary uppercase">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase text-slate-400 border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 font-bold">Class</th>
                  <th className="px-5 py-3 font-bold">Total Topics</th>
                  <th className="px-5 py-3 font-bold">Completed</th>
                  <th className="px-5 py-3 font-bold">On Progress</th>
                  <th className="px-5 py-3 font-bold">Coverage</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-300 font-bold text-[10px]">Loading data...</td>
                  </tr>
                ) : coverage.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-300 font-bold text-[10px]">No curriculum data found</td>
                  </tr>
                ) : coverage.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${row.pending_topics > row.completed_topics ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-5 py-3 font-bold text-slate-800 font-mono tracking-tighter">{row.form}</td>
                    <td className="px-5 py-3 font-bold text-slate-600">{row.total_topics}</td>
                    <td className="px-5 py-3 font-bold text-emerald-600">{row.completed_topics}</td>
                    <td className="px-5 py-3 font-bold text-brand-primary">{row.on_progress_topics}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`${row.pending_topics > row.completed_topics ? 'bg-rose-500' : row.total_topics > 0 && row.completed_topics / row.total_topics >= 0.5 ? 'bg-emerald-500' : 'bg-amber-500'} h-full rounded-full`} style={{ width: row.total_topics > 0 ? `${(row.completed_topics / row.total_topics) * 100}%` : '0%' }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-8">{row.total_topics > 0 ? Math.round((row.completed_topics / row.total_topics) * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-brand-dark text-white p-6 rounded-lg shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full" />
            <h4 className="text-lg font-black mb-1 tracking-tight">CRITICAL ANALYSIS</h4>
            <p className="text-[9px] text-slate-400 mb-5 uppercase tracking-widest font-bold">Low Performance Intervention Required:</p>
            <div className="space-y-3">
              {pendingCritical.length > 0 ? pendingCritical.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-default">
                  <span className="text-xs font-medium">{item.form}</span>
                  <span className="px-2 py-0.5 bg-rose-500 text-[9px] font-black rounded uppercase tracking-tighter">{item.pending_topics} PENDING</span>
                </div>
              )) : coverage.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-default">
                  <span className="text-xs font-medium">{item.form}</span>
                  <span className="px-2 py-0.5 bg-amber-500 text-[9px] font-black rounded uppercase tracking-tighter">{item.completed_topics} DONE</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setView('reports')}
              className="w-full mt-6 py-3 bg-brand-primary text-white font-bold text-[10px] uppercase tracking-widest rounded transition-all hover:brightness-95 active:brightness-90 active:scale-95 shadow-md"
            >
              Analyze Remedial Plan
            </button>
          </div>
          
          <div className="bg-white p-5 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Parameters</p>
            </div>
            <p className="text-xs text-slate-700 font-bold">Active Mode: <span className="text-brand-primary">O-LEVEL (FORM 1-4)</span></p>
            <p className="text-[11px] text-slate-400 italic mt-2 leading-relaxed">A-Level modules are currently dormant pending department approval.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
