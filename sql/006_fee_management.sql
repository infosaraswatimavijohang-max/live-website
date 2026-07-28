/* =========================================================================
   FEE MANAGEMENT — Account module tables
   Run in Supabase SQL Editor after the other migrations.
   ========================================================================= */

/* Fee categories (master fee types)
   scope: school = same for all students across all classes
          class  = uniform per class (amount in class_fees)
          student = individual per student (amount in student_fees)
   amount: default amount for school-wide fees (ignored for class/student scope)
*/
CREATE TABLE IF NOT EXISTS fee_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('monthly','yearly','event')),
  scope text NOT NULL DEFAULT 'school' CHECK (scope IN ('school','class','student')),
  amount numeric(10,2) DEFAULT 0,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

/* Migrate existing rows if the old is_uniform column still exists */
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_name='fee_categories' AND column_name='is_uniform') THEN
    ALTER TABLE fee_categories RENAME COLUMN is_uniform TO scope_old;
    ALTER TABLE fee_categories ADD COLUMN scope text DEFAULT 'school';
    UPDATE fee_categories SET scope = CASE WHEN scope_old = true THEN 'class' ELSE 'student' END;
    ALTER TABLE fee_categories ALTER COLUMN scope SET NOT NULL;
    ALTER TABLE fee_categories DROP COLUMN scope_old;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_name='fee_categories' AND column_name='amount') THEN
    ALTER TABLE fee_categories ADD COLUMN amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

/* Class-wise fee amounts for class-scoped fees (monthly fee same for all in a class) */
CREATE TABLE IF NOT EXISTS class_fees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  fee_category_id uuid REFERENCES fee_categories(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  academic_year text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, fee_category_id, academic_year)
);

/* Per-student fee amounts for student-scoped fees (transport varies per student) */
CREATE TABLE IF NOT EXISTS student_fees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  fee_category_id uuid REFERENCES fee_categories(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  academic_year text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, fee_category_id, academic_year)
);

/* Fee collections — one row per student per fee category per month */
CREATE TABLE IF NOT EXISTS fee_collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  fee_category_id uuid REFERENCES fee_categories(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  bs_month integer CHECK (bs_month BETWEEN 1 AND 12),
  academic_year text DEFAULT '',
  fiscal_year text DEFAULT '',
  bill_no integer NOT NULL,
  collected_by uuid REFERENCES teachers(id),
  collected_at timestamptz DEFAULT now(),
  payment_method text DEFAULT 'cash',
  remarks text DEFAULT ''
);

/* Bill number sequence — one row per fiscal year */
CREATE TABLE IF NOT EXISTS bill_sequence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year text NOT NULL UNIQUE,
  last_number integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

/* Indexes for common queries */
CREATE INDEX IF NOT EXISTS idx_fee_collections_student ON fee_collections(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_collections_bill ON fee_collections(bill_no, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_fee_collections_date ON fee_collections(collected_at);
CREATE INDEX IF NOT EXISTS idx_class_fees_class ON class_fees(class_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
