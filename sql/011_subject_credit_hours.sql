-- Subject credit hours for credit-weighted GPA (Gradesheet Back reference).
-- GPA = SUM(grade point x credit hour) / SUM(credit hour).
-- Missing file pre-migration is handled by the app (it retries writes and
-- the subjects fetch without the credit_hour column), so this just adds the
-- column. Existing subjects default to 1 credit hour, which keeps the GPA
-- equal to the old simple average until an admin edits them.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS credit_hour numeric NOT NULL DEFAULT 1;