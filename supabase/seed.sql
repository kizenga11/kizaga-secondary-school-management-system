-- ============================================
-- SEED DATA - Kitukutu Technical School
-- ============================================
-- Run this after schema.sql in Supabase SQL Editor

-- 1. Create Headmaster (create in Supabase Auth first, then link here)
-- First go to Supabase Dashboard -> Authentication -> Users -> Add User
-- Then insert the user_id from Auth here:

-- Example (replace with actual auth.users.uuid):
INSERT INTO public.users (user_id, full_name, email, role, gender, education_level)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Headmaster Kitukutu', 'admin@kitukutu.sc.tz', 'headmaster', 'Male', 'Degree'),
  ('22222222-2222-2222-2222-222222222222', 'Academic Manager', 'academic@kitukutu.sc.tz', 'academic', 'Male', 'Degree'),
  ('33333333-3333-3333-3333-333333333333', 'Mrs. Science Teacher', 'teacher@kitukutu.sc.tz', 'teacher', 'Female', 'Degree');

-- 2. Create Sample Students
INSERT INTO public.students (full_name, gender, form, parent_phone) VALUES
('Ahmed Hassan', 'Male', 'Form 1', '0755123456'),
('Fatima Ali', 'Female', 'Form 1', '0755987654'),
('Emmanuel John', 'Male', 'Form 1', '0755111222'),
('Grace Michael', 'Female', 'Form 2', '0755333444'),
('Brian Daniel', 'Male', 'Form 2', '0755555666'),
('Mary Robert', 'Female', 'Form 3', '0755777888'),
('Joseph Peter', 'Male', 'Form 3', '0755999900'),
('Sarah Paul', 'Female', 'Form 4', '0755131313');

-- 3. Create Streams
INSERT INTO public.streams (form, name) VALUES
('Form 1', 'A'),
('Form 1', 'B'),
('Form 2', 'A'),
('Form 2', 'B'),
('Form 3', 'A'),
('Form 3', 'B'),
('Form 4', 'A'),
('Form 4', 'B');

-- 4. Create Subjects
INSERT INTO public.subjects (name, code, form, has_practical) VALUES
('Physics', 'PHYS', 'Form 1', true),
('Chemistry', 'CHEM', 'Form 1', true),
('Biology', 'BIOS', 'Form 1', true),
('Mathematics', 'MATH', 'Form 1', false),
('Kiswahili', 'KISW', 'Form 1', false),
('English', 'ENG', 'Form 1', false),
('Geography', 'GEO', 'Form 1', false),
('History', 'BHIST', 'Form 1', false),
('Civics', 'CIV', 'Form 1', false),
('Physics', 'PHYS', 'Form 2', true),
('Chemistry', 'CHEM', 'Form 2', true),
('Biology', 'BIOS', 'Form 2', true),
('Mathematics', 'MATH', 'Form 2', false),
('Kiswahili', 'KISW', 'Form 2', false),
('English', 'ENG', 'Form 2', false);

-- 5. Create Topics (sample)
INSERT INTO public.topics (subject_id, name, competence, specific_competence, status) VALUES
(1, 'Introduction to Physics', 'Understanding physical phenomena', 'Measurements and units', 'completed'),
(1, 'Motion', 'Describe motion', 'Speed, velocity and acceleration', 'on_progress'),
(2, 'Introduction to Chemistry', 'Understand matter', 'States of matter', 'completed'),
(3, 'Classification of Living Things', 'Identify organisms', 'Kingdoms and habitats', 'completed'),
(4, 'Numbers', 'Handle numbers', 'Operations and fractions', 'completed');

-- 6. Create School Settings
UPDATE public.school_settings 
SET school_name = 'Kitukutu Technical School', 
    academic_year = '2026',
    address = 'P.O. Box 123, Kitukutu',
    region = 'Manyara',
    district = 'Kitukutu'
WHERE id = 1;

-- 7. Assign Teachers to Subjects (sample)
INSERT INTO public.assignments (teacher_id, subject_id)
SELECT u.id, s.id
FROM users u, subjects s
WHERE u.role = 'teacher' AND s.form = 'Form 1'
LIMIT 3;

SELECT 'Seed data created successfully!' as message;