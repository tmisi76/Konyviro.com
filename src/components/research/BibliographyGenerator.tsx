import { useState } from "react";
import { FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Source, BibliographyFormat } from "@/types/research";

interface BibliographyGeneratorProps {
  sources: Source[];
}

const FORMAT_LABELS: Record<BibliographyFormat, string> = {
  apa: "APA (7. kiadás)",
  chicago: "Chicago",
  custom: "Egyéni",
};

export function BibliographyGenerator({ sources }: BibliographyGeneratorProps) {
  const [format, setFormat] = useState<BibliographyFormat>("apa");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatCitation = (source: Source, format: BibliographyFormat): string => {
    const author = source.author || "Ismeretlen szerző";
    const year = source.year || "é.n.";
    const title = source.title;
    const publisher = source.publisher || "";

    switch (format) {
      case "apa":
        // APA 7th edition format
        if (source.source_type === "weboldal") {
          return `${author}. (${year}). ${title}. ${source.url || ""}`;
        }
        if (source.source_type === "cikk") {
          return `${author}. (${year}). ${title}. ${publisher}.`;
        }
        return `${author}. (${year}). *${title}*. ${publisher}.`;

      case "chicago":
        // Chicago style
        if (source.source_type === "weboldal") {
          return `${author}. "${title}." Accessed ${new Date().getFullYear()}. ${source.url || ""}.`;
        }
        return `${author}. *${title}*. ${publisher}, ${year}.`;

      case "custom":
        // Simple custom format
        return `${author} (${year}): ${title}. ${publisher}`;

      default:
        return `${author} (${year}). ${title}. ${publisher}`;
    }
  };

  const handleCopy = async (source: Source) => {
    const citation = formatCitation(source, format);
    await navigator.clipboard.writeText(citation);
    setCopiedId(source.id);
    toast.success("Hivatkozás másolva");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = async () => {
    const bibliography = sources
      .map((source) => formatCitation(source, format))
      .join("\n\n");
    await navigator.clipboard.writeText(bibliography);
    toast.success("Teljes irodalomjegyzék másolva");
  };

  if (sources.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="mb-2 font-medium text-foreground">
          Nincs forrás az irodalomjegyzékhez
        </h3>
        <p className="text-sm text-muted-foreground">
          Adj hozzá forrásokat a Kutatás fülön
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Irodalomjegyzék
          </h2>
          <p className="text-sm text-muted-foreground">
            {sources.length} forrás
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={format}
            onValueChange={(v) => setFormat(v as BibliographyFormat)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleCopyAll}>
            <Copy className="mr-2 h-4 w-4" />
            Mind másolása
          </Button>
        </div>
      </div>

      {/* Bibliography list */}
      <div className="space-y-4">
        {sources.map((source) => (
          <div
            key={source.id}
            className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex-1">
              <p className="text-sm text-foreground">
                {formatCitation(source, format)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 opacity-0 group-hover:opacity-100"
              onClick={() => handleCopy(source)}
            >
              {copiedId === source.id ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
