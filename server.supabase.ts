import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client (server-side with service role)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('WARNING: Supabase not configured. Running in offline/demo mode.');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

if (supabase) {
  console.log('Supabase connected');
} else {
  console.log('Running without Supabase (demo mode)');
}

app.use(cors());
app.use(express.json());

// ========== MIDDLEWARE ==========
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(403).json({ error: 'Invalid token' });
  
  // Get local user ID from public.users table
  const { data: localUser } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('user_id', user.id)
    .single();
  
  if (!localUser) return res.status(403).json({ error: 'User not found in system' });
  
  req.user = localUser;
  req.userId = localUser.id;
  req.userRole = localUser.role;
  next();
};

// ========== HELPER FUNCTIONS ==========
const getGrade = (avg: number): { grade: string; division: number; points: number; remark: string } => {
  if (avg >= 80) return { grade: 'A', division: 1, points: 1, remark: 'Excellent' };
  if (avg >= 65) return { grade: 'B', division: 2, points: 2, remark: 'Very Good' };
  if (avg >= 50) return { grade: 'C', division: 3, points: 3, remark: 'Good' };
  if (avg >= 40) return { grade: 'D', division: 4, points: 4, remark: 'Average' };
  return { grade: 'F', division: 0, points: 5, remark: 'Fail' };
};

// ========== AUTH ==========
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    
    // Get local user from public.users table
    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('user_id', data.user?.id)
      .single();
    
    if (!userData) {
      await supabase.auth.signOut();
      return res.status(401).json({ error: 'User not registered in system. Contact admin.' });
    }
    
    res.json({ 
      token: data.session?.access_token, 
      user: userData
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ========== USERS ==========
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, tsc_no, email, phone, role')
    .neq('role', 'headmaster'); // Exclude headmaster from list
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/users/me', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.userId)
    .single();
  
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

app.put('/api/users/me', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .update(req.body)
    .eq('id', req.userId)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Profile updated', user: data });
});

app.post('/api/users', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster') {
    return res.status(403).json({ error: 'Only headmaster can create users' });
  }
  
  try {
    const { full_name, tsc_no, email, phone, role, user_id } = req.body;
    
    // Check if user already exists in public.users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      // Update existing user instead of creating new
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name,
          tsc_no,
          phone,
          role: role || 'teacher'
        })
        .eq('id', existingUser.id)
        .select()
        .single();
      
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ message: 'User already exists, record updated', user: data });
    }
    
    // Check if auth user already exists
    if (user_id) {
      // Link existing auth user to public.users
      const { data, error } = await supabase
        .from('users')
        .insert({
          user_id,
          full_name,
          tsc_no,
          email,
          phone,
          role: role || 'teacher'
        })
        .select()
        .single();
      
      if (error) {
        // If linking fails due to other constraint, try update
        if (error.message.includes('duplicate')) {
          const { data: updated, error: updateError } = await supabase
            .from('users')
            .update({ full_name, tsc_no, phone, role: role || 'teacher' })
            .eq('user_id', user_id)
            .select()
            .single();
          
          if (updateError) return res.status(400).json({ error: updateError.message });
          return res.status(200).json({ message: 'User already exists, record updated', user: updated });
        }
        return res.status(400).json({ error: error.message });
      }
      return res.status(201).json({ message: 'User created', user: data });
    }
    
    // Try to create new auth user first
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
    });
    
    if (authError) {
      // If auth signup fails (user exists), try to update existing
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        const { data: foundUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();
        
        if (foundUser) {
          const { data: updated, error: updateError } = await supabase
            .from('users')
            .update({ full_name, tsc_no, phone, role: role || 'teacher' })
            .eq('id', foundUser.id)
            .select()
            .single();
          
          if (updateError) return res.status(400).json({ error: updateError.message });
          return res.status(200).json({ message: 'User already exists, record updated', user: updated });
        }
      }
      return res.status(400).json({ error: authError.message });
    }
    
    // Create local user record with auth user_id
    const { data, error } = await supabase
      .from('users')
      .insert({
        user_id: authData.user?.id,
        full_name,
        tsc_no,
        email,
        phone,
        role: role || 'teacher'
      })
      .select()
      .single();
    
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ message: 'User created', user: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ========== STUDENTS ==========
app.get('/api/students', authenticateToken, async (req, res) => {
  const { form, subject_id } = req.query;
  let query = supabase
    .from('students')
    .select('*, streams(name)')
    .order('full_name');
  
  if (form) query = query.eq('form', form);
  else query = query.neq('form', 'Graduated');
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/students', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { full_name, gender, form, parent_phone, stream_id } = req.body as any;
  
  let streamId: number | null = null;
  if (stream_id !== undefined && stream_id !== null && String(stream_id).trim() !== '') {
    const n = Number(stream_id);
    if (!Number.isFinite(n)) return res.status(400).json({ error: 'Invalid stream_id' });
    streamId = n;
  }

  if (streamId !== null) {
    const { data: stream } = await supabase
      .from('streams')
      .select('id, form')
      .eq('id', streamId)
      .single();
    
    if (!stream) return res.status(400).json({ error: 'Stream not found' });
    if (stream.form !== form) return res.status(400).json({ error: 'Stream form must match student form' });
  }
  
  const { data, error } = await supabase
    .from('students')
    .insert({ full_name, gender, form, parent_phone, stream_id: streamId })
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ message: 'Student registered', student: data });
});

app.put('/api/students/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid student id' });

  const { full_name, gender, form, parent_phone, stream_id } = req.body as any;
  const hasStreamInBody = Object.prototype.hasOwnProperty.call(req.body || {}, 'stream_id');
  const rawStreamId = (req.body || {})?.stream_id;

  const { data: current } = await supabase
    .from('students')
    .select('id, form, stream_id')
    .eq('id', id)
    .single();

  if (!current) return res.status(404).json({ error: 'Student not found' });

  let nextStreamId: number | null = current.stream_id ?? null;

  if (hasStreamInBody) {
    if (rawStreamId === null || rawStreamId === undefined || String(rawStreamId).trim() === '') {
      nextStreamId = null;
    } else {
      const n = Number(rawStreamId);
      if (!Number.isFinite(n)) return res.status(400).json({ error: 'Invalid stream_id' });
      nextStreamId = n;
    }
  } else {
    // If the form changes and stream isn't explicitly sent, clear it to avoid mismatches.
    if (form !== current.form) nextStreamId = null;
  }

  if (nextStreamId !== null) {
    const { data: stream } = await supabase
      .from('streams')
      .select('id, form')
      .eq('id', nextStreamId)
      .single();
    
    if (!stream) return res.status(400).json({ error: 'Stream not found' });
    if (stream.form !== form) return res.status(400).json({ error: 'Stream form must match student form' });
  }

  const { data, error } = await supabase
    .from('students')
    .update({ full_name, gender, form, parent_phone, stream_id: nextStreamId })
    .eq('id', id)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Student updated', student: data });
});

app.delete('/api/students/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Student removed' });
});

app.post('/api/students/bulk', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const students = req.body;
  const { data, error } = await supabase.from('students').insert(students).select();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: `${students.length} students registered`, students: data });
});

app.post('/api/students/promote', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data: students } = await supabase
    .from('students')
    .select('id, form')
    .neq('form', 'Graduated');
  
  const promotionMap: Record<string, string> = {
    'Form 1': 'Form 2',
    'Form 2': 'Form 3',
    'Form 3': 'Form 4',
    'Form 4': 'Graduated'
  };
  
  const updates = (students || []).map((s: any) => ({
    id: s.id,
    form: promotionMap[s.form] || s.form,
    stream_id: null
  }));
  
  const { error } = await supabase.from('students').upsert(updates);
  if (error) return res.status(400).json({ error: error.message });
  
  res.json({ message: 'Students promoted successfully' });
});

// ========== SUBJECTS ==========
app.get('/api/subjects', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('form')
    .order('name');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data?.map((s: any) => ({ ...s, has_practical: s.has_practical || false })) || []);
});

app.post('/api/subjects', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data, error } = await supabase
    .from('subjects')
    .insert(req.body)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ message: 'Subject registered', subject: data });
});

app.put('/api/subjects/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data, error } = await supabase
    .from('subjects')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Subject updated', subject: data });
});

app.delete('/api/subjects/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Subject removed' });
});

// ========== ASSIGNMENTS ==========
app.get('/api/assignments', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*, users(full_name), subjects(name, form)');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/assignments', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data, error } = await supabase
    .from('assignments')
    .insert(req.body)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Assignment created', assignment: data });
});

app.delete('/api/assignments/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Assignment removed' });
});

// ========== STREAMS ==========
app.get('/api/streams', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { form } = req.query;
    console.log('GET /api/streams - form query:', form);
    
    let query = supabase.from('streams').select('*').order('form').order('name');
    if (form) query = query.eq('form', form);
    
    const { data: streams, error } = await query;

    console.log('GET /api/streams - data returned:', streams);
    console.log('GET /api/streams - error:', error);

    if (error) {
      console.error(error);
      return res.status(500).json([]);
    }

    if (!streams || streams.length === 0) return res.json([]);

    // Get subject_ids for each stream
    const streamIds = streams.map((s: any) => s.id);
    const { data: streamSubjects } = await supabase
      .from('stream_subjects')
      .select('stream_id, subject_id')
      .in('stream_id', streamIds);

    const subjectMap = new Map<number, number[]>();
    for (const s of streams) subjectMap.set(s.id, []);
    
    for (const ss of streamSubjects || []) {
      const arr = subjectMap.get(ss.stream_id);
      if (arr) arr.push(ss.subject_id);
    }

    const result = streams.map((s: any) => ({
      ...s,
      subject_ids: subjectMap.get(s.id) || []
    }));

    return res.json(Array.isArray(result) ? result : []);
  } catch (error) {
    console.error(error);
    return res.status(500).json([]);
  }
});

app.post('/api/streams', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data, error } = await supabase
    .from('streams')
    .insert(req.body)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Stream created', stream: data });
});

app.put('/api/streams/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data, error } = await supabase
    .from('streams')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Stream updated', stream: data });
});

app.put('/api/streams/:id/subjects', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { subject_ids } = req.body;
  const streamId = req.params.id;
  
  await supabase.from('stream_subjects').delete().eq('stream_id', streamId);
  
  if (subject_ids?.length) {
    const inserts = subject_ids.map((sid: number) => ({ stream_id: streamId, subject_id: sid }));
    await supabase.from('stream_subjects').insert(inserts);
  }
  
  res.json({ message: 'Stream subjects updated' });
});

app.delete('/api/streams/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  await supabase.from('stream_subjects').delete().eq('stream_id', req.params.id);
  await supabase.from('students').update({ stream_id: null }).eq('stream_id', req.params.id);
  const { error } = await supabase.from('streams').delete().eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Stream removed' });
});

// ========== TOPICS ==========
app.get('/api/topics', authenticateToken, async (req, res) => {
  const { subject_id } = req.query;
  let query = supabase.from('topics').select('*');
  if (subject_id) query = query.eq('subject_id', subject_id);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(Array.isArray(data) ? data.map((t: any) => ({ ...t, tested: t.tested || false })) : []);
});

app.get('/api/topics/test-counts', authenticateToken, async (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.json([]);
  
  const idArray = String(ids).split(',').map(Number).filter(n => Number.isFinite(n));
  if (idArray.length === 0) return res.json([]);
  
  const { data, error } = await supabase
    .from('topic_test_results')
    .select('topic_id, student_id, score, absent')
    .in('topic_id', idArray);
  
  if (error) return res.status(500).json({ error: error.message });
  
  const counts: Record<number, { total: number; entered: number; passed: number; failed: number }> = {};
  
  for (const id of idArray) {
    counts[id] = { total: 0, entered: 0, passed: 0, failed: 0 };
  }
  
  // Count total students per topic (need to get students assigned to subjects)
  // For now, count based on test results
  const topicStudentMap = new Map<number, Set<number>>();
  for (const r of (data || []) as any[]) {
    if (!topicStudentMap.has(r.topic_id)) topicStudentMap.set(r.topic_id, new Set());
    topicStudentMap.get(r.topic_id)!.add(r.student_id);
  }
  
  for (const r of data || []) {
    const c = counts[r.topic_id];
    if (c) {
      c.total = topicStudentMap.get(r.topic_id)?.size || 0;
      if (!r.absent) {
        c.entered++;
        if (r.score >= 50) c.passed++;
        else c.failed++;
      }
    }
  }
  
  const result = Object.entries(counts).map(([topic_id, c]) => ({
    topic_id: Number(topic_id),
    ...c
  }));
  
  res.json(result);
});

app.get('/api/topics/:id/students', authenticateToken, async (req, res) => {
  const { data: topic } = await supabase
    .from('topics')
    .select('subject_id')
    .eq('id', req.params.id)
    .single();
  
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  
  const { data: subject } = await supabase
    .from('subjects')
    .select('form')
    .eq('id', topic.subject_id)
    .single();
  
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('form', subject.form)
    .neq('form', 'Graduated')
    .order('full_name');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(Array.isArray(data) ? data : []);
});

app.get('/api/topics/:id/test-results', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('topic_test_results')
    .select('student_id, score, absent')
    .eq('topic_id', req.params.id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ results: data || [] });
});

app.post('/api/topics/:id/test-results', authenticateToken, async (req, res) => {
  const { results } = req.body;
  const topicId = req.params.id;
  
  const inserts = (results || []).map((r: any) => ({
    topic_id: topicId,
    student_id: r.student_id,
    score: r.absent ? null : (r.score === '' ? null : parseFloat(r.score)),
    absent: r.absent
  }));
  
  const { error } = await supabase.from('topic_test_results').upsert(inserts);
  if (error) return res.status(400).json({ error: error.message });
  
  res.json({ message: 'Test results saved' });
});

app.post('/api/topics', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('topics')
    .insert({ ...req.body, tested: false })
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Topic added', topic: data });
});

app.patch('/api/topics/:id', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('topics')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Topic updated', topic: data });
});

// ========== EXAMS ==========
app.get('/api/exams', authenticateToken, async (req, res) => {
  const { form, academic_year, type } = req.query;
  let query = supabase.from('exams').select('*').order('created_at', { ascending: false });
  
  if (form) query = query.eq('form', form);
  if (academic_year) query = query.eq('academic_year', academic_year);
  if (type) query = query.eq('type', type);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/exams', authenticateToken, async (req, res) => {
  if (req.userRole !== 'academic' && req.userRole !== 'headmaster') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data, error } = await supabase
    .from('exams')
    .insert({ ...req.body, created_by: req.userId })
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Exam created', exam: data });
});

app.put('/api/exams/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'academic' && req.userRole !== 'headmaster') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data, error } = await supabase
    .from('exams')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Exam updated', exam: data });
});

app.delete('/api/exams/:id', authenticateToken, async (req, res) => {
  if (req.userRole !== 'academic' && req.userRole !== 'headmaster') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const id = req.params.id;
  await supabase.from('exam_scores').delete().eq('exam_id', id);
  await supabase.from('student_exam_results').delete().eq('exam_id', id);
  await supabase.from('exam_subjects').delete().eq('exam_id', id);
  await supabase.from('exams').delete().eq('id', id);
  
  res.json({ message: 'Exam deleted' });
});

app.get('/api/exams/:id/subjects', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('exam_subjects')
    .select('*, subjects(name, code)')
    .eq('exam_id', req.params.id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/exams/:id/subjects', authenticateToken, async (req, res) => {
  if (req.userRole !== 'academic' && req.userRole !== 'headmaster') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { subject_ids, weight, pass_mark } = req.body;
  const examId = req.params.id;
  
  const inserts = (subject_ids || []).map((sid: number) => ({
    exam_id: examId,
    subject_id: sid,
    weight: weight || 1,
    pass_mark: pass_mark || 0
  }));
  
  const { error } = await supabase.from('exam_subjects').upsert(inserts);
  if (error) return res.status(400).json({ error: error.message });
  
  res.json({ message: 'Subjects added to exam' });
});

app.get('/api/exams/:id/students', authenticateToken, async (req, res) => {
  const { data: exam } = await supabase
    .from('exams')
    .select('form')
    .eq('id', req.params.id)
    .single();
  
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  
  const { data, error } = await supabase
    .from('students')
    .select('*, streams(name)')
    .eq('form', exam.form)
    .neq('form', 'Graduated')
    .order('full_name');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/exams/:id/scores', authenticateToken, async (req, res) => {
  const { subject_id } = req.query;
  let query = supabase
    .from('exam_scores')
    .select('*, students(full_name, gender), subjects(name, code)')
    .eq('exam_id', req.params.id);
  
  if (subject_id) query = query.eq('subject_id', subject_id);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/exams/:id/scores', authenticateToken, async (req, res) => {
  const { scores } = req.body;
  const examId = req.params.id;
  
  const inserts = (scores || []).map((s: any) => ({
    exam_id: examId,
    student_id: s.student_id,
    subject_id: s.subject_id,
    score: s.score,
    absent: s.absent || false
  }));
  
  const { error } = await supabase.from('exam_scores').upsert(inserts);
  if (error) return res.status(400).json({ error: error.message });
  
  res.json({ message: 'Scores saved' });
});

app.post('/api/exams/:id/process', authenticateToken, async (req, res) => {
  if (req.userRole !== 'academic' && req.userRole !== 'headmaster') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const examId = Number(req.params.id);
  
  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .single();
  
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  
  const { data: examSubjects } = await supabase
    .from('exam_subjects')
    .select('subject_id, weight')
    .eq('exam_id', examId);
  
  if (!examSubjects?.length) {
    return res.status(400).json({ error: 'No subjects configured for this exam' });
  }
  
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name, form, stream_id')
    .eq('form', exam.form)
    .neq('form', 'Graduated');
  
  const subjectWeights = new Map(examSubjects.map((s: any) => [s.subject_id, s.weight]));
  
  for (const st of students || []) {
    let totalMarks = 0;
    let totalWeight = 0;
    
    for (const [subId, weight] of subjectWeights) {
      const { data: scoreRow } = await supabase
        .from('exam_scores')
        .select('score, absent')
        .eq('exam_id', examId)
        .eq('student_id', st.id)
        .eq('subject_id', subId)
        .single();
      
      if (scoreRow && !scoreRow.absent && scoreRow.score !== null) {
        totalMarks += (scoreRow.score || 0) * (weight || 1);
        totalWeight += weight || 1;
      } else {
        totalWeight += weight || 1;
      }
    }
    
    const average = totalWeight > 0 ? Math.round((totalMarks / totalWeight) * 100) / 100 : 0;
    const { grade, division, points, remark } = getGrade(average);
    
    await supabase.from('student_exam_results').upsert({
      exam_id: examId,
      student_id: st.id,
      total_marks: totalMarks,
      average,
      grade,
      division,
      points,
      remark
    });
  }
  
  const { data: results } = await supabase
    .from('student_exam_results')
    .select('id, average')
    .eq('exam_id', examId)
    .order('average', { ascending: false });
  
  for (let i = 0; i < (results || []).length; i++) {
    await supabase
      .from('student_exam_results')
      .update({ position_class: i + 1 })
      .eq('id', results![i].id);
  }
  
  res.json({ message: 'Exam results processed', students: students?.length || 0 });
});

app.get('/api/exams/:id/results', authenticateToken, async (req, res) => {
  const examId = Number(req.params.id);
  
  const { data: exam } = await supabase
    .from('exams')
    .select('form')
    .eq('id', examId)
    .single();
  
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name, gender, form, streams(name)')
    .eq('form', exam.form)
    .neq('form', 'Graduated');
  
  const { data: examSubjects } = await supabase
    .from('exam_subjects')
    .select('*, subjects(name, code)')
    .eq('exam_id', examId);
  
  const { data: allScores } = await supabase
    .from('exam_scores')
    .select('*, students(id, full_name), subjects(id, name, code)')
    .eq('exam_id', examId);
  
  const { data: results } = await supabase
    .from('student_exam_results')
    .select('*, students(id, full_name, gender, form, streams(name))')
    .eq('exam_id', examId);
  
  const scoreMap = new Map();
  for (const sc of allScores || []) {
    if (!scoreMap.has(sc.student_id)) scoreMap.set(sc.student_id, {});
    scoreMap.get(sc.student_id)[sc.subjects?.code || 'SUB'] = sc.absent ? 'ABS' : (sc.score ?? '-');
  }
  
  const studentResults = (results || []).map((r: any) => ({
    ...r.students,
    average: r.average,
    grade: r.grade,
    division: r.division,
    points: r.points,
    position_class: r.position_class,
    remark: r.remark,
    scores: scoreMap.get(r.student_id) || {}
  }));
  
  res.json({
    subjects: examSubjects?.map((s: any) => s.subjects) || [],
    students: studentResults
  });
});

app.get('/api/exams/:id/division-summary', authenticateToken, async (req, res) => {
  const examId = Number(req.params.id);
  
  const { data: results } = await supabase
    .from('student_exam_results')
    .select('*, students(gender)')
    .eq('exam_id', examId);
  
  const summary: any = { F: {}, M: {}, T: {} };
  for (let d = 0; d <= 4; d++) {
    summary.F[d] = 0; summary.M[d] = 0; summary.T[d] = 0;
  }
  
  for (const r of results || []) {
    const g = r.students?.gender === 'Female' ? 'F' : 'M';
    summary[g][r.division] = (summary[g][r.division] || 0) + 1;
    summary.T[r.division] = (summary.T[r.division] || 0) + 1;
  }
  
  const total = summary.T[0] + summary.T[1] + summary.T[2] + summary.T[3] + summary.T[4];
  const passCount = total - summary.T[0];
  
  res.json({
    summary,
    totals: { total, passCount, passRate: total > 0 ? Math.round((passCount / total) * 100) : 0 }
  });
});

// ========== REPORTS ==========
app.get('/api/reports/teaching', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { form } = req.query;
  const { data: subjects } = await supabase.from('subjects').select('*');
  
  const report = await Promise.all(
    (subjects || []).filter((s: any) => !form || s.form === form).map(async (s: any) => {
      const { data: topics } = await supabase
        .from('topics')
        .select('status, tested')
        .eq('subject_id', s.id);
      
      const topicList = topics || [];
      return {
        form: s.form,
        code: s.code,
        subject: s.name,
        teacher: '',
        total_topics: topicList.length,
        completed_topics: topicList.filter((t: any) => t.status === 'completed').length,
        on_progress_topics: topicList.filter((t: any) => t.status === 'on_progress').length,
        pending_topics: topicList.filter((t: any) => t.status === 'pending').length,
        tested_topics: topicList.filter((t: any) => t.tested).length,
        coverage_percent: topicList.length > 0 ? Math.round((topicList.filter((t: any) => t.status === 'completed').length / topicList.length) * 100) : 0
      };
    })
  );
  
  res.json(report);
});

app.get('/api/reports/students', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { form } = req.query;
  let query = supabase
    .from('students')
    .select('id, full_name, gender, form, parent_phone, streams(name)');
  
  if (form) query = query.eq('form', form);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  
  res.json((data || []).map((s: any) => ({
    id: s.id,
    full_name: s.full_name,
    gender: s.gender,
    form: s.form,
    parent_phone: s.parent_phone || '',
    stream: s.streams?.name || '',
    stream_subject_count: 0,
    stream_subject_codes: ''
  })));
});

app.get('/api/reports/teachers', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { data, error } = await supabase
    .from('users')
    .select('*, assignments(subjects(name, code))')
    .in('role', ['teacher', 'academic', 'headmaster']);
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.json((data || []).map((u: any) => ({
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
    assigned_subjects: u.assignments?.map((a: any) => `${a.subjects?.code} ${a.subjects?.name}`).join('; ') || ''
  })));
});

// ========== SCHOOL SETTINGS ==========
app.get('/api/settings/school', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('school_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (error) return res.json({ school_name: 'Kitukutu Technical School', academic_year: '2026' });
  res.json(data);
});

app.put('/api/settings/school', authenticateToken, async (req, res) => {
  if (req.userRole !== 'headmaster' && req.userRole !== 'academic') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Use upsert to handle insert or update
  req.body.id = 1;
  const { data, error } = await supabase
    .from('school_settings')
    .upsert(req.body)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'School settings saved' });
});

// ========== CURRICULUM OVERVIEW ==========
app.get('/api/curriculum/overview', authenticateToken, async (req, res) => {
  const { form } = req.query;
  let query = supabase.from('subjects').select('*');
  if (form) query = query.eq('form', form);
  
  const { data: subjects } = await query;
  
  const rows = await Promise.all(
    (subjects || []).map(async (s: any) => {
      const { data: topics } = await supabase
        .from('topics')
        .select('status, tested')
        .eq('subject_id', s.id);
      
      const topicList = topics || [];
      return {
        id: s.id,
        name: s.name,
        code: s.code,
        form: s.form,
        has_practical: s.has_practical,
        total_topics: topicList.length,
        completed_topics: topicList.filter((t: any) => t.status === 'completed').length,
        on_progress_topics: topicList.filter((t: any) => t.status === 'on_progress').length,
        pending_topics: topicList.filter((t: any) => t.status === 'pending').length,
        tested_topics: topicList.filter((t: any) => t.tested).length
      };
    })
  );
  
  res.json(rows);
});

// ========== START SERVER ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Supabase:', supabaseUrl ? 'Configured' : 'Not configured');
});

export default app;
