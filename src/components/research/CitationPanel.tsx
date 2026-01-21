import { useState } from "react";
import { BookMarked, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Source } from "@/types/research";
import { SOURCE_TYPE_LABELS, SOURCE_TYPE_COLORS } from "@/types/research";

interface CitationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sources: Source[];
  onSelectSource: (source: Source, pageRef?: string) => void;
}

export function CitationPanel({
  isOpen,
  onClose,
  sources,
  onSelectSource,
}: CitationPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [pageReference, setPageReference] = useState("");

  const filteredSources = sources.filter((source) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      source.title.toLowerCase().includes(query) ||
      source.author?.toLowerCase().includes(query)
    );
  });

  const handleInsert = () => {
    if (selectedSource) {
      onSelectSource(selectedSource, pageReference || undefined);
      onClose();
      setSelectedSource(null);
      setPageReference("");
      setSearchQuery("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Hivatkozás beszúrása
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Forrás keresése..."
            className="pl-9"
          />
        </div>

        {/* Sources list */}
        <div className="max-h-64 overflow-y-auto">
          {filteredSources.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nincs találat
            </p>
          ) : (
            <div className="space-y-2">
              {filteredSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => setSelectedSource(source)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    selectedSource?.id === source.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {selectedSource?.id === source.id && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 text-xs",
                          SOURCE_TYPE_COLORS[source.source_type]
                        )}
                      >
                        {SOURCE_TYPE_LABELS[source.source_type]}
                      </Badge>
                    </div>
                    <p className="mt-1 font-medium text-foreground line-clamp-1">
                      {source.title}
                    </p>
                    {source.author && (
                      <p className="text-sm text-muted-foreground">
                        {source.author}
                        {source.year && ` (${source.year})`}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page reference */}
        {selectedSource && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Oldalszám (opcionális)
            </label>
            <Input
              value={pageReference}
              onChange={(e) => setPageReference(e.target.value)}
              placeholder="pl. 42 vagy 42-45"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Mégse
          </Button>
          <Button onClick={handleInsert} disabled={!selectedSource}>
            Beszúrás
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
