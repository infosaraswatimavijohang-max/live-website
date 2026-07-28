/* =========================================================================
   FEE MANAGEMENT — Account module tables
   Run in Supabase SQL Editor after the other migrations.
   ========================================================================= */

/* Fee categories (master fee types) */
CREATE TABLE IF NOT EXISTS fee_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('monthly','yearly','event')),
  is_uniform boolean DEFAULT true,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

/* Class-wise fee amounts for uniform fees (monthly fee same for all in a class) */
CREATE TABLE IF NOT EXISTS class_fees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  fee_category_id uuid REFERENCES fee_categories(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  academic_year text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_id, fee_category_id, academic_year)
);

/* Per-student fee amounts for non-uniform fees (transport varies per student) */
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
