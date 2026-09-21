-- ============================================================
-- TERANGA ALIGN — Remplacement du CV par le talent
-- Migration 007 : colonne profiles.cv_extracted_skills + bucket Storage
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_extracted_skills JSONB NOT NULL DEFAULT '[]';

-- Bucket privé : un seul CV courant par talent, chemin `{profile_id}/cv.pdf`.
-- L'upload/la lecture passent par la route API (service role, bypass RLS) —
-- ces policies sont une défense en profondeur pour un éventuel accès direct
-- depuis un client Supabase authentifié, pas le chemin principal.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cv-uploads', 'cv-uploads', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "cv_own_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cv-uploads'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "cv_own_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cv-uploads'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "cv_own_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'cv-uploads'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.id::text = (storage.foldername(name))[1]
    )
  );
