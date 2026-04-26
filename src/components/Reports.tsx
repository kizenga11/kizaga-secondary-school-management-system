import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileText } from 'lucide-react';
import { useToast } from './Toast';

interface ReportsProps {
  token: string;
}

type Exam = { id: number; name: string; type: string; date: string };
type User = { id: number; full_name: string; role: string };

type TeachingRow = {
  form: string;
  code: string;
  subject: string;
  teacher: string;
  total_topics: number;
  completed_topics: number;
  on_progress_topics: number;
  pending_topics: number;
  tested_topics: number;
  coverage_percent: number;
};

type ExamReportRow = {
  form: string;
  code: string;
  subject: string;
  component: string;
  entries: number;
  present: number;
  absent: number;
  mean_score: number | null;
  min_score: number | null;
  max_score: number | null;
};

type StudentsRow = {
  id: number;
  full_name: string;
  gender: string;
  form: string;
  stream: string;
  parent_phone: string;
  stream_subject_count: number;
  stream_subject_codes: string;
};

type TeacherRow = {
  id: number;
  full_name: string;
  role: string;
  email: string;
  phone: string;
  tsc_no: string;
  gender: string;
  education_level: string;
  studied_subjects: string;
  teaching_subjects: string;
  assigned_subjects: string;
  cheque_no: string;
  employment_date: string;
  confirmation_date: string;
  retirement_date: string;
  salary_scale: string;
  date_of_birth: string;
  nida_no: string;
};

function downloadXlsx(filename: string, sheetName: string, aoa: any[][]) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const cols = (aoa[0] || []).map((h: any, i: number) => {
    const maxLen = Math.max(
      String(h ?? '').length,
      ...aoa.slice(1).map(r => String(r?.[i] ?? '').length)
    );
    return { wch: Math.min(60, Math.max(10, maxLen + 2)) };
  });
  (ws as any)['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports({ token }: ReportsProps) {
  const [tab, setTab] = useState<'teaching' | 'exams' | 'students' | 'teachers'>('teaching');
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();

  const forms = ['All', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];
  const [formFilter, setFormFilter] = useState<string>('All');

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [teachingTeacherFilter, setTeachingTeacherFilter] = useState<string>('all');
  const [teachingSubjectFilter, setTeachingSubjectFilter] = useState<string>('all');
  const [examFormFilter, setExamFormFilter] = useState<string>('All');
  const [examSubjectFilter, setExamSubjectFilter] = useState<string>('all');

  const [teachingRows, setTeachingRows] = useState<TeachingRow[]>([]);
  const [examRows, setExamRows] = useState<ExamReportRow[]>([]);
  const [examMeta, setExamMeta] = useState<{ name: string; type: string; date: string } | null>(null);
  const [studentRows, setStudentRows] = useState<StudentsRow[]>([]);
  const [teacherRows, setTeacherRows] = useState<TeacherRow[]>([]);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const queryForm = formFilter !== 'All' ? `?form=${encodeURIComponent(formFilter)}` : '';

  const fetchExams = async () => {
    const res = await fetch('/api/exams', { headers: authHeaders });
    const json = await res.json().catch(() => []);
    if (!res.ok) return;
    setExams(json || []);
    if ((json || []).length > 0 && selectedExamId === null) setSelectedExamId((json || [])[0].id);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users', { headers: authHeaders });
    const json = await res.json().catch(() => []);
    if (!res.ok) return;
    setUsers(json || []);
  };

  const fetchTeaching = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/teaching${queryForm}`, { headers: authHeaders });
      const json = await res.json().catch(() => []);
      if (!res.ok) {
        showError(json?.error || 'Failed to load teaching report');
        return;
      }
      setTeachingRows(json || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamReport = async (examId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/exams?exam_id=${examId}`, { headers: authHeaders });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        showError(json?.error || 'Failed to load exam report');
        return;
      }
      setExamMeta(json?.exam || null);
      setExamRows(json?.rows || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/students${queryForm}`, { headers: authHeaders });
      const json = await res.json().catch(() => []);
      if (!res.ok) {
        showError(json?.error || 'Failed to load students report');
        return;
      }
      setStudentRows(json || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachersReport = async () => {
    setLoading(true);
    try {
      const q = selectedUserId === 'all' ? '' : `?user_id=${encodeURIComponent(selectedUserId)}`;
      const res = await fetch(`/api/reports/teachers${q}`, { headers: authHeaders });
      const json = await res.json().catch(() => []);
      if (!res.ok) {
        showError(json?.error || 'Failed to load teachers report');
        return;
      }
      setTeacherRows(json || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (tab === 'teaching') fetchTeaching();
    if (tab === 'students') fetchStudentsReport();
  }, [tab, formFilter]);

  useEffect(() => {
    if (tab !== 'exams') return;
    if (!selectedExamId) return;
    fetchExamReport(selectedExamId);
  }, [tab, selectedExamId]);

  useEffect(() => {
    if (tab !== 'teachers') return;
    fetchTeachersReport();
  }, [tab, selectedUserId]);

  const downloadTeaching = () => {
    const headers = ['Form', 'Subject Code', 'Subject', 'Teacher', 'Total Topics', 'Completed', 'On Progress', 'Pending', 'Tested', 'Coverage %'];
    const rows = filteredTeachingRows.map(r => [
      r.form,
      r.code,
      r.subject,
      r.teacher,
      r.total_topics,
      r.completed_topics,
      r.on_progress_topics,
      r.pending_topics,
      r.tested_topics,
      r.coverage_percent,
    ]);
    downloadXlsx(
      `teaching_report_${formFilter === 'All' ? 'all_forms' : formFilter.replace(' ', '_')}.xlsx`,
      'Teaching',
      [headers, ...rows]
    );
  };

  const downloadExams = () => {
    const title = examMeta ? `${examMeta.name} (${examMeta.type})` : 'Exam';
    const headers = ['Form', 'Subject Code', 'Subject', 'Component', 'Entries', 'Present', 'Absent', 'Mean', 'Min', 'Max'];
    const rows = filteredExamRows.map(r => [
      r.form,
      r.code,
      r.subject,
      r.component,
      r.entries,
      r.present,
      r.absent,
      r.mean_score ?? '',
      r.min_score ?? '',
      r.max_score ?? '',
    ]);
    downloadXlsx(
      `exam_report_${title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-()]/g, '')}.xlsx`,
      'Exam',
      [headers, ...rows]
    );
  };

  const downloadStudents = () => {
    const headers = ['Student ID', 'Full Name', 'Gender', 'Form', 'Stream', 'Parent Phone', 'Stream Subjects Count', 'Stream Subject Codes'];
    const rows = studentRows.map(r => [
      r.id,
      r.full_name,
      r.gender,
      r.form,
      r.stream,
      r.parent_phone,
      r.stream_subject_count,
      r.stream_subject_codes,
    ]);
    downloadXlsx(
      `students_report_${formFilter === 'All' ? 'all_forms' : formFilter.replace(' ', '_')}.xlsx`,
      'Students',
      [headers, ...rows]
    );
  };

  const downloadTeachers = () => {
    const headers = [
      'Staff ID',
      'Full Name',
      'Role',
      'TSC No',
      'Cheque No',
      'Gender',
      'Education Level',
      'Salary Scale',
      'Employment Date',
      'Confirmation Date',
      'Retirement Date',
      'Date of Birth',
      'NIDA No',
      'Subjects Studied',
      'Subjects Taught',
      'Assigned Subjects',
      'Email',
      'Phone',
    ];
    const rows = teacherRows.map(r => [
      r.id,
      r.full_name,
      r.role,
      r.tsc_no,
      r.cheque_no,
      r.gender,
      r.education_level,
      r.salary_scale,
      r.employment_date,
      r.confirmation_date,
      r.retirement_date,
      r.date_of_birth,
      r.nida_no,
      r.studied_subjects,
      r.teaching_subjects,
      r.assigned_subjects,
      r.email,
      r.phone,
    ]);
    downloadXlsx(
      `teachers_report_${selectedUserId === 'all' ? 'all' : selectedUserId}.xlsx`,
      'Teachers',
      [headers, ...rows]
    );
  };

  const tabs = [
    { id: 'teaching' as const, label: 'Teaching' },
    { id: 'exams' as const, label: 'Exams' },
    { id: 'students' as const, label: 'Students' },
    { id: 'teachers' as const, label: 'Teachers' },
  ];

  const teachingTeachers = useMemo(
    () => Array.from(new Set(teachingRows.map(r => r.teacher).filter(Boolean))),
    [teachingRows]
  );

  const teachingSubjects = useMemo(
    () => Array.from(new Set(teachingRows.map(r => `${r.code}||${r.subject}`))),
    [teachingRows]
  );

  const filteredTeachingRows = useMemo(() => {
    return teachingRows.filter(r => {
      const passTeacher = teachingTeacherFilter === 'all' || r.teacher === teachingTeacherFilter;
      const passSubject = teachingSubjectFilter === 'all' || `${r.code}||${r.subject}` === teachingSubjectFilter;
      return passTeacher && passSubject;
    });
  }, [teachingRows, teachingTeacherFilter, teachingSubjectFilter]);

  const examSubjects = useMemo(
    () => Array.from(new Set(examRows.map(r => `${r.code}||${r.subject}`))),
    [examRows]
  );

  const filteredExamRows = useMemo(() => {
    return examRows.filter(r => {
      const passForm = examFormFilter === 'All' || r.form === examFormFilter;
      const passSubject = examSubjectFilter === 'all' || `${r.code}||${r.subject}` === examSubjectFilter;
      return passForm && passSubject;
    });
  }, [examRows, examFormFilter, examSubjectFilter]);

  return (
    <div className="space-y-6">
      <header className="section-header">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">REPORTS <span className="text-brand-primary">CENTER</span></h2>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest opacity-60">Teaching, exams, students and teachers reports</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-widest border transition-colors ${
              tab === t.id
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card-app overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-brand-primary" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{tab.toUpperCase()} REPORT</p>
              <p className="text-xs text-slate-500">Download as Excel (.xlsx)</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {(tab === 'teaching' || tab === 'students') && (
              <select
                className="input-app py-1 tracking-tight !w-auto"
                value={formFilter}
                onChange={e => setFormFilter(e.target.value)}
              >
                {forms.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            )}

            {tab === 'teaching' && (
              <>
                <select
                  className="input-app py-1 tracking-tight !w-auto"
                  value={teachingTeacherFilter}
                  onChange={e => setTeachingTeacherFilter(e.target.value)}
                >
                  <option value="all">All teachers</option>
                  {teachingTeachers.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  className="input-app py-1 tracking-tight !w-auto"
                  value={teachingSubjectFilter}
                  onChange={e => setTeachingSubjectFilter(e.target.value)}
                >
                  <option value="all">All subjects</option>
                  {teachingSubjects.map(s => {
                    const [code, subject] = s.split('||');
                    return <option key={s} value={s}>{code} - {subject}</option>;
                  })}
                </select>
              </>
            )}

            {tab === 'exams' && (
              <>
                <select
                  className="input-app py-1 tracking-tight !w-auto"
                  value={selectedExamId ?? ''}
                  onChange={e => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select exam</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name} ({ex.type})</option>
                  ))}
                </select>
                <select
                  className="input-app py-1 tracking-tight !w-auto"
                  value={examFormFilter}
                  onChange={e => setExamFormFilter(e.target.value)}
                >
                  {forms.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <select
                  className="input-app py-1 tracking-tight !w-auto"
                  value={examSubjectFilter}
                  onChange={e => setExamSubjectFilter(e.target.value)}
                >
                  <option value="all">All subjects</option>
                  {examSubjects.map(s => {
                    const [code, subject] = s.split('||');
                    return <option key={s} value={s}>{code} - {subject}</option>;
                  })}
                </select>
              </>
            )}

            {tab === 'teachers' && (
              <select
                className="input-app py-1 tracking-tight !w-auto"
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
              >
                <option value="all">All staff</option>
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                if (tab === 'teaching') downloadTeaching();
                if (tab === 'exams') downloadExams();
                if (tab === 'students') downloadStudents();
                if (tab === 'teachers') downloadTeachers();
              }}
              className="btn-dark flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} />
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tab === 'teaching' && (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest bg-slate-50/30">
                  <th className="px-6 py-3">Form</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Teacher</th>
                  <th className="px-6 py-3 text-center">Topics</th>
                  <th className="px-6 py-3 text-center">Completed</th>
                  <th className="px-6 py-3 text-center">Coverage</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {filteredTeachingRows.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-bold text-slate-700">{r.form}</td>
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-800">{r.subject}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.code}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-semibold">{r.teacher || 'Unassigned'}</td>
                    <td className="px-6 py-3 text-center font-bold text-slate-700">{r.total_topics}</td>
                    <td className="px-6 py-3 text-center font-bold text-emerald-700">{r.completed_topics}</td>
                    <td className="px-6 py-3 text-center font-black text-brand-primary">{r.coverage_percent}%</td>
                  </tr>
                ))}
                {filteredTeachingRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                      No data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'exams' && (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest bg-slate-50/30">
                  <th className="px-6 py-3">Form</th>
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3">Component</th>
                  <th className="px-6 py-3 text-center">Present</th>
                  <th className="px-6 py-3 text-center">Absent</th>
                  <th className="px-6 py-3 text-center">Mean</th>
                  <th className="px-6 py-3 text-center">Min</th>
                  <th className="px-6 py-3 text-center">Max</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {filteredExamRows.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-bold text-slate-700">{r.form}</td>
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-800">{r.subject}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.code}</div>
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-600 uppercase">{r.component}</td>
                    <td className="px-6 py-3 text-center font-bold text-slate-700">{r.present}</td>
                    <td className="px-6 py-3 text-center font-bold text-rose-700">{r.absent}</td>
                    <td className="px-6 py-3 text-center font-black text-brand-primary">{r.mean_score ?? '-'}</td>
                    <td className="px-6 py-3 text-center font-bold text-slate-700">{r.min_score ?? '-'}</td>
                    <td className="px-6 py-3 text-center font-bold text-slate-700">{r.max_score ?? '-'}</td>
                  </tr>
                ))}
                {filteredExamRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                      Select an exam to load report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'students' && (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest bg-slate-50/30">
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3 text-center">Gender</th>
                  <th className="px-6 py-3 text-center">Form</th>
                  <th className="px-6 py-3">Stream</th>
                  <th className="px-6 py-3">Parent Phone</th>
                  <th className="px-6 py-3 text-center">Subjects</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {studentRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-700">{r.full_name}</td>
                    <td className="px-6 py-3 text-center font-bold text-slate-600">{r.gender}</td>
                    <td className="px-6 py-3 text-center font-bold text-brand-primary">{r.form}</td>
                    <td className="px-6 py-3 font-semibold text-slate-600">{r.stream || 'Not set'}</td>
                    <td className="px-6 py-3 font-mono text-[11px] text-slate-500">{r.parent_phone || '-'}</td>
                    <td className="px-6 py-3 text-center font-bold text-slate-700">{r.stream_subject_count}</td>
                  </tr>
                ))}
                {studentRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                      No data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {tab === 'teachers' && (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 font-bold tracking-widest bg-slate-50/30">
                  <th className="px-6 py-3">Full Name</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">TSC</th>
                  <th className="px-6 py-3">Salary Scale</th>
                  <th className="px-6 py-3">Assigned Subjects</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {teacherRows.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-700">{r.full_name}</td>
                    <td className="px-6 py-3 font-bold text-slate-600 uppercase">{r.role}</td>
                    <td className="px-6 py-3 font-mono text-[11px] text-slate-500">{r.tsc_no || '-'}</td>
                    <td className="px-6 py-3 font-bold text-slate-600">{r.salary_scale || '-'}</td>
                    <td className="px-6 py-3 text-slate-600 text-[12px]">{r.assigned_subjects || '-'}</td>
                  </tr>
                ))}
                {teacherRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                      No data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}