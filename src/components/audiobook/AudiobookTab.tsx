import { useState } from "react";
import { Headphones, Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAudiobook } from "@/hooks/useAudiobook";
import { VoicePicker } from "./VoicePicker";
import { AudiobookProgress } from "./AudiobookProgress";
import { AudiobookPlayer } from "./AudiobookPlayer";

interface AudiobookTabProps {
  projectId: string;
  sampleText?: string;
}

export function AudiobookTab({ projectId, sampleText }: AudiobookTabProps) {
  const { audiobook, chapters, isLoading, startGeneration, getAudioUrl } = useAudiobook(projectId);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const handleStartGeneration = async () => {
    if (!selectedVoiceId) return;
    
    await startGeneration.mutateAsync({
      project_id: projectId,
      voice_id: selectedVoiceId,
    });
    
    setShowVoicePicker(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Show progress if audiobook is being generated
  if (audiobook && (audiobook.status === "pending" || audiobook.status === "processing")) {
    return (
      <div className="space-y-4">
        <AudiobookProgress audiobook={audiobook} chapters={chapters} />
      </div>
    );
  }

  // Show player if audiobook is completed
  if (audiobook && audiobook.status === "completed") {
    return (
      <div className="space-y-4">
        <AudiobookPlayer
          audiobook={audiobook}
          chapters={chapters || []}
          getAudioUrl={getAudioUrl}
        />
        <Button
          variant="outline"
          onClick={() => setShowVoicePicker(true)}
          className="w-full"
        >
          <Mic className="h-4 w-4 mr-2" />
          Új hangoskönyv készítése
        </Button>
        
        <Dialog open={showVoicePicker} onOpenChange={setShowVoicePicker}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Hangnarrátor kiválasztása</DialogTitle>
              <DialogDescription>
                Válassz egy hangot a hangoskönyvedhez. Az előnézet gombbal meghallgathatod a mintát.
              </DialogDescription>
            </DialogHeader>
            <VoicePicker
              sampleText={sampleText || "Ez egy minta szöveg a hang előnézetéhez."}
              selectedVoiceId={selectedVoiceId}
              onSelect={setSelectedVoiceId}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowVoicePicker(false)}>
                Mégse
              </Button>
              <Button
                onClick={handleStartGeneration}
                disabled={!selectedVoiceId || startGeneration.isPending}
              >
                {startGeneration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Hangoskönyv készítése
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Show failed state
  if (audiobook && audiobook.status === "failed") {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Hangoskönyv generálás sikertelen</CardTitle>
          <CardDescription>{audiobook.error_message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowVoicePicker(true)} className="w-full">
            <Mic className="h-4 w-4 mr-2" />
            Újrapróbálás
          </Button>
        </CardContent>
        
        <Dialog open={showVoicePicker} onOpenChange={setShowVoicePicker}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Hangnarrátor kiválasztása</DialogTitle>
              <DialogDescription>
                Válassz egy hangot a hangoskönyvedhez.
              </DialogDescription>
            </DialogHeader>
            <VoicePicker
              sampleText={sampleText || "Ez egy minta szöveg a hang előnézetéhez."}
              selectedVoiceId={selectedVoiceId}
              onSelect={setSelectedVoiceId}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowVoicePicker(false)}>
                Mégse
              </Button>
              <Button
                onClick={handleStartGeneration}
                disabled={!selectedVoiceId || startGeneration.isPending}
              >
                {startGeneration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Hangoskönyv készítése
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Show initial state - no audiobook yet
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Hangoskönyv készítése
          </CardTitle>
          <CardDescription>
            Alakítsd át a könyvedet professzionális hangoskönyvvé AI narrátorok segítségével.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              ✓ Válassz több magyar nyelvű hang közül
            </li>
            <li className="flex items-center gap-2">
              ✓ Fejezetenként generált audio
            </li>
            <li className="flex items-center gap-2">
              ✓ Letölthető MP3 formátumban
            </li>
          </ul>
          <Button onClick={() => setShowVoicePicker(true)} className="w-full">
            <Mic className="h-4 w-4 mr-2" />
            Narrátor kiválasztása
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showVoicePicker} onOpenChange={setShowVoicePicker}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hangnarrátor kiválasztása</DialogTitle>
            <DialogDescription>
              Válassz egy hangot a hangoskönyvedhez. Az előnézet gombbal meghallgathatod a mintát.
            </DialogDescription>
          </DialogHeader>
          <VoicePicker
            sampleText={sampleText || "Ez egy minta szöveg a hang előnézetéhez."}
            selectedVoiceId={selectedVoiceId}
            onSelect={setSelectedVoiceId}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowVoicePicker(false)}>
              Mégse
            </Button>
            <Button
              onClick={handleStartGeneration}
              disabled={!selectedVoiceId || startGeneration.isPending}
            >
              {startGeneration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hangoskönyv készítése
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
