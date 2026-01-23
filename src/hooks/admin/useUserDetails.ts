import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserDetailsData {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  subscription_tier: string;
  subscription_status: string;
  monthly_word_limit: number;
  project_limit: number;
  extra_words_balance: number;
  created_at: string;
  updated_at: string;
  stats: {
    totalProjects: number;
    totalChapters: number;
    totalWords: number;
    totalCharacters: number;
    wordsThisMonth: number;
    projectsThisMonth: number;
  };
  projects: Array<{
    id: string;
    title: string;
    genre: string;
    word_count: number;
    created_at: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
  }>;
}

export function useUserDetails(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin-user-details', userId],
    queryFn: async (): Promise<UserDetailsData | null> => {
      if (!userId) return null;

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      // Get projects with word counts
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          genre,
          created_at,
          chapters (content)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const projectsWithWordCount = (projects || []).map(p => {
        const wordCount = (p.chapters || []).reduce((acc: number, ch: any) => {
          return acc + (ch.content ? ch.content.split(/\s+/).filter(Boolean).length : 0);
        }, 0);
        return {
          id: p.id,
          title: p.title,
          genre: p.genre || 'N/A',
          word_count: wordCount,
          created_at: p.created_at
        };
      });

      // Get chapter count
      const { count: chapterCount } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projects?.map(p => p.id) || []);

      // Get character count
      const { count: characterCount } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projects?.map(p => p.id) || []);

      // Get usage for this month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: usage } = await supabase
        .from('user_usage')
        .select('words_generated, projects_created')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .single();

      // Get recent activity from admin_activity_logs
      const { data: activityLogs } = await supabase
        .from('admin_activity_logs')
        .select('id, action, entity_type, created_at')
        .eq('entity_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      const totalWords = projectsWithWordCount.reduce((acc, p) => acc + p.word_count, 0);

      return {
        id: profile.id,
        user_id: profile.user_id,
        email: `user-${userId.slice(0, 8)}@example.com`, // Placeholder until we implement email fetching
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        subscription_tier: profile.subscription_tier || 'free',
        subscription_status: profile.subscription_status || 'active',
        monthly_word_limit: profile.monthly_word_limit || 1000,
        project_limit: profile.project_limit || 1,
        extra_words_balance: profile.extra_words_balance || 0,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        stats: {
          totalProjects: projects?.length || 0,
          totalChapters: chapterCount || 0,
          totalWords,
          totalCharacters: characterCount || 0,
          wordsThisMonth: usage?.words_generated || 0,
          projectsThisMonth: usage?.projects_created || 0
        },
        projects: projectsWithWordCount,
        recentActivity: activityLogs || []
      };
    },
    enabled: !!userId,
  });
}
