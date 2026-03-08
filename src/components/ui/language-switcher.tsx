import { useTranslation, type Language } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher() {
  const { language, setLanguage, activeLanguages, flags, labels } = useTranslation();

  // Don't render if only one language active
  if (activeLanguages.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-lg">
          {flags[language]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {activeLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={language === lang ? "bg-accent" : ""}
          >
            <span className="mr-2 text-lg">{flags[lang]}</span>
            {labels[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
