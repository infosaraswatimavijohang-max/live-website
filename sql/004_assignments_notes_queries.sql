-- ============================================================
-- ASSIGNMENTS & NOTES/NOTICES — Queries with Teacher Info
-- Shree Saraswati Secondary School Portal
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. VIEW: Assignments with teacher name, class label, subject name
CREATE OR REPLACE VIEW view_assignments AS
SELECT
  a.id,
  a.title,
  a.description,
  a.due_date,
  a.file_url,
  a.file_name,
  a.created_at,
  t.id AS teacher_id,
  t.full_name AS teacher_name,
  t.phone AS teacher_phone,
  c.id AS class_id,
  c.class_label AS class_name,
  c.grade AS class_grade,
  s.id AS subject_id,
  s.subject_name AS subject_name,
  s.subject_code
FROM assignments a
LEFT JOIN teachers t ON t.id = a.teacher_id
LEFT JOIN classes c ON c.id = a.class_id
LEFT JOIN subjects s ON s.id = a.subject_id
ORDER BY a.created_at DESC;

-- 2. VIEW: Notes/Notices with teacher name, class label, subject name
CREATE OR REPLACE VIEW view_notes AS
SELECT
  n.id,
  n.title,
  n.content,
  n.file_url,
  n.file_name,
  n.created_at,
  t.id AS teacher_id,
  t.full_name AS teacher_name,
  t.phone AS teacher_phone,
  c.id AS class_id,
  c.class_label AS class_name,
  c.grade AS class_grade,
  s.id AS subject_id,
  s.subject_name AS subject_name,
  s.subject_code
FROM notes n
LEFT JOIN teachers t ON t.id = n.teacher_id
LEFT JOIN classes c ON c.id = n.class_id
LEFT JOIN subjects s ON s.id = n.subject_id
ORDER BY n.created_at DESC;

-- 3. QUERY: Get all assignments for a specific class (teacher name + date/time)
-- First find the class UUID:
--   SELECT id, class_label FROM classes;
-- Then use it below (replace the uuid value):
-- SELECT
--   a.title,
--   t.full_name AS posted_by_teacher,
--   a.due_date,
--   a.created_at AS posted_at,
--   s.subject_name,
--   a.description
-- FROM assignments a
-- LEFT JOIN teachers t ON t.id = a.teacher_id
-- LEFT JOIN subjects s ON s.id = a.subject_id
-- WHERE a.class_id = '00000000-0000-0000-0000-000000000000'  -- ← replace with actual UUID
-- ORDER BY a.created_at DESC;

-- 4. QUERY: Get all notes/notices for a specific class (teacher name + date/time)
-- Same as above — find the class UUID first, then uncomment and run:
-- SELECT
--   n.title,
--   t.full_name AS posted_by_teacher,
--   n.created_at AS posted_at,
--   s.subject_name,
--   n.content
-- FROM notes n
-- LEFT JOIN teachers t ON t.id = n.teacher_id
-- LEFT JOIN subjects s ON s.id = n.subject_id
-- WHERE n.class_id = '00000000-0000-0000-0000-000000000000'  -- ← replace with actual UUID
-- ORDER BY n.created_at DESC;

-- 5. QUERY: Count assignments & notes per teacher (activity report)
SELECT
  t.full_name AS teacher_name,
  (SELECT COUNT(*) FROM assignments a WHERE a.teacher_id = t.id) AS assignment_count,
  (SELECT COUNT(*) FROM notes n WHERE n.teacher_id = t.id) AS note_count,
  (SELECT COUNT(*) FROM assignments a WHERE a.teacher_id = t.id) +
  (SELECT COUNT(*) FROM notes n WHERE n.teacher_id = t.id) AS total_posted
FROM teachers t
ORDER BY total_posted DESC;

-- 6. QUERY: Recent activity feed — last 20 posts (assignments + notes combined)
(SELECT
  'Assignment' AS type,
  a.title,
  t.full_name AS teacher_name,
  a.created_at AS posted_at,
  c.class_label AS class_name
FROM assignments a
LEFT JOIN teachers t ON t.id = a.teacher_id
LEFT JOIN classes c ON c.id = a.class_id)
UNION ALL
(SELECT
  'Note/Notice' AS type,
  n.title,
  t.full_name AS teacher_name,
  n.created_at AS posted_at,
  c.class_label AS class_name
FROM notes n
LEFT JOIN teachers t ON t.id = n.teacher_id
LEFT JOIN classes c ON c.id = n.class_id)
ORDER BY posted_at DESC
LIMIT 20;

-- 7. QUERY: Update review — show teacher name and full date/time for assignments
--            (mirrors the new portal UI columns)
SELECT
  a.title,
  t.full_name AS teacher_name,
  c.class_label AS class,
  s.subject_name AS subject,
  a.due_date,
  TO_CHAR(a.created_at AT TIME ZONE 'UTC', 'Mon DD, YYYY HH:MI AM') AS posted_at_formatted
FROM assignments a
LEFT JOIN teachers t ON t.id = a.teacher_id
LEFT JOIN classes c ON c.id = a.class_id
LEFT JOIN subjects s ON s.id = a.subject_id
ORDER BY a.created_at DESC;

-- 8. QUERY: Update review — show teacher name and full date/time for notes/notices
SELECT
  n.title,
  t.full_name AS teacher_name,
  c.class_label AS class,
  s.subject_name AS subject,
  TO_CHAR(n.created_at AT TIME ZONE 'UTC', 'Mon DD, YYYY HH:MI AM') AS posted_at_formatted,
  LEFT(n.content, 100) AS content_preview
FROM notes n
LEFT JOIN teachers t ON t.id = n.teacher_id
LEFT JOIN classes c ON c.id = n.class_id
LEFT JOIN subjects s ON s.id = n.subject_id
ORDER BY n.created_at DESC;
