import { useState } from "react";
import { User, Trash2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CharacterRelationshipsTab } from "./CharacterRelationshipsTab";
import type { Character, CharacterRole, KeyEvent } from "@/types/character";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  GENDER_OPTIONS,
  BODY_TYPE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  EYE_COLOR_OPTIONS,
} from "@/types/character";

interface CharacterDetailModalProps {
  character: Character;
  characters: Character[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Character>) => void;
  onDelete: () => void;
}

export function CharacterDetailModal({
  character,
  characters,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: CharacterDetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleArrayFieldChange = (
    field: "motivations" | "fears" | "positive_traits" | "negative_traits",
    value: string
  ) => {
    const items = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onUpdate({ [field]: items });
  };

  const handleGenerateAppearance = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise((r) => setTimeout(r, 1500));
    
    const description = `${character.name} egy ${character.age || "középkorú"} éves ${
      character.gender === "ferfi" ? "férfi" : character.gender === "no" ? "nő" : "személy"
    }, ${character.height || "átlagos"} magasságú, ${
      character.body_type ? BODY_TYPE_OPTIONS.find((o) => o.value === character.body_type)?.label?.toLowerCase() : "átlagos"
    } testalkattal. ${
      character.hair_color
        ? `${HAIR_COLOR_OPTIONS.find((o) => o.value === character.hair_color)?.label} hajú`
        : ""
    } ${
      character.eye_color
        ? `${EYE_COLOR_OPTIONS.find((o) => o.value === character.eye_color)?.label?.toLowerCase()} szemű`
        : ""
    }. ${character.distinguishing_features || ""}`;

    onUpdate({ appearance_description: description.trim() });
    setIsGenerating(false);
  };

  const addKeyEvent = () => {
    const newEvent: KeyEvent = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
    };
    onUpdate({ key_events: [...(character.key_events || []), newEvent] });
  };

  const updateKeyEvent = (eventId: string, updates: Partial<KeyEvent>) => {
    const events = (character.key_events || []).map((e) =>
      e.id === eventId ? { ...e, ...updates } : e
    );
    onUpdate({ key_events: events });
  };

  const removeKeyEvent = (eventId: string) => {
    const events = (character.key_events || []).filter((e) => e.id !== eventId);
    onUpdate({ key_events: events });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {character.avatar_url ? (
              <img
                src={character.avatar_url}
                alt={character.name}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <DialogTitle className="text-xl">{character.name}</DialogTitle>
              <Badge className={cn("mt-1", ROLE_COLORS[character.role])}>
                {ROLE_LABELS[character.role]}
              </Badge>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Karakter törlése</AlertDialogTitle>
                  <AlertDialogDescription>
                    Biztosan törölni szeretnéd {character.name} karaktert? Ez a művelet
                    nem vonható vissza.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive">
                    Törlés
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Alapadatok</TabsTrigger>
            <TabsTrigger value="appearance">Megjelenés</TabsTrigger>
            <TabsTrigger value="personality">Személyiség</TabsTrigger>
            <TabsTrigger value="backstory">Háttértörténet</TabsTrigger>
            <TabsTrigger value="relationships">Kapcsolatok</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Név</label>
                <Input
                  value={character.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Becenév</label>
                <Input
                  value={character.nickname || ""}
                  onChange={(e) => onUpdate({ nickname: e.target.value || null })}
                  placeholder="Opcionális"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kor</label>
                <Input
                  type="number"
                  value={character.age || ""}
                  onChange={(e) =>
                    onUpdate({ age: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nem</label>
                <Select
                  value={character.gender || ""}
                  onValueChange={(v) => onUpdate({ gender: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Foglalkozás</label>
                <Input
                  value={character.occupation || ""}
                  onChange={(e) => onUpdate({ occupation: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Szerep</label>
                <Select
                  value={character.role}
                  onValueChange={(v) => onUpdate({ role: v as CharacterRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Avatar URL</label>
              <Input
                value={character.avatar_url || ""}
                onChange={(e) => onUpdate({ avatar_url: e.target.value || null })}
                placeholder="https://..."
              />
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Hajszín</label>
                <Select
                  value={character.hair_color || ""}
                  onValueChange={(v) => onUpdate({ hair_color: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz" />
                  </SelectTrigger>
                  <SelectContent>
                    {HAIR_COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Szemszín</label>
                <Select
                  value={character.eye_color || ""}
                  onValueChange={(v) => onUpdate({ eye_color: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz" />
                  </SelectTrigger>
                  <SelectContent>
                    {EYE_COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Magasság</label>
                <Input
                  value={character.height || ""}
                  onChange={(e) => onUpdate({ height: e.target.value || null })}
                  placeholder="pl. 175 cm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Testalkat</label>
                <Select
                  value={character.body_type || ""}
                  onValueChange={(v) => onUpdate({ body_type: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Megkülönböztető jegyek</label>
              <Textarea
                value={character.distinguishing_features || ""}
                onChange={(e) =>
                  onUpdate({ distinguishing_features: e.target.value || null })
                }
                placeholder="Hegek, tetoválások, egyéb jellegzetességek..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Megjelenés leírása</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAppearance}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  AI leírás generálás
                </Button>
              </div>
              <Textarea
                value={character.appearance_description || ""}
                onChange={(e) =>
                  onUpdate({ appearance_description: e.target.value || null })
                }
                placeholder="Részletes megjelenés leírása..."
                className="min-h-[100px]"
              />
            </div>
          </TabsContent>

          {/* Personality Tab */}
          <TabsContent value="personality" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivációk</label>
              <Textarea
                value={(character.motivations || []).join(", ")}
                onChange={(e) => handleArrayFieldChange("motivations", e.target.value)}
                placeholder="Vesszővel elválasztva (pl. Család, Karrier, Bosszú)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Félelmek</label>
              <Textarea
                value={(character.fears || []).join(", ")}
                onChange={(e) => handleArrayFieldChange("fears", e.target.value)}
                placeholder="Vesszővel elválasztva"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pozitív tulajdonságok</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(character.positive_traits || []).map((trait, i) => (
                  <Badge key={i} variant="secondary">
                    {trait}
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Új tulajdonság hozzáadása, Enter megnyomása"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    onUpdate({
                      positive_traits: [
                        ...(character.positive_traits || []),
                        e.currentTarget.value.trim(),
                      ],
                    });
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Negatív tulajdonságok</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(character.negative_traits || []).map((trait, i) => (
                  <Badge key={i} variant="outline">
                    {trait}
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Új tulajdonság hozzáadása, Enter megnyomása"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    onUpdate({
                      negative_traits: [
                        ...(character.negative_traits || []),
                        e.currentTarget.value.trim(),
                      ],
                    });
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Beszédstílus</label>
              <Textarea
                value={character.speech_style || ""}
                onChange={(e) => onUpdate({ speech_style: e.target.value || null })}
                placeholder="Hogyan beszél? Milyen szavakat használ? Vannak szójárásai?"
              />
            </div>
          </TabsContent>

          {/* Backstory Tab */}
          <TabsContent value="backstory" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Háttértörténet</label>
              <Textarea
                value={character.backstory || ""}
                onChange={(e) => onUpdate({ backstory: e.target.value || null })}
                placeholder="A karakter múltja, előtörténete..."
                className="min-h-[200px]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Kulcs események</label>
                <Button variant="outline" size="sm" onClick={addKeyEvent}>
                  + Esemény
                </Button>
              </div>
              <div className="space-y-3">
                {(character.key_events || []).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={event.title}
                        onChange={(e) =>
                          updateKeyEvent(event.id, { title: e.target.value })
                        }
                        placeholder="Esemény címe"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={event.age || ""}
                        onChange={(e) =>
                          updateKeyEvent(event.id, {
                            age: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="Kor"
                        className="w-20"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeKeyEvent(event.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={event.description}
                      onChange={(e) =>
                        updateKeyEvent(event.id, { description: e.target.value })
                      }
                      placeholder="Mi történt?"
                      className="min-h-[60px]"
                    />
                  </div>
                ))}
                {(!character.key_events || character.key_events.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Még nincsenek kulcs események
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships" className="pt-4">
            <CharacterRelationshipsTab
              characterId={character.id}
              characters={characters}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
