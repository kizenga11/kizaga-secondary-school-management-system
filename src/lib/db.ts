import { createClient, SupabaseClient, Database } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are not set');
}

export type Tables = Database['public']['Tables'];

export type User = Tables['users']['Row'];
export type Student = Tables['students']['Row'];
export type Subject = Tables['subjects']['Row'];
export type Stream = Tables['streams']['Row'];
export type Assignment = Tables['assignments']['Row'];
export type Topic = Tables['topics']['Row'];
export type Exam = Tables['exams']['Row'];
export type ExamSubject = Tables['exam_subjects']['Row'];
export type ExamScore = Tables['exam_scores']['Row'];
export type StudentExamResult = Tables['student_exam_results']['Row'];
export type ExamComposition = Tables['exam_compositions']['Row'];
export type SchoolSettings = Tables['school_settings']['Row'];

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Helper to extract just the data from Supabase response
export const extractData = <T>(data: T | null): T[] => {
  return data as any[];
};

export const extractSingle = <T>(data: T | null): T | null => {
  return data as any;
};

// Auth helpers
export const signUp = async (email: string, password: string, fullName: string, role: string = 'teacher') => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// ========== DATABASE OPERATIONS ==========

// Users
export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
};

export const getUserByEmail = async (email: string) => {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error) throw error;
  return data;
};

export const createUser = async (user: Partial<User>) => {
  const { data, error } = await supabase.from('users').insert(user).select().single();
  if (error) throw error;
  return data;
};

export const updateUser = async (id: string, user: Partial<User>) => {
  const { data, error } = await supabase.from('users').update(user).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

// Students
export const getStudents = async (form?: string) => {
  let query = supabase.from('students').select('*, streams(name)');
  if (form) query = query.eq('form', form);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getStudentById = async (id: string) => {
  const { data, error } = await supabase.from('students').select('*, streams(name)').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createStudent = async (student: Partial<Student>) => {
  const { data, error } = await supabase.from('students').insert(student).select().single();
  if (error) throw error;
  return data;
};

export const updateStudent = async (id: string, student: Partial<Student>) => {
  const { data, error } = await supabase.from('students').update(student).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteStudent = async (id: string) => {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
};

export const getStudentsBySubject = async (subjectId: string, form: string) => {
  const { data, error } = await supabase
    .from('students')
    .select('*, streams(name)')
    .eq('form', form)
    .or('stream_id.eq.null,streams.subjects.cs.{subject_id: ' + subjectId + '})');
  if (error) throw error;
  return data;
};

// Subjects
export const getSubjects = async () => {
  const { data, error } = await supabase.from('subjects').select('*').order('form').order('name');
  if (error) throw error;
  return data;
};

export const getSubjectById = async (id: string) => {
  const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createSubject = async (subject: Partial<Subject>) => {
  const { data, error } = await supabase.from('subjects').insert(subject).select().single();
  if (error) throw error;
  return data;
};

export const updateSubject = async (id: string, subject: Partial<Subject>) => {
  const { data, error } = await supabase.from('subjects').update(subject).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteSubject = async (id: string) => {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
};

// Streams
export const getStreams = async () => {
  const { data, error } = await supabase.from('streams').select('*, stream_subjects(subject_id)').order('form').order('name');
  if (error) throw error;
  return data;
};

export const createStream = async (stream: Partial<Stream>) => {
  const { data, error } = await supabase.from('streams').insert(stream).select().single();
  if (error) throw error;
  return data;
};

export const updateStream = async (id: string, stream: Partial<Stream>) => {
  const { data, error } = await supabase.from('streams').update(stream).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteStream = async (id: string) => {
  const { error } = await supabase.from('streams').delete().eq('id', id);
  if (error) throw error;
};

// Assignments
export const getAssignments = async () => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*, users(full_name), subjects(name, form)');
  if (error) throw error;
  return data;
};

export const createAssignment = async (assignment: Partial<Assignment>) => {
  const { data, error } = await supabase.from('assignments').insert(assignment).select().single();
  if (error) throw error;
  return data;
};

export const deleteAssignment = async (id: string) => {
  const { error } = await supabase.from('assignments').delete().eq('id', id);
  if (error) throw error;
};

// Topics
export const getTopics = async (subjectId?: string) => {
  let query = supabase.from('topics').select('*');
  if (subjectId) query = query.eq('subject_id', subjectId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createTopic = async (topic: Partial<Topic>) => {
  const { data, error } = await supabase.from('topics').insert(topic).select().single();
  if (error) throw error;
  return data;
};

export const updateTopic = async (id: string, topic: Partial<Topic>) => {
  const { data, error } = await supabase.from('topics').update(topic).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

// Exams
export const getExams = async (form?: string) => {
  let query = supabase.from('exams').select('*').order('created_at', { ascending: false });
  if (form) query = query.eq('form', form);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createExam = async (exam: Partial<Exam>) => {
  const { data, error } = await supabase.from('exams').insert(exam).select().single();
  if (error) throw error;
  return data;
};

export const updateExam = async (id: string, exam: Partial<Exam>) => {
  const { data, error } = await supabase.from('exams').update(exam).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteExam = async (id: string) => {
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) throw error;
};

// Exam Subjects
export const getExamSubjects = async (examId: string) => {
  const { data, error } = await supabase
    .from('exam_subjects')
    .select('*, subjects(name, code)')
    .eq('exam_id', examId);
  if (error) throw error;
  return data;
};

export const addExamSubjects = async (examId: string, subjectIds: string[], weight: number = 1) => {
  const inserts = subjectIds.map((sid) => ({ exam_id: examId, subject_id: sid, weight }));
  const { error } = await supabase.from('exam_subjects').upsert(inserts);
  if (error) throw error;
};

// Exam Scores
export const getExamScores = async (examId: string, subjectId?: string) => {
  let query = supabase
    .from('exam_scores')
    .select('*, students(full_name, gender), subjects(name, code)')
    .eq('exam_id', examId);
  if (subjectId) query = query.eq('subject_id', subjectId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const saveExamScores = async (examId: string, scores: Partial<ExamScore>[]) => {
  const inserts = scores.map((s) => ({ ...s, exam_id: examId }));
  const { error } = await supabase.from('exam_scores').upsert(inserts);
  if (error) throw error;
};

// Student Exam Results
export const getStudentExamResults = async (examId: string) => {
  const { data, error } = await supabase
    .from('student_exam_results')
    .select('*, students(full_name, gender, form, streams(name))')
    .eq('exam_id', examId)
    .order('average', { ascending: false });
  if (error) throw error;
  return data;
};

export const saveStudentExamResults = async (results: Partial<StudentExamResult>[]) => {
  const { error } = await supabase.from('student_exam_results').upsert(results);
  if (error) throw error;
};

// Exam Compositions
export const getExamCompositions = async (form?: string) => {
  let query = supabase.from('exam_compositions').select('*').order('created_at', { ascending: false });
  if (form) query = query.eq('form', form);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createExamComposition = async (composition: Partial<ExamComposition>) => {
  const { data, error } = await supabase.from('exam_compositions').insert(composition).select().single();
  if (error) throw error;
  return data;
};

// School Settings
export const getSchoolSettings = async () => {
  const { data, error } = await supabase.from('school_settings').select('*').limit(1).single();
  if (error) throw error;
  return data;
};

export const updateSchoolSettings = async (settings: Partial<SchoolSettings>) => {
  const { data, error } = await supabase.from('school_settings').upsert(settings).select().single();
  if (error) throw error;
  return data;
};

// Curriculum Overview
export const getCurriculumOverview = async (form: string) => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*, topics(id, status, tested)')
    .eq('form', form);
  if (error) throw error;
  
  // Group by subject
  const grouped = new Map();
  for (const row of data || []) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, { ...row, topics: [] });
    }
    if (row.topics) {
      grouped.get(row.id).topics.push(row.topics);
    }
  }
  
  return Array.from(grouped.values()).map((s: any) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    form: s.form,
    has_practical: s.has_practical,
    total_topics: s.topics?.length || 0,
    completed_topics: s.topics?.filter((t: any) => t.status === 'completed').length || 0,
    on_progress_topics: s.topics?.filter((t: any) => t.status === 'on_progress').length || 0,
    pending_topics: s.topics?.filter((t: any) => t.status === 'pending').length || 0,
    tested_topics: s.topics?.filter((t: any) => t.tested).length || 0,
  }));
};

// Division Summary
export const getDivisionSummary = async (examId: string) => {
  const results = await getStudentExamResults(examId);
  const summary: any = { F: {}, M: {}, T: {} };
  for (let d = 0; d <= 4; d++) {
    summary.F[d] = 0;
    summary.M[d] = 0;
    summary.T[d] = 0;
  }
  
  for (const r of results || []) {
    const g = r.students?.gender === 'Female' ? 'F' : 'M';
    summary[g][r.division] = (summary[g][r.division] || 0) + 1;
    summary.T[r.division] = (summary.T[r.division] || 0) + 1;
  }
  
  const total = summary.T[0] + summary.T[1] + summary.T[2] + summary.T[3] + summary.T[4];
  const passCount = total - summary.T[0];
  
  return {
    summary,
    totals: { total, passCount, passRate: total > 0 ? Math.round((passCount / total) * 100) : 0 },
  };
};

// Reports
export const getTeachingReport = async (form?: string) => {
  const subjects = await getSubjects();
  const filtered = form ? subjects.filter((s: any) => s.form === form) : subjects;
  
  const report = await Promise.all(
    filtered.map(async (s: any) => {
      const topics = await getTopics(s.id);
      return {
        form: s.form,
        code: s.code,
        subject: s.name,
        teacher: '', // TODO: join with assignments
        total_topics: topics.length,
        completed_topics: topics.filter((t: any) => t.status === 'completed').length,
        on_progress_topics: topics.filter((t: any) => t.status === 'on_progress').length,
        pending_topics: topics.filter((t: any) => t.status === 'pending').length,
        tested_topics: topics.filter((t: any) => t.tested).length,
        coverage_percent: topics.length > 0 
          ? Math.round((topics.filter((t: any) => t.status === 'completed').length / topics.length) * 100) 
          : 0,
      };
    })
  );
  
  return report;
};

export const getStudentsReport = async (form?: string) => {
  const students = await getStudents(form);
  return students.map((s: any) => ({
    id: s.id,
    full_name: s.full_name,
    gender: s.gender,
    form: s.form,
    parent_phone: s.parent_phone || '',
    stream: s.streams?.name || '',
    stream_subject_count: 0,
    stream_subject_codes: '',
  }));
};

export const getTeachersReport = async () => {
  const { data: users } = await supabase
    .from('users')
    .select('*, assignments(subjects(name, code))')
    .in('role', ['teacher', 'academic', 'headmaster']);
  
  return (users || []).map((u: any) => ({
    id: u.id,
    full_name: u.full_name,
    role: u.role,
    email: u.email,
    phone: u.phone || '',
    tsc_no: u.tsc_no || '',
    gender: u.gender || '',
    education_level: u.education_level || '',
    studied_subjects: u.studied_subjects || '',
    teaching_subjects: u.teaching_subjects || '',
    cheque_no: u.cheque_no || '',
    employment_date: u.employment_date || '',
    confirmation_date: u.confirmation_date || '',
    retirement_date: u.retirement_date || '',
    salary_scale: u.salary_scale || '',
    date_of_birth: u.date_of_birth || '',
    nida_no: u.nida_no || '',
    assigned_subjects: u.assignments?.map((a: any) => `${a.subjects?.code} ${a.subjects?.name}`).join('; ') || '',
  }));
};