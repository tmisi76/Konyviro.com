-- Create characters table
CREATE TABLE public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  nickname TEXT,
  age INTEGER,
  gender TEXT,
  occupation TEXT,
  role TEXT NOT NULL DEFAULT 'mellekszereploő' CHECK (role IN ('foszereploő', 'mellekszereploő', 'antagonista')),
  avatar_url TEXT,
  
  -- Appearance
  hair_color TEXT,
  eye_color TEXT,
  height TEXT,
  body_type TEXT,
  distinguishing_features TEXT,
  appearance_description TEXT,
  
  -- Personality
  motivations TEXT[] DEFAULT '{}',
  fears TEXT[] DEFAULT '{}',
  positive_traits TEXT[] DEFAULT '{}',
  negative_traits TEXT[] DEFAULT '{}',
  speech_style TEXT,
  
  -- Backstory
  backstory TEXT,
  key_events JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create character relationships table
CREATE TABLE public.character_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  related_character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('barat', 'ellenseg', 'szerelmi', 'csaladi', 'munkatars', 'egyeb')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(character_id, related_character_id)
);

-- Enable RLS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_relationships ENABLE ROW LEVEL SECURITY;

-- RLS policies for characters
CREATE POLICY "Users can view their own characters" 
ON public.characters FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create characters in their projects" 
ON public.characters FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update their own characters" 
ON public.characters FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own characters" 
ON public.characters FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()
));

-- RLS policies for relationships
CREATE POLICY "Users can view their own character relationships" 
ON public.character_relationships FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM characters 
  JOIN projects ON projects.id = characters.project_id 
  WHERE characters.id = character_relationships.character_id AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create character relationships" 
ON public.character_relationships FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM characters 
  JOIN projects ON projects.id = characters.project_id 
  WHERE characters.id = character_relationships.character_id AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update their own character relationships" 
ON public.character_relationships FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM characters 
  JOIN projects ON projects.id = characters.project_id 
  WHERE characters.id = character_relationships.character_id AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own character relationships" 
ON public.character_relationships FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM characters 
  JOIN projects ON projects.id = characters.project_id 
  WHERE characters.id = character_relationships.character_id AND projects.user_id = auth.uid()
));

-- Create triggers for updated_at
CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();