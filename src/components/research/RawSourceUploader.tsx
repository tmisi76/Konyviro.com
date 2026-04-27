import { useRef, useState } from "react";
import { Loader2, Upload, FileText, Link2, Type, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RawSourceUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onUploaded: () => void;
}

const ALLOWED_EXT = [".pdf", ".docx", ".txt", ".md"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function RawSourceUploader({
  isOpen,
  onClose,
  projectId,
  onUploaded,
}: RawSourceUploaderProps) {
  const [tab, setTab] = useState<"text" | "file" | "url">("text");
  const [isLoading, setIsLoading] = useState(false);

  // Text tab
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  // URL tab
  const [urlList, setUrlList] = useState("");

  // File tab
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  const reset = () => {
    setTextTitle("");
    setTextContent("");
    setUrlList("");
    setFiles([]);
  };

  const handleFilesSelected = (selected: FileList | null) => {
    if (!selected) return;
    const arr = Array.from(selected);
    const valid: File[] = [];
    for (const f of arr) {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        toast.error(`Nem támogatott: ${f.name}`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`Túl nagy (max 20MB): ${f.name}`);
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid].slice(0, 10));
  };

  const ingest = async (body: Record<string, unknown>) => {
    const { error } = await supabase.functions.invoke("ingest-raw-source", { body });
    if (error) throw new Error(error.message);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (tab === "text") {
        if (!textContent.trim()) {
          toast.error("Írj be tartalmat");
          return;
        }
        await ingest({
          projectId,
          kind: "text",
          title: textTitle.trim() || "Beillesztett szöveg",
          text: textContent,
        });
        toast.success("Szöveg feltöltve és feldolgozva");
      } else if (tab === "url") {
        const urls = urlList
          .split("\n")
          .map((u) => u.trim())
          .filter((u) => u.length > 0);
        if (urls.length === 0) {
          toast.error("Adj meg legalább egy URL-t");
          return;
        }
        let ok = 0;
        for (const url of urls) {
          try {
            await ingest({ projectId, kind: "url", url });
            ok++;
          } catch (e) {
            console.error("URL ingest failed:", url, e);
          }
        }
        toast.success(`${ok}/${urls.length} URL feldolgozva`);
      } else if (tab === "file") {
        if (files.length === 0) {
          toast.error("Válassz fájlt");
          return;
        }
        let ok = 0;
        for (const file of files) {
          try {
            const ext = file.name.split(".").pop();
            const path = `raw-sources/${projectId}/${crypto.randomUUID()}.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from("project-assets")
              .upload(path, file, { contentType: file.type, upsert: false });
            if (uploadErr) throw uploadErr;
            await ingest({
              projectId,
              kind: "file",
              storagePath: path,
              originalFilename: file.name,
            });
            ok++;
          } catch (e) {
            console.error("File ingest failed:", file.name, e);
            toast.error(`Hiba: ${file.name}`);
          }
        }
        toast.success(`${ok}/${files.length} fájl feldolgozva`);
      }

      onUploaded();
      reset();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Hiba";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Forrásanyag hozzáadása</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text" className="gap-2">
              <Type className="h-4 w-4" /> Szöveg
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-2">
              <FileText className="h-4 w-4" /> Fájl
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="h-4 w-4" /> URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label>Cím (opcionális)</Label>
              <Input
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="Pl. Blogposzt – Marketing alapok"
              />
            </div>
            <div className="space-y-2">
              <Label>Szöveg</Label>
              <Textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Illeszd be a blogposztot, jegyzetet vagy bármilyen szöveget…"
                rows={12}
              />
              <p className="text-xs text-muted-foreground">
                Ha több anyagot illesztesz be, mindegyiket külön töltsd fel a stílus pontosabb átvételéért.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-3 pt-4">
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilesSelected(e.dataTransfer.files);
              }}
            >
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm">Kattints vagy húzd ide a fájlokat</p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX, TXT, MD – max 10 fájl, 20 MB / db
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="ml-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="url" className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label>URL-ek (soronként egy)</Label>
              <Textarea
                value={urlList}
                onChange={(e) => setUrlList(e.target.value)}
                placeholder={"https://blog.example.com/post-1\nhttps://blog.example.com/post-2"}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Az AI letölti és kinyeri a fő tartalmat. Csak nyilvánosan elérhető oldalak.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Mégse
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Feltöltés és feldolgozás
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}