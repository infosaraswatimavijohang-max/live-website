-- =========================================================================
-- SCHOOL DOCUMENTS — Backup storage for class ledgers, gradesheets,
-- invoices, exam papers, and other school documents.
-- Shree Saraswati Secondary School Portal
-- Run in Supabase SQL Editor after the other migrations (sql/009_exam_documents.sql).
--
-- The Backup tab in Login_portal.html lets all teaching staff upload
-- files (PDF, DOCX, PNG, JPG, etc.) and control who can see them:
--   - public: everyone can view
--   - private: only the uploader + admin
--   - class: specific class students/teachers + admin
--   - student: specific student + admin
-- =========================================================================

/* Storage bucket for school documents (PDF, DOCX, images, etc.). */
INSERT INTO storage.buckets (id, name, public)
VALUES ('school_documents', 'school_documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

/* RLS policies on storage.objects for this bucket.
   Same anon-open convention as exam_documents. */
DROP POLICY IF EXISTS "school_documents_read" ON storage.objects;
CREATE POLICY "school_documents_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'school_documents');

DROP POLICY IF EXISTS "school_documents_insert" ON storage.objects;
CREATE POLICY "school_documents_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school_documents');

DROP POLICY IF EXISTS "school_documents_update" ON storage.objects;
CREATE POLICY "school_documents_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'school_documents')
WITH CHECK (bucket_id = 'school_documents');

DROP POLICY IF EXISTS "school_documents_delete" ON storage.objects;
CREATE POLICY "school_documents_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'school_documents');

/* Metadata table — one row per uploaded document. */
CREATE TABLE IF NOT EXISTS public.school_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_path text NOT NULL DEFAULT '',
  file_size int DEFAULT 0,
  mime_type text DEFAULT '',
  public_url text DEFAULT NULL,

  /* Categorization */
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('class_ledger','gradesheet','invoice','exam_paper','admit_card','assignment','notes','other')),
  doc_type text NOT NULL DEFAULT 'other'
    CHECK (doc_type IN ('pdf','docx','png','jpg','jpeg','gif','html','other')),

  /* Access control */
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public','private','class','student')),
  class_id text DEFAULT NULL,
  student_id text DEFAULT NULL,

  /* Metadata */
  created_by text DEFAULT NULL,
  created_by_name text DEFAULT NULL,
  created_by_role text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_documents_category_idx   ON public.school_documents (category);
CREATE INDEX IF NOT EXISTS school_documents_doc_type_idx   ON public.school_documents (doc_type);
CREATE INDEX IF NOT EXISTS school_documents_visibility_idx ON public.school_documents (visibility);
CREATE INDEX IF NOT EXISTS school_documents_class_id_idx   ON public.school_documents (class_id);
CREATE INDEX IF NOT EXISTS school_documents_student_id_idx ON public.school_documents (student_id);
CREATE INDEX IF NOT EXISTS school_documents_created_at_idx ON public.school_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS school_documents_created_by_idx ON public.school_documents (created_by);

/* Public read/write so the (client-side) portal can insert/update/delete rows. */
ALTER TABLE public.school_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='school_documents' AND policyname='school_documents_public_all') THEN
    CREATE POLICY school_documents_public_all ON public.school_documents FOR ALL USING (true);
  END IF;
END $$;

-- =========================================================================
-- Usage from the browser (Login_portal.html):
--   const file = new File([data], 'filename.pdf', { type: 'application/pdf' });
--   const filePath = new Date().toISOString().slice(0,10) + '/' + category + '/' + filename;
--   const { error } = await supabaseClient.storage
--     .from('school_documents')
--     .upload(filePath, file, { contentType: file.type, upsert: false });
--   const { data } = await supabaseClient.storage
--     .from('school_documents').getPublicUrl(filePath);
--   await supabaseClient.from('school_documents').insert({ ...row... });
-- =========================================================================
