-- Allow public read access to projects that have an active public share
CREATE POLICY "Public can view shared projects"
  ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.book_shares bs
      WHERE bs.project_id = projects.id
        AND bs.is_public = true
        AND (bs.expires_at IS NULL OR bs.expires_at > now())
    )
  );

-- Allow public read access to chapters of projects that have an active public share
CREATE POLICY "Public can view shared chapters"
  ON public.chapters
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.book_shares bs
      WHERE bs.project_id = chapters.project_id
        AND bs.is_public = true
        AND (bs.expires_at IS NULL OR bs.expires_at > now())
    )
  );