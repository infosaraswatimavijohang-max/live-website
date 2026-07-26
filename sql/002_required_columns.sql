-- REQUIRED COLUMNS for Shree Saraswati Exam Portal
-- Run once in Supabase SQL Editor.

-- Login credentials on students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url text;

-- Login credentials on teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo_url text;

-- Class teacher assignment (jsonb array of class ids)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS class_teacher_of jsonb DEFAULT '[]'::jsonb;
