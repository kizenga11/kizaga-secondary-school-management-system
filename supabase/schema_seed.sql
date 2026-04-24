-- ============================================
-- SEED DATA - Kitukutu Technical School
-- ============================================
-- IMPORTANT: Run schema.sql first!

-- 1. Create Streams (no auth needed)
INSERT INTO public.streams (form, name) VALUES
('Form 1', 'A'), ('Form 1', 'B'),
('Form 2', 'A'), ('Form 2', 'B'),
('Form 3', 'A'), ('Form 3', 'B'),
('Form 4', 'A'), ('Form 4', 'B');

-- 2. Create Subjects
INSERT INTO public.subjects (name, code, form, has_practical) VALUES
-- Form 1
('Physics', 'PHYS', 'Form 1', true),
('Chemistry', 'CHEM', 'Form 1', true), 
('Biology', 'BIOS', 'Form 1', true),
('Mathematics', 'MATH', 'Form 1', false),
('Kiswahili', 'KISW', 'Form 1', false),
('English', 'ENG', 'Form 1', false),
('Geography', 'GEO', 'Form 1', false),
('History', 'BHIST', 'Form 1', false),
('Civics', 'CIV', 'Form 1', false),
-- Form 2
('Physics', 'PHYS', 'Form 2', true),
('Chemistry', 'CHEM', 'Form 2', true),
('Biology', 'BIOS', 'Form 2', true),
('Mathematics', 'MATH', 'Form 2', false),
('Kiswahili', 'KISW', 'Form 2', false),
('English', 'ENG', 'Form 2', false);

-- 3. Create Sample Students
INSERT INTO public.students (full_name, gender, form, parent_phone) VALUES
-- Form 1
('John Ahmed', 'Male', 'Form 1', '0755123456'),
('Mary Hassan', 'Female', 'Form 1', '0755987654'),
('Emmanuel Daniel', 'Male', 'Form 1', '0755111222'),
('Grace Francis', 'Female', 'Form 1', '0755333444'),
('Peter Michael', 'Male', 'Form 1', '0755555666'),
-- Form 2
('Sarah Joseph', 'Female', 'Form 2', '0755777888'),
('James Robert', 'Male', 'Form 2', '0755999900'),
('Esther Paul', 'Female', 'Form 2', '0755131313'),
('David Wilson', 'Male', 'Form 2', '0755242424');

-- 4. Create Sample Topics
INSERT INTO public.topics (subject_id, name, competence, status) VALUES
(1, 'Introduction to Physics', 'Understanding physical phenomena', 'completed'),
(1, 'Motion and Speed', 'Describe motion concepts', 'on_progress'),
(2, 'Introduction to Chemistry', 'Understanding matter', 'completed'),
(3, 'Classification of Living Things', 'Identify organisms', 'completed'),
(4, 'Basic Mathematics', 'Handle numbers and operations', 'completed');

-- 5. Update School Settings
UPDATE public.school_settings 
SET school_name = 'Kitukutu Technical School',
    academic_year = '2026',
    address = 'P.O. Box 123, Kitukutu',
    region = 'Manyara',
    district = 'Kitukutu'
WHERE id = 1;