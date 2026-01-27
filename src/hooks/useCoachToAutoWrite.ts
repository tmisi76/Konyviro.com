import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoachSummary } from "./useBookCoach";
import { toast } from "sonner";
import type { Genre, Subcategory, Tone, FictionStyleSettings, AuthorProfile } from "@/types/wizard";

const GENERATE_STORY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-story`;
const CHAPTER_OUTLINE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chapter-outline`;

interface UseCoachToAutoWriteReturn {
  isCreating: boolean;
  progress: string;
  startAutoWrite: (
    summary: CoachSummary, 
    wizardGenre: Genre, 
    subcategory?: Subcategory
  ) => Promise<string | null>;
}

export function useCoachToAutoWrite(): UseCoachToAutoWriteReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState("");

  const startAutoWrite = useCallback(async (
    summary: CoachSummary,
    wizardGenre: Genre,
    subcategory?: Subcategory
  ): Promise<string | null> => {
    setIsCreating(true);
    setProgress("Projekt létrehozása...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Be kell jelentkezned a folytatáshoz");
        return null;
      }

      const s = summary.summary;
      
      // Build project title
      const title = s.topic || s.protagonist || "Új könyv";
      
      // Build story idea from summary
      const storyIdea = buildStoryIdea(summary, wizardGenre);
      
      // Map tone
      const tone = mapTone(s.toneRecommendation);
      
      // Build target word count
      const targetWordCount = parseTargetLength(s.targetLength);
      
      // Build target audience
      const targetAudience = s.audience || "general";
      
      // Build author profile for nonfiction
      const authorProfile: AuthorProfile | null = wizardGenre === "szakkonyv" ? {
        authorName: "",
        formality: "tegez",
        authorBackground: s.existingContent || "",
        personalStories: "",
        mainPromise: s.keyLearnings?.join(", ") || "",
      } : null;
      
      // Build fiction style for fiction
      const fictionStyle: FictionStyleSettings | null = wizardGenre === "fiction" ? {
        pov: "third_limited",
        pace: "moderate",
        dialogueRatio: "balanced",
        descriptionLevel: "moderate",
        setting: s.setting || "",
        ageRating: subcategory === "erotikus" ? "explicit" : "teen",
      } : null;

      // 1. Create project in database
      setProgress("Projekt mentése...");
      const insertData = {
        user_id: session.user.id,
        title,
        description: storyIdea,
        genre: wizardGenre,
        subcategory: subcategory || mapSubcategory(s.subgenre, wizardGenre),
        target_audience: targetAudience,
        tone,
        target_word_count: targetWordCount,
        story_idea: storyIdea,
        author_profile: authorProfile as unknown as Record<string, unknown> | null,
        fiction_style: fictionStyle as unknown as Record<string, unknown> | null,
        writing_mode: "autowrite",
        writing_status: "in_progress",
        wizard_step: 7,
        status: "active",
      };
      
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert([insertData] as any)
        .select()
        .single();

      if (projectError || !project) {
        throw new Error(projectError?.message || "Projekt létrehozási hiba");
      }

      // 2. Generate detailed story structure
      setProgress("Részletes koncepció generálása...");
      const storyResponse = await fetch(GENERATE_STORY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          storyIdea,
          genre: wizardGenre,
          tone,
          targetAudience,
          authorProfile,
        }),
      });

      if (!storyResponse.ok) {
        console.warn("Story generation failed, continuing with basic outline");
      } else {
        const storyData = await storyResponse.json();
        
        // Update project with story structure
        await supabase
          .from("projects")
          .update({
            story_structure: storyData,
            generated_story: JSON.stringify(storyData),
          })
          .eq("id", project.id);
      }

      // 3. Generate chapter outline
      setProgress("Fejezetek tervezése...");
      const chapterResponse = await fetch(CHAPTER_OUTLINE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          storyIdea,
          genre: wizardGenre,
          tone,
          targetAudience,
          targetWordCount,
          suggestedChapters: s.suggestedOutline,
        }),
      });

      if (!chapterResponse.ok) {
        throw new Error("Fejezet vázlat generálási hiba");
      }

      const chapterData = await chapterResponse.json();
      const chapters = chapterData.chapters || [];

      // 4. Create chapters in database
      setProgress("Fejezetek mentése...");
      if (chapters.length > 0) {
        const chapterInserts = chapters.map((ch: any, index: number) => ({
          project_id: project.id,
          title: ch.title || `${index + 1}. fejezet`,
          summary: ch.description || ch.summary || "",
          key_points: ch.keyPoints || [],
          sort_order: index,
          status: "draft",
          generation_status: "pending",
        }));

        const { error: chaptersError } = await supabase
          .from("chapters")
          .insert(chapterInserts);

        if (chaptersError) {
          console.error("Chapter insert error:", chaptersError);
        }
      }

      // 5. Update project to trigger autowrite
      setProgress("Automata írás indítása...");
      await supabase
        .from("projects")
        .update({
          wizard_step: 8,
          writing_status: "in_progress",
        })
        .eq("id", project.id);

      // Increment projects created (no p_user_id needed - uses auth.uid())
      await supabase.rpc("increment_projects_created");

      toast.success("Könyv létrehozva, automata írás indul!");
      return project.id;

    } catch (error) {
      console.error("Coach to AutoWrite error:", error);
      toast.error(error instanceof Error ? error.message : "Hiba történt");
      return null;
    } finally {
      setIsCreating(false);
      setProgress("");
    }
  }, []);

  return {
    isCreating,
    progress,
    startAutoWrite,
  };
}

// Helper functions

function buildStoryIdea(summary: CoachSummary, genre: Genre): string {
  const s = summary.summary;
  const parts: string[] = [];

  if (genre === "szakkonyv") {
    if (s.topic) parts.push(`Téma: ${s.topic}`);
    if (s.audience) parts.push(`Célközönség: ${s.audience}`);
    if (s.keyLearnings?.length) parts.push(`Fő tanulságok: ${s.keyLearnings.join(", ")}`);
    if (s.existingContent) parts.push(`Szerző háttere: ${s.existingContent}`);
  } else {
    if (s.subgenre) parts.push(`Műfaj: ${s.subgenre}`);
    if (s.protagonist) parts.push(`Főszereplő: ${s.protagonist}`);
    if (s.mainGoal) parts.push(`Cél: ${s.mainGoal}`);
    if (s.conflict) parts.push(`Konfliktus: ${s.conflict}`);
    if (s.setting) parts.push(`Helyszín: ${s.setting}`);
    if (s.ending) parts.push(`Befejezés: ${s.ending}`);
    if (s.characterSuggestions?.length) parts.push(`Karakterek: ${s.characterSuggestions.join(", ")}`);
    
    // Erotic specific
    if (s.protagonists) parts.push(`Szereplők: ${s.protagonists}`);
    if (s.relationshipDynamic) parts.push(`Kapcsolat: ${s.relationshipDynamic}`);
    if (s.storyArc) parts.push(`Történet íve: ${s.storyArc}`);
  }

  return parts.join("\n");
}

function mapTone(toneRecommendation?: string): Tone | null {
  if (!toneRecommendation) return null;
  const lower = toneRecommendation.toLowerCase();
  if (lower.includes("könnyed") || lower.includes("light")) return "light";
  if (lower.includes("profi") || lower.includes("professional")) return "professional";
  if (lower.includes("drámai") || lower.includes("dramatic")) return "dramatic";
  if (lower.includes("humor") || lower.includes("vicces")) return "humorous";
  if (lower.includes("sötét") || lower.includes("dark")) return "dark";
  if (lower.includes("feszült") || lower.includes("suspense")) return "suspenseful";
  if (lower.includes("inspiráló") || lower.includes("inspiring")) return "inspiring";
  return "professional";
}

function parseTargetLength(targetLength?: string): number {
  if (!targetLength) return 25000;
  const lower = targetLength.toLowerCase();
  if (lower.includes("novella") || lower.includes("rövid")) return 10000;
  if (lower.includes("kisregény") || lower.includes("közepes")) return 25000;
  if (lower.includes("regény") || lower.includes("hosszú")) return 50000;
  
  // Try to parse number
  const match = targetLength.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > 100) return num; // Assume it's word count
    return num * 1000; // Assume it's in thousands
  }
  
  return 25000;
}

function mapSubcategory(subgenre?: string, genre?: Genre): Subcategory | null {
  if (!subgenre) return null;
  const lower = subgenre.toLowerCase();
  
  if (genre === "szakkonyv") {
    if (lower.includes("üzlet") || lower.includes("vállalkozás")) return "uzlet";
    if (lower.includes("önfejlesztés") || lower.includes("self")) return "onfejlesztes";
    if (lower.includes("egészség") || lower.includes("fitness")) return "egeszseg";
    if (lower.includes("tech")) return "tech";
    if (lower.includes("pénz") || lower.includes("finance")) return "penzugyek";
    if (lower.includes("marketing")) return "marketing";
    if (lower.includes("vezetés") || lower.includes("leadership")) return "vezetes";
    if (lower.includes("pszich")) return "pszichologia";
    if (lower.includes("oktatás") || lower.includes("education")) return "oktatas";
    if (lower.includes("lifestyle") || lower.includes("életmód")) return "lifestyle";
    return "onfejlesztes";
  } else {
    if (lower.includes("thriller")) return "thriller";
    if (lower.includes("krimi") || lower.includes("detective")) return "krimi";
    if (lower.includes("romantikus") || lower.includes("romance")) return "romantikus";
    if (lower.includes("sci-fi") || lower.includes("scifi")) return "scifi";
    if (lower.includes("fantasy")) return "fantasy";
    if (lower.includes("horror")) return "horror";
    if (lower.includes("erotikus") || lower.includes("erotic")) return "erotikus";
    if (lower.includes("dráma") || lower.includes("drama")) return "drama";
    if (lower.includes("kaland") || lower.includes("adventure")) return "kaland";
    if (lower.includes("történelmi") || lower.includes("historical")) return "tortenelmi";
    return "drama";
  }
}
