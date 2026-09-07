-- =========================================================================
-- EXAM DOCUMENTS — archive for exported exam ledgers & gradesheets
-- Shree Saraswati Secondary School Portal
-- Run in Supabase SQL Editor after the other migrations (sql/008_alumni.sql).
--
-- The "Export" button on a Class Ledger / Gradesheet (Login_portal.html)
-- saves the rendered document as a self-contained .html file into the
-- `exam_documents` storage bucket, and inserts one row in the
-- public.exam_documents table below so the file can be found again later.
-- =========================================================================

/* Storage bucket where exported .html files are kept. Public bucket so the
   archived documents are readable later without signed URLs. */
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam_documents', 'exam_documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

/* RLS policies on storage.objects for this bucket.
   RLS is already enabled on storage.objects by default (owned by
   supabase_storage_admin — do NOT run ALTER TABLE ... ENABLE ROW LEVEL
   SECURITY on it, that fails with "must be owner of table objects").
   The portal runs entirely under the anon key (no Supabase auth session),
   so write access is left open, matching the public_all convention used on
   all app tables (see 008_alumni.sql). */

DROP POLICY IF EXISTS "exam_documents_read" ON storage.objects;
CREATE POLICY "exam_documents_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'exam_documents');

DROP POLICY IF EXISTS "exam_documents_insert" ON storage.objects;
CREATE POLICY "exam_documents_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'exam_documents');

DROP POLICY IF EXISTS "exam_documents_update" ON storage.objects;
CREATE POLICY "exam_documents_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'exam_documents')
WITH CHECK (bucket_id = 'exam_documents');

DROP POLICY IF EXISTS "exam_documents_delete" ON storage.objects;
CREATE POLICY "exam_documents_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'exam_documents');

/* Metadata table — one row per exported document. The ids are stored as
   text (not foreign keys) because the portal's STRUCT blob works with ids
   that are text in some tables and uuid in others; equality filters still
   match what the app sends. */
CREATE TABLE IF NOT EXISTS public.exam_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type text NOT NULL DEFAULT 'gradesheet' CHECK (doc_type IN ('gradesheet','ledger')),
  exam_id text DEFAULT NULL,
  class_id text DEFAULT NULL,
  student_id text DEFAULT NULL,     -- gradesheets only
  title text DEFAULT '',
  file_path text NOT NULL DEFAULT '',   -- storage bucket path, e.g. 2026-09-07/ledgers/...
  file_size int DEFAULT 0,
  mime_type text DEFAULT 'text/html',
  public_url text DEFAULT NULL,     -- readable storage URL (public bucket)
  created_by text DEFAULT NULL,     -- portal username that ran the export
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exam_documents_doc_type_idx     ON public.exam_documents (doc_type);
CREATE INDEX IF NOT EXISTS exam_documents_exam_id_idx      ON public.exam_documents (exam_id);
CREATE INDEX IF NOT EXISTS exam_documents_class_id_idx     ON public.exam_documents (class_id);
CREATE INDEX IF NOT EXISTS exam_documents_created_at_idx   ON public.exam_documents (created_at DESC);

/* Public read/write so the (client-side) portal can insert rows. */
ALTER TABLE public.exam_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exam_documents' AND policyname='exam_documents_public_all') THEN
    CREATE POLICY exam_documents_public_all ON public.exam_documents FOR ALL USING (true);
  END IF;
END $$;

-- =========================================================================
-- Usage from the browser (Login_portal.html):
--   const file = new File([html], 'filename.html', { type: 'text/html' });
--   const { error } = await supabaseClient.storage
--     .from('exam_documents')
--     .upload('2026-09-07/ledgers/exam-class-1234.html', file,
--             { contentType: 'text/html', upsert: false });
--   const { data } = supabaseClient.storage
--     .from('exam_documents').getPublicUrl(path);   // -> data.publicUrl
--   await supabaseClient.from('exam_documents').insert({ ...row... });
-- =========================================================================