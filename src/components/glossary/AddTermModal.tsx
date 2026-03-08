import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useGlossary } from "@/hooks/useGlossary";

interface AddTermModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  editingTermId: string | null;
}

export function AddTermModal({ open, onOpenChange, projectId, editingTermId }: AddTermModalProps) {
  const { terms, createTerm, updateTerm } = useGlossary(projectId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    term: "",
    definition: "",
    category: "",
    aliases: "",
  });

  const editingTerm = editingTermId ? terms.find((t) => t.id === editingTermId) : null;

  useEffect(() => {
    if (editingTerm) {
      setForm({
        term: editingTerm.term,
        definition: editingTerm.definition,
        category: editingTerm.category || "",
        aliases: editingTerm.aliases.join(", "),
      });
    } else {
      setForm({ term: "", definition: "", category: "", aliases: "" });
    }
  }, [editingTerm, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const aliases = form.aliases
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      if (editingTermId) {
        await updateTerm({
          id: editingTermId,
          term: form.term,
          definition: form.definition,
          category: form.category || null,
          aliases,
        });
      } else {
        await createTerm({
          project_id: projectId,
          term: form.term,
          definition: form.definition,
          category: form.category || null,
          aliases,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTermId ? "Szószedet szerkesztése" : "Új szószedet bejegyzés"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Kifejezés *</Label>
            <Input
              value={form.term}
              onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))}
              required
              placeholder="Pl. Varázspalota"
            />
          </div>
          <div className="space-y-2">
            <Label>Definíció *</Label>
            <Textarea
              value={form.definition}
              onChange={(e) => setForm((p) => ({ ...p, definition: e.target.value }))}
              required
              rows={3}
              placeholder="A történet központi helyszíne, egy hegytetőn álló kastély..."
            />
          </div>
          <div className="space-y-2">
            <Label>Kategória</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder="Pl. Helyszín, Karakter, Szakkifejezés"
            />
          </div>
          <div className="space-y-2">
            <Label>Alternatív nevek (vesszővel elválasztva)</Label>
            <Input
              value={form.aliases}
              onChange={(e) => setForm((p) => ({ ...p, aliases: e.target.value }))}
              placeholder="Pl. VP, a Palota, kastély"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingTermId ? "Mentés" : "Hozzáadás"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
