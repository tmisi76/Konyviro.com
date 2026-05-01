import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ChapterContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: {
    title?: string | null;
    content?: string | null;
    word_count?: number | null;
    status?: string | null;
    updated_at?: string | null;
  } | null;
}

export function ChapterContentModal({ open, onOpenChange, chapter }: ChapterContentModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!chapter?.content) return;
    try {
      await navigator.clipboard.writeText(chapter.content);
      setCopied(true);
      toast.success("Vágólapra másolva");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Másolás sikertelen");
    }
  };

  const content = chapter?.content?.trim() || "";
  const paragraphs = content ? content.split(/\n\n+/) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">
                {chapter?.title || "Fejezet"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {(chapter?.word_count ?? 0).toLocaleString()} szó
                {chapter?.status && ` · ${chapter.status}`}
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!content}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Másolás
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {content ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-wrap leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Ez a fejezet még üres.
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}