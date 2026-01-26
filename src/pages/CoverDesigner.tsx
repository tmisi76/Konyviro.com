import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const STYLE_OPTIONS = [
  { value: 'photorealistic', label: 'Fotórealisztikus' },
  { value: 'fantasy-art', label: 'Fantasy Művészet' },
  { value: 'minimalist', label: 'Minimalista' },
  { value: 'vintage', label: 'Vintage / Retró' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'romantic', label: 'Romantikus' },
  { value: 'thriller', label: 'Thriller / Horror' },
  { value: 'watercolor', label: 'Akvarell' },
];

interface Cover {
  id: string;
  created_at: string;
  project_id: string;
  prompt: string;
  style: string;
  image_url: string | null;
  is_selected: boolean;
  parent_cover_id: string | null;
}

const CoverDesigner: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [style, setStyle] = useState('photorealistic');
  const [prompt, setPrompt] = useState('');

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Pre-fill form when project loads
  React.useEffect(() => {
    if (project) {
      setTitle(project.title || '');
      const authorProfile = project.author_profile as { name?: string } | null;
      setAuthor(authorProfile?.name || '');
    }
  }, [project]);

  // Fetch covers for this project
  const { data: covers, isLoading: coversLoading } = useQuery({
    queryKey: ['covers', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('covers')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Cover[];
    },
    enabled: !!projectId,
  });

  // Generate cover mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('Nincs bejelentkezve');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            prompt,
            style,
            title,
            author,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba a borító generálásakor');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['covers', projectId] });
      toast({
        title: 'Borító elkészült!',
        description: 'Az új borító sikeresen létrejött.',
      });
      setPrompt('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Hiba',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Select cover mutation
  const selectMutation = useMutation({
    mutationFn: async (coverId: string) => {
      // First, unselect all covers for this project
      await supabase
        .from('covers')
        .update({ is_selected: false })
        .eq('project_id', projectId);
      
      // Then select the chosen one
      const { error } = await supabase
        .from('covers')
        .update({ is_selected: true })
        .eq('id', coverId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['covers', projectId] });
      toast({
        title: 'Borító kiválasztva',
        description: 'Ez a borító lesz használva az exportálásnál.',
      });
    },
    onError: () => {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült kiválasztani a borítót.',
        variant: 'destructive',
      });
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast({
        title: 'Hiányzó leírás',
        description: 'Kérlek adj meg egy leírást a borítóhoz.',
        variant: 'destructive',
      });
      return;
    }
    generateMutation.mutate();
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/project/${projectId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Borító Tervező</h1>
            <p className="text-muted-foreground">{project?.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generation Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Új Borító Generálása
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Könyv Címe</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="A könyv címe..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Szerző Neve</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Szerző neve..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style">Stílus</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger id="style" className="bg-background">
                      <SelectValue placeholder="Válassz stílust..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {STYLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Leírás</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Írd le, mit szeretnél látni a borítón. Pl: 'Egy magányos űrhajós néz egy örvénylő ködöt a csillagok között...'"
                    rows={5}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generálás...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Borító Generálása
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Cover Gallery */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Generált Borítók
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coversLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : covers && covers.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {covers.map((cover) => (
                    <div
                      key={cover.id}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        cover.is_selected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => selectMutation.mutate(cover.id)}
                    >
                      {cover.image_url ? (
                        <img
                          src={cover.image_url}
                          alt={cover.prompt}
                          className="w-full aspect-[2/3] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Selected indicator */}
                      {cover.is_selected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <p className="text-white text-xs line-clamp-2">
                          {cover.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Még nincs borító</h3>
                  <p className="text-muted-foreground text-sm">
                    Generálj egy új borítót a bal oldali űrlap kitöltésével.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CoverDesigner;
