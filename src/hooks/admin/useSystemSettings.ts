import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: string | null;
  is_sensitive: boolean;
  updated_at: string;
}

export function useSystemSettings(category?: string) {
  return useQuery({
    queryKey: ['system-settings', category],
    queryFn: async () => {
      let query = supabase
        .from('system_settings')
        .select('*');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query.order('key');
      
      if (error) {
        console.error('Error fetching system settings:', error);
        throw error;
      }
      
      // Convert to a key-value object for easier access
      const settingsMap: Record<string, any> = {};
      data?.forEach(setting => {
        try {
          settingsMap[setting.key] = typeof setting.value === 'string' 
            ? JSON.parse(setting.value) 
            : setting.value;
        } catch {
          settingsMap[setting.key] = setting.value;
        }
      });
      
      return settingsMap;
    },
    staleTime: 60000,
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      }));
      
      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: update.value, updated_at: update.updated_at })
          .eq('key', update.key);
        
        if (error) throw error;
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
}
