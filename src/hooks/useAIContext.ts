import { useMemo } from "react";
import type { Character } from "@/types/character";
import type { Chapter } from "@/types/editor";
import { ROLE_LABELS } from "@/types/character";

interface UseAIContextProps {
  characters: Character[] | undefined;
  chapters: Chapter[];
  activeChapterId: string | null;
}

export function useAIContext({ characters, chapters, activeChapterId }: UseAIContextProps) {
  // Build character context for AI
  const charactersContext = useMemo(() => {
    if (!characters || characters.length === 0) return undefined;
    
    return characters.map(c => {
      const parts = [`**${c.name}** (${ROLE_LABELS[c.role] || c.role})`];
      if (c.occupation) parts.push(`foglalkozás: ${c.occupation}`);
      if (c.gender) parts.push(`nem: ${c.gender}`);
      if (c.age) parts.push(`kor: ${c.age} éves`);
      if (c.appearance_description) parts.push(`kinézet: ${c.appearance_description}`);
      if (c.backstory) parts.push(`háttér: ${c.backstory.slice(0, 300)}`);
      if (c.positive_traits?.length) parts.push(`pozitív: ${c.positive_traits.join(', ')}`);
      if (c.negative_traits?.length) parts.push(`negatív: ${c.negative_traits.join(', ')}`);
      if (c.speech_style) parts.push(`beszédstílus: ${c.speech_style}`);
      return parts.join(' | ');
    }).join('\n\n');
  }, [characters]);

  // Build previous chapters summaries for AI context (narrative consistency)
  const previousChaptersSummaries = useMemo(() => {
    if (!activeChapterId || !chapters.length) return undefined;
    
    const currentIndex = chapters.findIndex(c => c.id === activeChapterId);
    if (currentIndex <= 0) return undefined; // First chapter has no previous context
    
    // Get up to 5 most recent previous chapters with summaries
    const previousChapters = chapters.slice(Math.max(0, currentIndex - 5), currentIndex);
    
    const summaries = previousChapters
      .filter(c => c.summary && c.summary.trim().length > 0)
      .map(c => `**${c.title}**: ${c.summary}`)
      .join('\n\n');
    
    return summaries.length > 0 ? summaries : undefined;
  }, [chapters, activeChapterId]);

  return {
    charactersContext,
    previousChaptersSummaries,
  };
}
