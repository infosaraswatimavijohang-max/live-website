/* =========================================================================
   GALLERY STORAGE — Supabase Storage bucket for gallery images
   Run in Supabase SQL Editor after the other migrations.
   ========================================================================= */

/* Public bucket — files served directly via storage URL (no signed URLs).
   ON CONFLICT also forces public=true on a bucket already created privately. */
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

/* RLS policies on storage.objects for this bucket.
   RLS is already enabled on storage.objects by default (owned by
   supabase_storage_admin — do NOT run ALTER TABLE ... ENABLE ROW LEVEL
   SECURITY on it, that fails with "must be owner of table objects").
   The app runs entirely under the anon key (no Supabase auth session —
   admin rights are enforced in-browser via sessionStorage sss_admin_auth),
   so write access is left open, matching the public_all convention used
   on all app tables (see 006_fee_management.sql). */

DROP POLICY IF EXISTS "public_read" ON storage.objects;
CREATE POLICY "public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "public_insert" ON storage.objects;
CREATE POLICY "public_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gallery');

DROP POLICY IF EXISTS "public_update" ON storage.objects;
CREATE POLICY "public_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');

DROP POLICY IF EXISTS "public_delete" ON storage.objects;
CREATE POLICY "public_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'gallery');

/* =========================================================================
   Upload a gallery image (anon key, no auth):
     POST {SUPABASE_URL}/storage/v1/object/gallery/{folder}/{file.webp}
       headers: apikey, Authorization: Bearer, Content-Type: image/webp
     body: raw image bytes

   Public URL (no headers needed):
     {SUPABASE_URL}/storage/v1/object/public/gallery/{folder}/{file.webp}

   Then store the public URL in the gallery table (src column):
     INSERT INTO gallery (src, category, caption)
     VALUES ('{SUPABASE_URL}/storage/v1/object/public/gallery/...', 'events', 'Caption');
   ========================================================================= */
