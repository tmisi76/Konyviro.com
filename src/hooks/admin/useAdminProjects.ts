import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseAdminProjectsParams {
  search?: string;
  genre?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdminProject {
  id: string;
  title: string;
  genre: string;
  subgenre: string | null;
  target_audience: string | null;
  tone: string | null;
  word_count: number;
  chapter_count: number;
  user_id: string;
  user_email: string;
  user_name: string | null;
  is_adult: boolean;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
}

interface AdminProjectsResponse {
  data: AdminProject[];
  total: number;
  totalPages: number;
  page: number;
}

export function useAdminProjects({
  search = '',
  genre = 'all',
  status = 'all',
  page = 1,
  limit = 20
}: UseAdminProjectsParams = {}) {
  return useQuery({
    queryKey: ['admin-projects', search, genre, status, page, limit],
    queryFn: async (): Promise<AdminProjectsResponse> => {
      // Build the query
      let query = supabase
        .from('projects')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      // Apply genre filter
      if (genre !== 'all') {
        query = query.eq('genre', genre);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data: projects, error, count } = await query;

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      // Get user info for each project
      const userIds = [...new Set(projects?.map(p => p.user_id) || [])];
      
      let userProfiles: Record<string, { full_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        if (profiles) {
          userProfiles = profiles.reduce((acc, p) => {
            acc[p.user_id] = { full_name: p.full_name };
            return acc;
          }, {} as Record<string, { full_name: string | null }>);
        }
      }

      // Get chapter counts
      let chapterCounts: Record<string, number> = {};
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: chapters } = await supabase
          .from('chapters')
          .select('project_id')
          .in('project_id', projectIds);
        
        if (chapters) {
          chapterCounts = chapters.reduce((acc, c) => {
            acc[c.project_id] = (acc[c.project_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      // Use word_count from chapters table directly
      let wordCounts: Record<string, number> = {};
      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: chapters } = await supabase
          .from('chapters')
          .select('project_id, word_count')
          .in('project_id', projectIds);
        
        if (chapters) {
          chapters.forEach(c => {
            wordCounts[c.project_id] = (wordCounts[c.project_id] || 0) + (c.word_count || 0);
          });
        }
      }

      // Transform data
      const transformedProjects: AdminProject[] = (projects || []).map(project => {
        // Determine status based on project data
        let projectStatus: 'draft' | 'in_progress' | 'completed' | 'archived' = 'draft';
        const chapterCount = chapterCounts[project.id] || 0;
        const wordCount = wordCounts[project.id] || 0;
        
        if (wordCount > 50000) {
          projectStatus = 'completed';
        } else if (chapterCount > 0 || wordCount > 0) {
          projectStatus = 'in_progress';
        }

        return {
          id: project.id,
          title: project.title,
          genre: project.genre || 'N/A',
          subgenre: null,
          target_audience: project.target_audience,
          tone: project.tone,
          word_count: wordCount,
          chapter_count: chapterCount,
          user_id: project.user_id,
          user_email: `user-${project.user_id.slice(0, 8)}@example.com`,
          user_name: userProfiles[project.user_id]?.full_name || null,
          is_adult: false,
          created_at: project.created_at,
          updated_at: project.updated_at,
          status: projectStatus
        };
      });

      // Apply status filter client-side
      const filteredProjects = status === 'all'
        ? transformedProjects
        : transformedProjects.filter(p => p.status === status);

      return {
        data: filteredProjects,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        page
      };
    },
    staleTime: 30000,
  });
}

export function useProjectDetails(projectId: string | undefined) {
  return useQuery({
    queryKey: ['admin-project-details', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      // Get project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Get chapters
      const { data: chapters } = await supabase
        .from('chapters')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index');

      // Get characters
      const { data: characters } = await supabase
        .from('characters')
        .select('*')
        .eq('project_id', projectId);

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', project.user_id)
        .single();

      // Calculate stats using word_count field
      const totalWords = chapters?.reduce((acc, ch) => {
        return acc + (ch.word_count || 0);
      }, 0) || 0;

      return {
        ...project,
        chapters: chapters || [],
        characters: characters || [],
        owner: profile,
        stats: {
          totalWords,
          chapterCount: chapters?.length || 0,
          characterCount: characters?.length || 0
        }
      };
    },
    enabled: !!projectId,
  });
}
