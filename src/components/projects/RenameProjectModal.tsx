import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RenameProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentTitle: string;
  onSuccess?: () => void;
}

export function RenameProjectModal({
  open,
  onOpenChange,
  projectId,
  currentTitle,
  onSuccess,
}: RenameProjectModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [isLoading, setIsLoading] = useState(false);

  // Reset title when modal opens with new project
  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
    }
  }, [open, currentTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedTitle = title.trim();
    
    if (!trimmedTitle) {
      toast.error("A cím nem lehet üres");
      return;
    }

    if (trimmedTitle.length > 100) {
      toast.error("A cím maximum 100 karakter lehet");
      return;
    }

    if (trimmedTitle === currentTitle) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("projects")
        .update({ title: trimmedTitle })
        .eq("id", projectId);

      if (error) throw error;

      toast.success("Könyv sikeresen átnevezve");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Error renaming project:", err);
      toast.error("Hiba történt az átnevezés során");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Könyv átnevezése</DialogTitle>
          <DialogDescription>
            Add meg az új címet a könyvedhez.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Cím</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Könyv címe"
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {title.length}/100 karakter
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
