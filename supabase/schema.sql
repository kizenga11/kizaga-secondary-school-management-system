-- ============================================
-- SUPABASE DATABASE SCHEMA - Kitukutu Technical School
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- IMPORTANT: Use BIGINT for all IDs, not UUID
-- ============================================

-- ============================================
-- USERS TABLE (Staff/Teachers)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID UNIQUE,  -- Links to auth.users
  full_name TEXT NOT NULL,
  tsc_no TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK(role IN ('headmaster', 'academic', 'teacher')) DEFAULT 'teacher',
  gender TEXT,
  education_level TEXT,
  studied_subjects TEXT,
  teaching_subjects TEXT,
  cheque_no TEXT,
  employment_date DATE,
  confirmation_date DATE,
  retirement_date DATE,
  salary_scale TEXT,
  date_of_birth DATE,
  nida_no TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.students (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female')),
  form TEXT NOT NULL CHECK(form IN ('Form 1', 'Form 2', 'Form 3', 'Form 4', 'Graduated')),
  parent_phone TEXT,
  stream_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STREAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.streams (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  form TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(form, name)
);

-- ============================================
-- SUBJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  form TEXT NOT NULL,
  has_practical BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STREAM SUBJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.stream_subjects (
  stream_id BIGINT NOT NULL,
  subject_id BIGINT NOT NULL,
  PRIMARY KEY (stream_id, subject_id),
  FOREIGN KEY (stream_id) REFERENCES public.streams(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);

-- ============================================
-- ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_id BIGINT NOT NULL,
  subject_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id),
  FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);

-- ============================================
-- SCHOOL SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.school_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY CHECK(id = 1),
  school_name TEXT NOT NULL DEFAULT 'Kitukutu Technical School',
  academic_year TEXT NOT NULL DEFAULT '2026',
  address TEXT,
  region TEXT,
  district TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TOPICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.topics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  competence TEXT,
  specific_competence TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'on_progress', 'completed')),
  tested BOOLEAN DEFAULT false,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);

-- ============================================
-- TOPIC TEST RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.topic_test_results (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  score REAL,
  absent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(topic_id, student_id),
  FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
);

-- ============================================
-- EXAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exams (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  form TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  term TEXT,
  start_date DATE,
  end_date DATE,
  is_composed BOOLEAN DEFAULT false,
  weight REAL DEFAULT 1.0,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- ============================================
-- EXAM SUBJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exam_id BIGINT NOT NULL,
  subject_id BIGINT NOT NULL,
  weight REAL DEFAULT 1.0,
  pass_mark REAL DEFAULT 0,
  UNIQUE(exam_id, subject_id),
  FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);

-- ============================================
-- EXAM SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_scores (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exam_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  subject_id BIGINT NOT NULL,
  score REAL,
  absent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_id, student_id, subject_id),
  FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);

-- ============================================
-- STUDENT EXAM RESULTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.student_exam_results (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exam_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  total_marks REAL,
  average REAL,
  grade TEXT,
  division INTEGER,
  points INTEGER,
  position_class INTEGER,
  position_stream INTEGER,
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_id, student_id),
  FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
);

-- ============================================
-- EXAM COMPOSITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_compositions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  form TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  composition_json TEXT NOT NULL,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- ============================================
-- EXAM TRENDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_trends (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id BIGINT NOT NULL,
  subject_id BIGINT NOT NULL,
  from_exam_id BIGINT NOT NULL,
  to_exam_id BIGINT NOT NULL,
  avg_change REAL,
  position_change INTEGER,
  division_change INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_topics_updated_at ON public.topics;
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_trends ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Using BIGINT IDs, NOT auth.uid())
-- ============================================

-- Users: Anyone can view, only authenticated can insert/update
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert" ON public.users;
CREATE POLICY "Users can insert" ON public.users FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update" ON public.users;
CREATE POLICY "Users can update" ON public.users FOR UPDATE USING (auth.role() = 'authenticated');

-- Students
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
CREATE POLICY "Authenticated users can view students" ON public.students FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Academic can insert students" ON public.students;
CREATE POLICY "Academic can insert students" ON public.students FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Academic can update students" ON public.students;
CREATE POLICY "Academic can update students" ON public.students FOR UPDATE USING (auth.role() = 'authenticated');

-- All other tables: Anyone can view/authenticated can modify
CREATE POLICY "View policy" ON public.streams FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.stream_subjects FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.school_settings FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.topics FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.topic_test_results FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.exams FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.exam_subjects FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.exam_scores FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.student_exam_results FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.exam_compositions FOR SELECT USING (true);
CREATE POLICY "View policy" ON public.exam_trends FOR SELECT USING (true);

-- ============================================
-- DEFAULT DATA
-- ============================================

INSERT INTO public.school_settings (school_name, academic_year)
VALUES ('Kitukutu Technical School', '2026')
ON CONFLICT DO NOTHING;

INSERT INTO public.users (full_name, email, role)
VALUES ('Headmaster Kitukutu', 'admin@kitukutu.sc.tz', 'headmaster')
ON CONFLICT DO NOTHING;