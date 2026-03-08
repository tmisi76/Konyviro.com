import { useState } from "react";
import { BookText, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGlossary } from "@/hooks/useGlossary";
import { AddTermModal } from "./AddTermModal";

interface GlossaryViewProps {
  projectId: string;
}

export function GlossaryView({ projectId }: GlossaryViewProps) {
  const { terms, isLoading, deleteTerm } = useGlossary(projectId);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<string | null>(null);

  const filtered = terms.filter(
    (t) =>
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase()) ||
      t.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()))
  );

  const categories = [...new Set(terms.map((t) => t.category).filter(Boolean))];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Szószedet</h2>
            <Badge variant="secondary">{terms.length} bejegyzés</Badge>
          </div>
          <Button onClick={() => { setEditingTerm(null); setModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Új bejegyzés
          </Button>
        </div>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keresés a szószedetben..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className="cursor-pointer"
                onClick={() => setSearch(cat || "")}
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {terms.length === 0
                ? "Még nincs szószedet bejegyzés. Adj hozzá neveket, helyszíneket, szakkifejezéseket!"
                : "Nincs találat a keresésre."}
            </div>
          ) : (
            filtered.map((term) => (
              <Card key={term.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{term.term}</span>
                        {term.category && (
                          <Badge variant="secondary" className="text-xs">{term.category}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{term.definition}</p>
                      {term.aliases.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {term.aliases.map((a, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditingTerm(term.id); setModalOpen(true); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteTerm(term.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <AddTermModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectId={projectId}
        editingTermId={editingTerm}
      />
    </div>
  );
}
