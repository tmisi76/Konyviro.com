import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  socialTwitter: string | null;
  socialInstagram: string | null;
}

const defaultProfile: UserProfile = {
  id: "",
  userId: "",
  fullName: null,
  displayName: null,
  avatarUrl: null,
  bio: null,
  website: null,
  socialTwitter: null,
  socialInstagram: null,
};

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(defaultProfile);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, display_name, avatar_url, bio, website, social_twitter, social_instagram")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        id: data.id,
        userId: data.user_id,
        fullName: data.full_name,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        website: data.website,
        socialTwitter: data.social_twitter,
        socialInstagram: data.social_instagram,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, "id" | "userId">>) => {
    if (!user) return false;

    setIsSaving(true);
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.website !== undefined) dbUpdates.website = updates.website;
      if (updates.socialTwitter !== undefined) dbUpdates.social_twitter = updates.socialTwitter;
      if (updates.socialInstagram !== undefined) dbUpdates.social_instagram = updates.socialInstagram;

      const { error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev) => ({ ...prev, ...updates }));
      toast.success("Profil mentve");
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Nem sikerült menteni a profilt");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage.from("avatars").remove([fileName]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      // Update profile with new avatar URL
      await updateProfile({ avatarUrl });
      
      return avatarUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Nem sikerült feltölteni a képet");
      return null;
    }
  };

  const removeAvatar = async () => {
    if (!user || !profile.avatarUrl) return;

    try {
      const fileName = `${user.id}/avatar`;
      
      // Try to remove common extensions
      await supabase.storage.from("avatars").remove([
        `${fileName}.jpg`,
        `${fileName}.jpeg`,
        `${fileName}.png`,
        `${fileName}.webp`,
      ]);

      await updateProfile({ avatarUrl: null });
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Nem sikerült törölni a képet");
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    isSaving,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    refetch: fetchProfile,
  };
}
