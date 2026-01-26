-- Create storage bucket for project assets (covers, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their project folders
CREATE POLICY "Users can upload project assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-assets' AND
    auth.uid() IS NOT NULL
  );

-- Allow public read access for project assets
CREATE POLICY "Public read access for project assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-assets');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their project assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-assets' AND
    auth.uid() IS NOT NULL
  );