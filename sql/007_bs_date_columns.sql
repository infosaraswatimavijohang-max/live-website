-- ============================================================
-- BS (NEPALI) DATE COLUMNS — stores the Bikram Sambat date
-- alongside the English (AD) date on every date field.
-- Shree Saraswati Secondary School Portal
-- Run in Supabase SQL Editor
--
-- The exam portal also saves BS dates, but those ride inside the
-- existing `exams.subject_marks` JSONB blob (_startDateBs,
-- _endDateBs, _publishFromBs, _publishUntilBs) so no columns are
-- needed on the `exams` table.
-- ============================================================

ALTER TABLE admissions   ADD COLUMN IF NOT EXISTS dob_bs       TEXT;
ALTER TABLE notices      ADD COLUMN IF NOT EXISTS date_bs      TEXT;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS date_bs      TEXT;
ALTER TABLE students     ADD COLUMN IF NOT EXISTS dob_bs       TEXT;
ALTER TABLE teachers     ADD COLUMN IF NOT EXISTS joining_date_bs TEXT;
ALTER TABLE assignments  ADD COLUMN IF NOT EXISTS due_date_bs  TEXT;
