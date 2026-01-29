import { useState } from "react";
import { Plus, Edit, Trash2, Play, Pause, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTTSVoices, useVoicePreview } from "@/hooks/useAudiobook";
import { supabase } from "@/integrations/supabase/client";
import type { TTSVoice } from "@/types/audiobook";

export default function AdminVoices() {
  const { data: voices, isLoading, refetch } = useTTSVoices();
  const voicePreview = useVoicePreview();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoice, setEditingVoice] = useState<TTSVoice | null>(null);
  const [formData, setFormData] = useState({
    elevenlabs_voice_id: "",
    name: "",
    description: "",
    gender: "neutral" as "male" | "female" | "neutral",
    language: "hu",
    sample_text: "Üdvözöllek! Ez egy minta szöveg a hang teszteléséhez.",
    is_active: true,
  });

  const handlePlayPreview = async (voice: TTSVoice) => {
    if (playingVoiceId === voice.id) {
      audioElement?.pause();
      setPlayingVoiceId(null);
      setAudioElement(null);
      return;
    }

    try {
      const sampleText = voice.sample_text || "Üdvözöllek! Ez egy minta szöveg a hang teszteléséhez.";
      const audioUrl = await voicePreview.mutateAsync({
        voiceId: voice.elevenlabs_voice_id,
        sampleText,
      });

      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setPlayingVoiceId(null);
        setAudioElement(null);
      };
      audio.play();
      setPlayingVoiceId(voice.id);
      setAudioElement(audio);
    } catch {
      toast.error("Hiba a hang lejátszásakor");
    }
  };

  const handleOpenModal = (voice?: TTSVoice) => {
    if (voice) {
      setEditingVoice(voice);
      setFormData({
        elevenlabs_voice_id: voice.elevenlabs_voice_id,
        name: voice.name,
        description: voice.description || "",
        gender: voice.gender,
        language: voice.language,
        sample_text: voice.sample_text || "",
        is_active: voice.is_active,
      });
    } else {
      setEditingVoice(null);
      setFormData({
        elevenlabs_voice_id: "",
        name: "",
        description: "",
        gender: "neutral",
        language: "hu",
        sample_text: "Üdvözöllek! Ez egy minta szöveg a hang teszteléséhez.",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.elevenlabs_voice_id || !formData.name) {
      toast.error("A Voice ID és a név kötelező!");
      return;
    }

    try {
      if (editingVoice) {
        const { error } = await supabase
          .from("tts_voices")
          .update(formData)
          .eq("id", editingVoice.id);

        if (error) throw error;
        toast.success("Hang frissítve!");
      } else {
        const { error } = await supabase
          .from("tts_voices")
          .insert(formData);

        if (error) throw error;
        toast.success("Hang hozzáadva!");
      }

      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error("Error saving voice:", error);
      toast.error("Hiba a mentéskor");
    }
  };

  const handleDelete = async (voiceId: string) => {
    if (!confirm("Biztosan törlöd ezt a hangot?")) return;

    try {
      const { error } = await supabase
        .from("tts_voices")
        .delete()
        .eq("id", voiceId);

      if (error) throw error;
      toast.success("Hang törölve!");
      refetch();
    } catch (error) {
      console.error("Error deleting voice:", error);
      toast.error("Hiba a törléskor");
    }
  };

  const handleToggleActive = async (voice: TTSVoice) => {
    try {
      const { error } = await supabase
        .from("tts_voices")
        .update({ is_active: !voice.is_active })
        .eq("id", voice.id);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error("Error toggling voice:", error);
      toast.error("Hiba a státusz változtatásakor");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TTS Hangok</h1>
          <p className="text-muted-foreground">
            ElevenLabs hangok kezelése a hangoskönyvekhez
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" />
              Új hang
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVoice ? "Hang szerkesztése" : "Új hang hozzáadása"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="voice_id">ElevenLabs Voice ID *</Label>
                <Input
                  id="voice_id"
                  value={formData.elevenlabs_voice_id}
                  onChange={(e) =>
                    setFormData({ ...formData, elevenlabs_voice_id: e.target.value })
                  }
                  placeholder="pl. NOpBlnGInO9m6vDvFkFC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Név *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="pl. Magyar Férfi 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Leírás</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Rövid leírás a hangról..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Nem</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value: "male" | "female" | "neutral") =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Férfi</SelectItem>
                      <SelectItem value="female">Női</SelectItem>
                      <SelectItem value="neutral">Semleges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Nyelv</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) =>
                      setFormData({ ...formData, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hu">Magyar</SelectItem>
                      <SelectItem value="en">Angol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sample_text">Minta szöveg</Label>
                <Textarea
                  id="sample_text"
                  value={formData.sample_text}
                  onChange={(e) =>
                    setFormData({ ...formData, sample_text: e.target.value })
                  }
                  placeholder="Szöveg a hang előnézetéhez..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label>Aktív</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Mégse
              </Button>
              <Button onClick={handleSave}>Mentés</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {voices?.map((voice) => (
          <Card
            key={voice.id}
            className={`relative ${!voice.is_active ? "opacity-60" : ""}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <CardTitle className="text-base">{voice.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePlayPreview(voice)}
                    disabled={voicePreview.isPending && playingVoiceId !== voice.id}
                  >
                    {playingVoiceId === voice.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenModal(voice)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(voice.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {voice.description && (
                <p className="text-sm text-muted-foreground">
                  {voice.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {voice.gender === "male"
                    ? "Férfi"
                    : voice.gender === "female"
                    ? "Női"
                    : "Semleges"}
                </Badge>
                <Badge variant="outline">{voice.language.toUpperCase()}</Badge>
                {!voice.is_active && (
                  <Badge variant="destructive">Inaktív</Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {voice.elevenlabs_voice_id.slice(0, 12)}...
                </code>
                <Switch
                  checked={voice.is_active}
                  onCheckedChange={() => handleToggleActive(voice)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!voices || voices.length === 0) && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Még nincsenek hangok. Adj hozzá egyet a fenti gombbal!
          </p>
        </Card>
      )}
    </div>
  );
}
