import { useState } from "react";
import { Plus, Search, Globe, BookOpen, FileText, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SourceCard } from "./SourceCard";
import { AddSourceModal } from "./AddSourceModal";
import { useSources } from "@/hooks/useResearch";
import type { Source, SourceType } from "@/types/research";
import { SOURCE_TYPE_LABELS } from "@/types/research";
import { Loader2 } from "lucide-react";

interface SourcesListProps {
  projectId: string;
}

const SOURCE_TYPE_ICONS: Record<SourceType, typeof Globe> = {
  weboldal: Globe,
  konyv: BookOpen,
  cikk: FileText,
  egyeb: HelpCircle,
};

export function SourcesList({ projectId }: SourcesListProps) {
  const {
    sources,
    isLoading,
    createSource,
    updateSource,
    deleteSource,
    toggleStar,
  } = useSources(projectId);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SourceType | null>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  const filteredSources = sources.filter((source) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      source.title.toLowerCase().includes(query) ||
      source.author?.toLowerCase().includes(query) ||
      source.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const handleAddSource = (type: SourceType) => {
    setSelectedType(type);
    setEditingSource(null);
    setIsAddModalOpen(true);
  };

  const handleEditSource = (source: Source) => {
    setEditingSource(source);
    setSelectedType(source.source_type);
    setIsAddModalOpen(true);
  };

  const handleSaveSource = async (sourceData: Partial<Source>) => {
    if (editingSource) {
      await updateSource(editingSource.id, sourceData);
      return editingSource as Source;
    } else {
      return await createSource(sourceData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Kutatás</h2>
          <p className="text-sm text-muted-foreground">
            {sources.length} forrás
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Forrás hozzáadása
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(SOURCE_TYPE_LABELS) as SourceType[]).map((type) => {
              const Icon = SOURCE_TYPE_ICONS[type];
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => handleAddSource(type)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {SOURCE_TYPE_LABELS[type]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Források keresése..."
          className="pl-9"
        />
      </div>

      {/* Sources grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredSources.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 font-medium text-foreground">
              {searchQuery ? "Nincs találat" : "Még nincsenek források"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery
                ? "Próbálj másik keresést"
                : "Adj hozzá forrásokat a kutatásodhoz"}
            </p>
            {!searchQuery && (
              <Button variant="outline" onClick={() => handleAddSource("konyv")}>
                <Plus className="mr-2 h-4 w-4" />
                Első forrás hozzáadása
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                onEdit={() => handleEditSource(source)}
                onDelete={() => deleteSource(source.id)}
                onToggleStar={() => toggleStar(source.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingSource(null);
        }}
        onSave={handleSaveSource}
        initialType={selectedType || "egyeb"}
        editingSource={editingSource}
      />
    </div>
  );
}
