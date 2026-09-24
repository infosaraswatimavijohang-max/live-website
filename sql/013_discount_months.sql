-- Month-scoped discounts (extension of the per-category model from 012):
-- each student_discounts row may apply either for the WHOLE YEAR
-- (discount_months = 'all') or only for specific BS months, stored as
-- comma-separated month numbers 1-12 (1 = Baisakh ... 12 = Chaitra).
--
-- Semantics (enforced in Login_portal.html, not in SQL):
--   * Month scope affects only MONTHLY-frequency fee heads. Yearly/event
--     fees ignore discount_months entirely.
--   * Undefined/empty/'all' => whole-year discount (previous behaviour).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_discounts' AND column_name = 'discount_months'
  ) THEN
    ALTER TABLE student_discounts ADD COLUMN discount_months text DEFAULT 'all';
  END IF;
END $$;