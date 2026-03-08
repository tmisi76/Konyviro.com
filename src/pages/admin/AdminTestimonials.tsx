import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Star, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Testimonial {
  id: string;
  author_name: string;
  author_role: string | null;
  content: string;
  rating: number;
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface FormData {
  author_name: string;
  author_role: string;
  content: string;
  rating: number;
  avatar_url: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: FormData = {
  author_name: "",
  author_role: "",
  content: "",
  rating: 5,
  avatar_url: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminTestimonials() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData & { id?: string }) => {
      const payload = {
        author_name: data.author_name,
        author_role: data.author_role || null,
        content: data.content,
        rating: data.rating,
        avatar_url: data.avatar_url || null,
        is_active: data.is_active,
        sort_order: data.sort_order,
      };

      if (data.id) {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("testimonials").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success(editingId ? "Vélemény frissítve!" : "Vélemény hozzáadva!");
      setDialogOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
      toast.success("Vélemény törölve!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setFormData({
      author_name: t.author_name,
      author_role: t.author_role || "",
      content: t.content,
      rating: t.rating,
      avatar_url: t.avatar_url || "",
      is_active: t.is_active,
      sort_order: t.sort_order,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ ...emptyForm, sort_order: (testimonials?.length || 0) + 1 });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vélemények</h1>
          <p className="text-muted-foreground">Landing page vélemények kezelése</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Új vélemény
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><div className="h-20 animate-pulse bg-muted rounded" /></CardContent></Card>
            ))
          : testimonials?.map((t) => (
              <Card key={t.id} className={!t.is_active ? "opacity-50" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{t.author_name}</span>
                          {t.author_role && (
                            <span className="text-sm text-muted-foreground">— {t.author_role}</span>
                          )}
                          {!t.is_active && <Badge variant="secondary">Inaktív</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">"{t.content}"</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: t.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Vélemény szerkesztése" : "Új vélemény"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({ ...formData, id: editingId || undefined });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Név *</Label>
              <Input
                value={formData.author_name}
                onChange={(e) => setFormData((p) => ({ ...p, author_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Szerep</Label>
              <Input
                value={formData.author_role}
                onChange={(e) => setFormData((p) => ({ ...p, author_role: e.target.value }))}
                placeholder="Pl. Romantikus regény író"
              />
            </div>
            <div className="space-y-2">
              <Label>Vélemény szövege *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))}
                required
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Értékelés (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.rating}
                  onChange={(e) => setFormData((p) => ({ ...p, rating: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Sorrend</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Avatar URL</Label>
              <Input
                value={formData.avatar_url}
                onChange={(e) => setFormData((p) => ({ ...p, avatar_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktív</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_active: checked }))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Mentés" : "Hozzáadás"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
