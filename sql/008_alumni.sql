-- ============================================================
-- ALUMNI TABLES — records for students/staff who passed out or
-- left the school. Shree Saraswati Secondary School Portal
-- Run in Supabase SQL Editor after the other migrations.
--
-- When an admin clicks "Leave School" on a student or staff
-- member (in the Students / Teaching & Non-Teaching Staff tabs
-- of Login_portal.html), the record is COPIED into these tables
-- (with a left_on timestamp) and then REMOVED from the active
-- `students` / `teachers` tables. The Alumni tab displays the
-- contents of these two tables.
-- ============================================================

/* Alumni students — mirrors the active `students` table's key
   fields, frozen at the moment the student left. */
CREATE TABLE IF NOT EXISTS alumni_students (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid,              -- original students.id (may be re-used)
  full_name text NOT NULL DEFAULT '',
  roll text DEFAULT '',
  class_id uuid,                -- last class (references classes; nullable if class removed)
  emis_id text DEFAULT '',
  dob text DEFAULT '',
  dob_bs text DEFAULT '',
  gender text DEFAULT '',
  father_name text DEFAULT '',
  mother_name text DEFAULT '',
  guardian_contact text DEFAULT '',
  address text DEFAULT '',
  blood_group text DEFAULT '',
  photo_url text DEFAULT '',    -- copied student photo (base64 data URL)
  left_on timestamptz DEFAULT now(),  -- when they moved to Alumni
  created_at timestamptz DEFAULT now()
);

/* Alumni teachers — mirrors the active `teachers` table's key
   fields plus in-app category (teaching / non-teaching) and
   department, frozen at the moment the staff member left. */
CREATE TABLE IF NOT EXISTS alumni_teachers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid,              -- original teachers.id (may be re-used)
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  qualification text DEFAULT '',
  designation text DEFAULT '',
  department text DEFAULT '',
  category text DEFAULT 'teaching',  -- 'teaching' | 'non-teaching'
  joining_date text DEFAULT '',
  joining_date_bs text DEFAULT '',
  photo_url text DEFAULT '',    -- copied staff photo (base64 data URL)
  left_on timestamptz DEFAULT now(),  -- when they moved to Alumni
  created_at timestamptz DEFAULT now()
);

/* Public read access so the (client-side) Alumni tab can load them. */
ALTER TABLE public.alumni_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_teachers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alumni_students' AND policyname='alumni_students_public_all') THEN
    CREATE POLICY alumni_students_public_all ON public.alumni_students FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alumni_teachers' AND policyname='alumni_teachers_public_all') THEN
    CREATE POLICY alumni_teachers_public_all ON public.alumni_teachers FOR ALL USING (true);
  END IF;
END $$;