-- PERFORMANCE INDEXES for Shree Saraswati Exam Portal
-- Run once in Supabase SQL Editor after tables exist.

-- Ensure the images table exists before creating indexes on it
CREATE TABLE IF NOT EXISTS images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_type text NOT NULL,
  owner_id text NOT NULL,
  public_url text DEFAULT ''
);

-- Students: login lookup + class roster queries
CREATE INDEX IF NOT EXISTS idx_students_username ON students(username);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_username_key ON students(username);

-- Teachers: login lookup + sorting
CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_username_key ON teachers(username);

-- Marks: exam-specific fetches + upsert conflict target
CREATE INDEX IF NOT EXISTS idx_marks_exam_id ON marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam_student_subject ON marks(exam_id, student_id, subject_id);

-- Subjects: class-scoped fetches + ordering
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);

-- Exams: default ordering
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at);

-- Images: polymorphic owner lookup
CREATE INDEX IF NOT EXISTS idx_images_owner ON images(owner_type, owner_id);

-- KV: fast key lookup (already has PK if key is primary key)
CREATE INDEX IF NOT EXISTS idx_kv_key ON exam_portal_kv(key);
