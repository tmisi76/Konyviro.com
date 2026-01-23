import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AdminRole = "super_admin" | "admin" | "support" | "viewer";

interface AdminState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: AdminRole | null;
  isLoading: boolean;
  permissions: Record<string, boolean>;
}

export function useAdmin() {
  const { user } = useAuth();
  const [state, setState] = useState<AdminState>({
    isAdmin: false,
    isSuperAdmin: false,
    role: null,
    isLoading: true,
    permissions: {},
  });

  useEffect(() => {
    if (!user) {
      setState({
        isAdmin: false,
        isSuperAdmin: false,
        role: null,
        isLoading: false,
        permissions: {},
      });
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_users")
          .select("role, permissions, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          console.error("Error checking admin status:", error);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        if (data) {
          setState({
            isAdmin: true,
            isSuperAdmin: data.role === "super_admin",
            role: data.role as AdminRole,
            isLoading: false,
            permissions: (data.permissions as Record<string, boolean>) || {},
          });

          // Update last_login
          await supabase
            .from("admin_users")
            .update({ last_login: new Date().toISOString() })
            .eq("user_id", user.id);
        } else {
          setState({
            isAdmin: false,
            isSuperAdmin: false,
            role: null,
            isLoading: false,
            permissions: {},
          });
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAdminStatus();
  }, [user]);

  const hasPermission = (permission: string): boolean => {
    if (state.isSuperAdmin) return true;
    return state.permissions[permission] === true;
  };

  const canManageUsers = () => hasPermission("manage_users") || state.role === "admin" || state.isSuperAdmin;
  const canManageSettings = () => state.isSuperAdmin;
  const canViewAnalytics = () => state.isAdmin;
  const canManageSupport = () => hasPermission("manage_support") || state.role !== "viewer";

  return {
    ...state,
    hasPermission,
    canManageUsers,
    canManageSettings,
    canViewAnalytics,
    canManageSupport,
  };
}
