import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Character, CharacterRelationship, CharacterRole, RelationshipType, KeyEvent } from "@/types/character";
import { toast } from "sonner";

export function useCharacters(projectId: string) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCharacters = useCallback(async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching characters:", error);
      toast.error("Hiba a karakterek betöltésekor");
      return;
    }

    const typedCharacters: Character[] = (data || []).map((c) => ({
      ...c,
      role: c.role as CharacterRole,
      motivations: (c.motivations || []) as string[],
      fears: (c.fears || []) as string[],
      positive_traits: (c.positive_traits || []) as string[],
      negative_traits: (c.negative_traits || []) as string[],
      key_events: (Array.isArray(c.key_events) ? c.key_events : []) as unknown as KeyEvent[],
    }));

    setCharacters(typedCharacters);
  }, [projectId]);

  const createCharacter = async (name: string, role: CharacterRole = "mellekszereploő") => {
    const { data, error } = await supabase
      .from("characters")
      .insert({
        project_id: projectId,
        name,
        role,
        motivations: [],
        fears: [],
        positive_traits: [],
        negative_traits: [],
        key_events: [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating character:", error);
      toast.error("Hiba a karakter létrehozásakor");
      return null;
    }

    const typedCharacter: Character = {
      ...data,
      role: data.role as CharacterRole,
      motivations: (data.motivations || []) as string[],
      fears: (data.fears || []) as string[],
      positive_traits: (data.positive_traits || []) as string[],
      negative_traits: (data.negative_traits || []) as string[],
      key_events: (Array.isArray(data.key_events) ? data.key_events : []) as unknown as KeyEvent[],
    };

    setCharacters((prev) => [...prev, typedCharacter]);
    toast.success("Karakter létrehozva");
    return typedCharacter;
  };

  const updateCharacter = async (characterId: string, updates: Partial<Character>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbUpdates: Record<string, any> = { ...updates };
    if (updates.key_events) {
      dbUpdates.key_events = JSON.parse(JSON.stringify(updates.key_events));
    }

    const { error } = await supabase
      .from("characters")
      .update(dbUpdates)
      .eq("id", characterId);

    if (error) {
      console.error("Error updating character:", error);
      toast.error("Hiba a karakter frissítésekor");
      return false;
    }

    setCharacters((prev) =>
      prev.map((c) => (c.id === characterId ? { ...c, ...updates } : c))
    );
    return true;
  };

  const deleteCharacter = async (characterId: string) => {
    const { error } = await supabase
      .from("characters")
      .delete()
      .eq("id", characterId);

    if (error) {
      console.error("Error deleting character:", error);
      toast.error("Hiba a karakter törlésekor");
      return false;
    }

    setCharacters((prev) => prev.filter((c) => c.id !== characterId));
    toast.success("Karakter törölve");
    return true;
  };

  useEffect(() => {
    setIsLoading(true);
    fetchCharacters().finally(() => setIsLoading(false));
  }, [fetchCharacters]);

  return {
    characters,
    isLoading,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    refetch: fetchCharacters,
  };
}

export function useCharacterRelationships(characterId: string | null) {
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRelationships = useCallback(async () => {
    if (!characterId) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("character_relationships")
      .select(`
        *,
        related_character:characters!character_relationships_related_character_id_fkey(*)
      `)
      .eq("character_id", characterId);

    if (error) {
      console.error("Error fetching relationships:", error);
      setIsLoading(false);
      return;
    }

    const typedRelationships: CharacterRelationship[] = (data || []).map((r) => {
      const relatedChar = r.related_character as unknown;
      return {
        id: r.id,
        character_id: r.character_id,
        related_character_id: r.related_character_id,
        relationship_type: r.relationship_type as RelationshipType,
        description: r.description,
        created_at: r.created_at,
        related_character: relatedChar as Character | undefined,
      };
    });

    setRelationships(typedRelationships);
    setIsLoading(false);
  }, [characterId]);

  const createRelationship = async (
    relatedCharacterId: string,
    relationshipType: RelationshipType,
    description?: string
  ) => {
    if (!characterId) return null;

    const { data, error } = await supabase
      .from("character_relationships")
      .insert({
        character_id: characterId,
        related_character_id: relatedCharacterId,
        relationship_type: relationshipType,
        description,
      })
      .select(`
        *,
        related_character:characters!character_relationships_related_character_id_fkey(*)
      `)
      .single();

    if (error) {
      console.error("Error creating relationship:", error);
      toast.error("Hiba a kapcsolat létrehozásakor");
      return null;
    }

    const relatedChar = data.related_character as unknown;
    const typedRelationship: CharacterRelationship = {
      id: data.id,
      character_id: data.character_id,
      related_character_id: data.related_character_id,
      relationship_type: data.relationship_type as RelationshipType,
      description: data.description,
      created_at: data.created_at,
      related_character: relatedChar as Character | undefined,
    };

    setRelationships((prev) => [...prev, typedRelationship]);
    return typedRelationship;
  };

  const deleteRelationship = async (relationshipId: string) => {
    const { error } = await supabase
      .from("character_relationships")
      .delete()
      .eq("id", relationshipId);

    if (error) {
      console.error("Error deleting relationship:", error);
      return false;
    }

    setRelationships((prev) => prev.filter((r) => r.id !== relationshipId));
    return true;
  };

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  return {
    relationships,
    isLoading,
    createRelationship,
    deleteRelationship,
    refetch: fetchRelationships,
  };
}
