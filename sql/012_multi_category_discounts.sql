-- Per-category discounts: a student may now have MULTIPLE discount rows per
-- fiscal year, each targeting a different fee head (or a frequency scope /
-- 'all'), each with its own discount_percent / discount_amount.
--
-- The original migration (006) created student_discounts with
-- UNIQUE(student_id, academic_year), which limited a student to exactly one
-- discount. Drop that constraint so the per-category model works.
--
-- App-relevant semantics: for a given fee category the app sums the
-- discount_percent of every matching row (capped at 100) and the
-- discount_amount of every matching row, so overlapping scopes stack.
ALTER TABLE student_discounts DROP CONSTRAINT IF EXISTS student_discounts_student_id_academic_year_key;

-- Defensive fallback: also drop any other unique constraint that covers
-- (student_id, academic_year) in case it was created under a custom name.
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'student_discounts'::regclass
    AND contype = 'u'
    AND conkey @> (
      SELECT array_agg(attnum)
      FROM pg_attribute
      WHERE attrelid = 'student_discounts'::regclass
        AND attname IN ('student_id','academic_year')
    )
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE student_discounts DROP CONSTRAINT %I', cname);
  END IF;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;