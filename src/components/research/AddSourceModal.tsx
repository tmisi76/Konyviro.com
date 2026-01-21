import { useState, useEffect } from "react";
import { Loader2, Link as LinkIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Source, SourceType } from "@/types/research";
import { SOURCE_TYPE_LABELS } from "@/types/research";

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (source: Partial<Source>) => Promise<Source | null>;
  initialType?: SourceType;
  editingSource?: Source | null;
}

export function AddSourceModal({
  isOpen,
  onClose,
  onSave,
  initialType = "egyeb",
  editingSource,
}: AddSourceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>(initialType);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Reset form when editing source changes
  useEffect(() => {
    if (editingSource) {
      setUrl(editingSource.url || "");
      setTitle(editingSource.title);
      setAuthor(editingSource.author || "");
      setPublisher(editingSource.publisher || "");
      setYear(editingSource.year?.toString() || "");
      setSourceType(editingSource.source_type);
      setNotes(editingSource.notes || "");
      setTags(editingSource.tags || []);
    } else {
      setUrl("");
      setTitle("");
      setAuthor("");
      setPublisher("");
      setYear("");
      setSourceType(initialType);
      setNotes("");
      setTags([]);
    }
  }, [editingSource, initialType, isOpen]);

  const handleFetchMetadata = async () => {
    if (!url) return;
    
    setIsFetchingMetadata(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url }
      });

      if (error) throw error;
      
      if (data?.success && data.metadata) {
        const meta = data.metadata;
        if (meta.title && !title) setTitle(meta.title);
        if (meta.author && !author) setAuthor(meta.author);
        if (meta.publisher && !publisher) setPublisher(meta.publisher);
        if (meta.year && !year) setYear(meta.year.toString());
        toast.success("Metaadatok betöltve");
      } else {
        throw new Error(data?.error || "Nem sikerült betölteni");
      }
    } catch (error) {
      console.error("Fetch metadata error:", error);
      toast.error("Nem sikerült betölteni a metaadatokat");
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    setIsLoading(true);
    
    await onSave({
      title: title.trim(),
      author: author.trim() || null,
      publisher: publisher.trim() || null,
      year: year ? parseInt(year) : null,
      url: url.trim() || null,
      source_type: sourceType,
      notes: notes.trim() || null,
      tags,
    });
    
    setIsLoading(false);
    onClose();
    
    // Reset form
    setUrl("");
    setTitle("");
    setAuthor("");
    setPublisher("");
    setYear("");
    setSourceType(initialType);
    setNotes("");
    setTags([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingSource ? "Forrás szerkesztése" : "Új forrás hozzáadása"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source type */}
          <div className="space-y-2">
            <Label>Típus</Label>
            <Select
              value={sourceType}
              onValueChange={(v) => setSourceType(v as SourceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* URL with fetch button */}
          <div className="space-y-2">
            <Label>URL</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleFetchMetadata}
                disabled={!url || isFetchingMetadata}
              >
                {isFetchingMetadata ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Adatok betöltése"
                )}
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Cím *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A forrás címe"
            />
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label>Szerző</Label>
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Szerző neve"
            />
          </div>

          {/* Publisher and Year row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kiadó</Label>
              <Input
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Kiadó neve"
              />
            </div>
            <div className="space-y-2">
              <Label>Év</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                min="1900"
                max="2100"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Címkék</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Új címke"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button variant="outline" onClick={handleAddTag}>
                Hozzáad
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Jegyzetek</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jegyzetek a forráshoz..."
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Mégse
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {editingSource ? "Mentés" : "Hozzáadás"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
