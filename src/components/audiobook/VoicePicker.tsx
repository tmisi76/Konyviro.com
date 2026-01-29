import { useState, useRef } from "react";
import { Play, Pause, Loader2, Check, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useTTSVoices, useVoicePreview } from "@/hooks/useAudiobook";
import type { TTSVoice } from "@/types/audiobook";
import { cn } from "@/lib/utils";

interface VoicePickerProps {
  sampleText: string;
  selectedVoiceId: string | null;
  onSelect: (voiceId: string) => void;
}

export function VoicePicker({ sampleText, selectedVoiceId, onSelect }: VoicePickerProps) {
  const { data: voices, isLoading } = useTTSVoices();
  const previewMutation = useVoicePreview();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreview = async (voice: TTSVoice) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      return;
    }

    setPlayingVoiceId(voice.id);
    
    try {
      const audioUrl = await previewMutation.mutateAsync({
        voiceId: voice.elevenlabs_voice_id,
        sampleText: voice.sample_text || sampleText,
      });

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setPlayingVoiceId(null);
      };

      await audio.play();
    } catch {
      setPlayingVoiceId(null);
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case "male":
        return "👨";
      case "female":
        return "👩";
      default:
        return "🎙️";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!voices?.length) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Nincsenek elérhető hangok. Kérlek, jelezd az adminisztrátornak.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Volume2 className="h-4 w-4" />
        <span>Kattints az „Előnézet" gombra a hang kipróbálásához</span>
      </div>

      <RadioGroup
        value={selectedVoiceId || ""}
        onValueChange={onSelect}
        className="grid gap-3 md:grid-cols-2"
      >
        {voices.map((voice) => {
          const isPlaying = playingVoiceId === voice.id;
          const isPreviewLoading = previewMutation.isPending && playingVoiceId === voice.id;
          const isSelected = selectedVoiceId === voice.id;

          return (
            <Card
              key={voice.id}
              className={cn(
                "relative cursor-pointer transition-all hover:shadow-md",
                isSelected && "ring-2 ring-primary"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <RadioGroupItem value={voice.id} id={voice.id} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={voice.id}
                        className="flex items-center gap-2 cursor-pointer text-base font-medium"
                      >
                        <span className="text-lg">{getGenderIcon(voice.gender)}</span>
                        {voice.name}
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </Label>
                      {voice.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {voice.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {voice.language.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePreview(voice);
                    }}
                    disabled={isPreviewLoading}
                    className="shrink-0"
                  >
                    {isPreviewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span className="ml-1.5">
                      {isPlaying ? "Stop" : "Előnézet"}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>

      {sampleText && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Minta a könyvedből:</p>
          <p className="text-sm italic">„{sampleText.slice(0, 150)}..."</p>
        </div>
      )}
    </div>
  );
}
