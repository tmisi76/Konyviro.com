import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecentProject {
  id: string;
  title: string;
  genre: string;
  status: string;
  word_count: number;
  created_at: string;
  user_id: string;
  user_name: string | null;
  chapters_count: number;
}

export function useRecentProjects(limit: number = 5) {
  return useQuery({
    queryKey: ["admin", "recent-projects", limit],
    queryFn: async (): Promise<RecentProject[]> => {
      // First get projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select(`
          id,
          title,
          genre,
          status,
          word_count,
          created_at,
          user_id
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (projectsError) throw projectsError;

      if (!projects?.length) return [];

      // Get chapter counts for each project
      const projectIds = projects.map((p) => p.id);
      const { data: chapters } = await supabase
        .from("chapters")
        .select("project_id")
        .in("project_id", projectIds);

      const chapterCounts: Record<string, number> = {};
      chapters?.forEach((ch) => {
        chapterCounts[ch.project_id] = (chapterCounts[ch.project_id] || 0) + 1;
      });

      // Get user names
      const userIds = [...new Set(projects.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const userNames: Record<string, string | null> = {};
      profiles?.forEach((p) => {
        userNames[p.user_id] = p.full_name;
      });

      return projects.map((project) => ({
        ...project,
        user_name: userNames[project.user_id] || `user_${project.user_id.slice(0, 8)}`,
        chapters_count: chapterCounts[project.id] || 0,
      }));
    },
    staleTime: 30 * 1000,
  });
}
