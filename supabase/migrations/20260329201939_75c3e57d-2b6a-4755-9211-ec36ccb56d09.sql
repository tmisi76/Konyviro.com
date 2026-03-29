ALTER TABLE public.projects
DROP CONSTRAINT IF EXISTS projects_nonfiction_book_type_check;

ALTER TABLE public.projects
ADD CONSTRAINT projects_nonfiction_book_type_check
CHECK (
  nonfiction_book_type IS NULL
  OR nonfiction_book_type = ANY (
    ARRAY[
      'how-to'::text,
      'thought-leadership'::text,
      'case-study'::text,
      'framework'::text,
      'self-help'::text,
      'storytelling-business'::text,
      'interview'::text,
      'workbook'::text,
      'reference'::text,
      'memoir'::text,
      'investigative'::text
    ]
  )
);