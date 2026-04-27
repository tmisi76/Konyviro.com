
-- Helper function: check if a user is a collaborator on a project (with optional role)
CREATE OR REPLACE FUNCTION public.is_project_collaborator(_project_id uuid, _user_id uuid, _min_role text DEFAULT 'reader')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE project_id = _project_id
      AND user_id = _user_id
      AND accepted_at IS NOT NULL
      AND (
        _min_role = 'reader'
        OR (_min_role = 'editor' AND role IN ('editor', 'admin'))
        OR (_min_role = 'admin' AND role = 'admin')
      )
  )
$$;

-- Projects: collaborators can SELECT
CREATE POLICY "Collaborators can view shared projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.is_project_collaborator(id, auth.uid(), 'reader'));

-- Chapters: collaborators can SELECT, editors can UPDATE
CREATE POLICY "Collaborators can view shared chapters"
ON public.chapters
FOR SELECT
TO authenticated
USING (public.is_project_collaborator(project_id, auth.uid(), 'reader'));

CREATE POLICY "Editor collaborators can update shared chapters"
ON public.chapters
FOR UPDATE
TO authenticated
USING (public.is_project_collaborator(project_id, auth.uid(), 'editor'));

-- Blocks: collaborators can SELECT, editors can INSERT/UPDATE/DELETE
CREATE POLICY "Collaborators can view shared blocks"
ON public.blocks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chapters c
    WHERE c.id = blocks.chapter_id
      AND public.is_project_collaborator(c.project_id, auth.uid(), 'reader')
  )
);

CREATE POLICY "Editor collaborators can insert shared blocks"
ON public.blocks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chapters c
    WHERE c.id = blocks.chapter_id
      AND public.is_project_collaborator(c.project_id, auth.uid(), 'editor')
  )
);

CREATE POLICY "Editor collaborators can update shared blocks"
ON public.blocks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chapters c
    WHERE c.id = blocks.chapter_id
      AND public.is_project_collaborator(c.project_id, auth.uid(), 'editor')
  )
);

CREATE POLICY "Editor collaborators can delete shared blocks"
ON public.blocks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chapters c
    WHERE c.id = blocks.chapter_id
      AND public.is_project_collaborator(c.project_id, auth.uid(), 'editor')
  )
);

-- Characters: collaborators can SELECT
CREATE POLICY "Collaborators can view shared characters"
ON public.characters
FOR SELECT
TO authenticated
USING (public.is_project_collaborator(project_id, auth.uid(), 'reader'));

-- Allow collaborators to update accepted_at on their own row (accept invite)
CREATE POLICY "Collaborators can accept their own invitation"
ON public.project_collaborators
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
