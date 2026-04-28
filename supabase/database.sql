-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.assignments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  teacher_id bigint NOT NULL,
  subject_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id),
  CONSTRAINT assignments_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.exam_scores (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  exam_id bigint,
  student_id bigint,
  subject_id bigint,
  score real,
  CONSTRAINT exam_scores_pkey PRIMARY KEY (id),
  CONSTRAINT exam_scores_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT exam_scores_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT exam_scores_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.exams (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  form text NOT NULL,
  created_by bigint,
  CONSTRAINT exams_pkey PRIMARY KEY (id),
  CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.results (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  student_id bigint,
  exam_id bigint,
  subject_id bigint,
  score numeric,
  component text DEFAULT 'theory'::text,
  absent boolean DEFAULT false,
  CONSTRAINT results_pkey PRIMARY KEY (id),
  CONSTRAINT results_student_fk FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT results_exam_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id),
  CONSTRAINT results_subject_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.school_settings (
  id bigint NOT NULL DEFAULT 1 CHECK (id = 1),
  school_name text NOT NULL DEFAULT 'Kitukutu Technical School'::text,
  academic_year text NOT NULL DEFAULT '2026'::text,
  address text,
  phone text,
  email text,
  region text,
  district text,
  ward text,
  postal_code text,
  website text,
  motto text,
  vision text,
  mission text,
  establishment_year text,
  school_type text,
  registration_number text,
  bank_name text,
  bank_account text,
  headmaster_name text,
  headmaster_phone text,
  academic_head_name text,
  academic_head_phone text,
  logo_url text,
  CONSTRAINT school_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.stream_subjects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  stream_id bigint NOT NULL,
  subject_id bigint NOT NULL,
  CONSTRAINT stream_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT stream_subjects_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id),
  CONSTRAINT stream_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.streams (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  form text NOT NULL,
  name text NOT NULL,
  CONSTRAINT streams_pkey PRIMARY KEY (id)
);
CREATE TABLE public.students (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  student_id text UNIQUE,
  full_name text NOT NULL,
  gender text,
  form text,
  stream_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  first_name text,
  middle_name text,
  last_name text,
  date_of_birth date,
  parent_name text,
  parent_phone text,
  address text,
  status text DEFAULT 'active'::text,
  class_name text,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.streams(id)
);
CREATE TABLE public.subjects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  form text NOT NULL,
  has_practical boolean DEFAULT false,
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.topic_test_results (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  topic_id bigint NOT NULL,
  student_id bigint NOT NULL,
  score numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT topic_test_results_pkey PRIMARY KEY (id),
  CONSTRAINT topic_test_results_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id),
  CONSTRAINT topic_test_results_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);
CREATE TABLE public.topics (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  subject_id bigint NOT NULL,
  name text NOT NULL,
  competence text,
  specific_competence text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'on_progress'::text, 'completed'::text])),
  tested boolean DEFAULT false,
  deadline date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT topics_pkey PRIMARY KEY (id),
  CONSTRAINT topics_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
);
CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'teacher'::text CHECK (role = ANY (ARRAY['headmaster'::text, 'academic'::text, 'teacher'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cheque_no text,
  phone text,
  education_level text,
  studied_subjects text,
  teaching_subjects text,
  employment_date date,
  confirmation_date date,
  retirement_date date,
  salary_scale text,
  nida_no text,
  date_of_birth date,
  gender text,
  tsc_no text UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.student_subjects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  student_id bigint NOT NULL,
  subject_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_subjects_pkey PRIMARY KEY (id),
  CONSTRAINT student_subjects_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  CONSTRAINT student_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);