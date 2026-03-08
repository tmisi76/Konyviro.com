import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import huTranslations from "./translations/hu.json";
import enTranslations from "./translations/en.json";

type Translations = typeof huTranslations;
type Language = "hu" | "en";

const translationMap: Record<Language, Translations> = {
  hu: huTranslations,
  en: enTranslations,
};

const FLAG_MAP: Record<Language, string> = {
  hu: "🇭🇺",
  en: "🇬🇧",
};

const LABEL_MAP: Record<Language, string> = {
  hu: "Magyar",
  en: "English",
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  activeLanguages: Language[];
  defaultLanguage: Language;
  flags: typeof FLAG_MAP;
  labels: typeof LABEL_MAP;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, part) => acc?.[part], obj) ?? path;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("app_language");
    return (stored as Language) || "hu";
  });

  // Fetch i18n settings from system_settings
  const { data: i18nSettings } = useQuery({
    queryKey: ["i18n-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .in("key", ["default_language", "active_languages"]);
      if (error) return null;
      const map: Record<string, any> = {};
      data?.forEach((row) => {
        map[row.key] = row.value;
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  const defaultLanguage: Language = (i18nSettings?.default_language as Language) || "hu";
  const activeLanguages: Language[] = (i18nSettings?.active_languages as Language[]) || ["hu"];

  // If stored language is not active, fall back to default
  useEffect(() => {
    if (activeLanguages.length > 0 && !activeLanguages.includes(language)) {
      setLanguageState(defaultLanguage);
      localStorage.setItem("app_language", defaultLanguage);
    }
  }, [activeLanguages, defaultLanguage, language]);

  // If only one language active, force it
  useEffect(() => {
    if (activeLanguages.length === 1 && language !== activeLanguages[0]) {
      setLanguageState(activeLanguages[0]);
      localStorage.setItem("app_language", activeLanguages[0]);
    }
  }, [activeLanguages, language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
  }, []);

  const t = translationMap[language] || translationMap.hu;

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        activeLanguages,
        defaultLanguage,
        flags: FLAG_MAP,
        labels: LABEL_MAP,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for outside provider
    return {
      language: "hu" as Language,
      setLanguage: () => {},
      t: huTranslations,
      activeLanguages: ["hu"] as Language[],
      defaultLanguage: "hu" as Language,
      flags: FLAG_MAP,
      labels: LABEL_MAP,
    };
  }
  return ctx;
}

export type { Language, Translations };
