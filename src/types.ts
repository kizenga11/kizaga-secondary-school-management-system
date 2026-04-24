export type UserRole = 'headmaster' | 'academic' | 'teacher';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  tsc_no?: string;
  phone?: string;
}

export interface Student {
  id: number;
  full_name: string;
  gender: string;
  form: string;
  parent_phone?: string;
  stream_id?: number | null;
  stream_name?: string | null;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  form: string;
  has_practical: boolean;
}

export interface Topic {
  id: number;
  subject_id: number;
  name: string;
  competence?: string;
  specific_competence?: string;
  status: 'pending' | 'on_progress' | 'completed';
  tested?: boolean;
  deadline?: string;
}

export interface Exam {
  id: number;
  name: string;
  type: string;
  date: string;
}

export interface Result {
  id: number;
  student_id: number;
  student_name?: string;
  exam_id: number;
  subject_id: number;
  component?: 'theory' | 'practical';
  score: number | null;
  absent?: number;
}
