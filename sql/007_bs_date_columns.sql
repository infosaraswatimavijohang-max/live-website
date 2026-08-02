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
--
-- Each ALTER is guarded with a to_regclass check so a table that
-- doesn't exist in this project is skipped instead of aborting the
-- whole script with error 42P01. The script is safe to re-run.
-- ============================================================

DO $$ BEGIN
  IF to_regclass('public.admissions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS dob_bs TEXT';
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.notices') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS date_bs TEXT';
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.events') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.events ADD COLUMN IF NOT EXISTS date_bs TEXT';
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.students') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.students ADD COLUMN IF NOT EXISTS dob_bs TEXT';
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.teachers') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS joining_date_bs TEXT';
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.assignments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS due_date_bs TEXT';
  END IF;
END $$;
