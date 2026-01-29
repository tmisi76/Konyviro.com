import { useState, useEffect, useMemo } from "react";
import { Headphones, Mic, Loader2, Coins, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAudiobook } from "@/hooks/useAudiobook";
import { useAudiobookCredits } from "@/hooks/useAudiobookCredits";
import { VoicePicker } from "./VoicePicker";
import { AudiobookProgress } from "./AudiobookProgress";
import { AudiobookPlayer } from "./AudiobookPlayer";
import { BuyAudiobookCreditModal } from "./BuyAudiobookCreditModal";
import { estimateAudioMinutes, formatAudioMinutes } from "@/constants/audiobookCredits";
import type { Audiobook, TTSVoice } from "@/types/audiobook";
import { supabase } from "@/integrations/supabase/client";

interface AudiobookPlayerWrapperProps {
  audiobook: Audiobook & { voice: TTSVoice };
  getAudioUrl: (path: string) => Promise<string | null>;
  onDownload: () => void;
}

function AudiobookPlayerWrapper({ audiobook, getAudioUrl, onDownload }: AudiobookPlayerWrapperProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (audiobook.audio_url) {
      getAudioUrl(audiobook.audio_url).then(setAudioUrl);
    }
  }, [audiobook.audio_url, getAudioUrl]);

  if (!audioUrl) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AudiobookPlayer
      audioUrl={audioUrl}
      title="Hangoskönyv"
      voiceName={audiobook.voice?.name}
      duration={audiobook.duration_seconds || undefined}
      onDownload={onDownload}
    />
  );
}

interface AudiobookTabProps {
  projectId: string;
  sampleText?: string;
}

export function AudiobookTab({ projectId, sampleText }: AudiobookTabProps) {
  const { audiobook, chapters, isLoading, startGeneration, getAudioUrl } = useAudiobook(projectId);
  const { balance, isLoading: creditsLoading, hasEnoughCredits } = useAudiobookCredits();
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [totalCharacters, setTotalCharacters] = useState(0);

  // Fetch total character count from chapters
  useEffect(() => {
    async function fetchTotalCharacters() {
      const { data: chaptersData } = await supabase
        .from("chapters")
        .select("content")
        .eq("project_id", projectId);

      if (chaptersData) {
        const total = chaptersData.reduce((acc, ch) => acc + (ch.content?.length || 0), 0);
        setTotalCharacters(total);
      }
    }
    fetchTotalCharacters();
  }, [projectId]);

  const estimatedMinutes = useMemo(() => {
    return estimateAudioMinutes(String("x").repeat(totalCharacters));
  }, [totalCharacters]);

  const canGenerate = hasEnoughCredits(estimatedMinutes);

  const handleStartGeneration = async () => {
    if (!selectedVoiceId) return;
    
    if (!canGenerate) {
      setShowBuyModal(true);
      return;
    }
    
    await startGeneration.mutateAsync({
      project_id: projectId,
      voice_id: selectedVoiceId,
    });
    
    setShowVoicePicker(false);
  };

  // Credit display component
  const CreditDisplay = () => (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Hangoskönyv kredit</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono">
          {creditsLoading ? "..." : formatAudioMinutes(balance)}
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => setShowBuyModal(true)}>
          Vásárlás
        </Button>
      </div>
    </div>
  );

  // Cost estimate component
  const CostEstimate = () => {
    if (totalCharacters === 0) return null;
    
    return (
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Becsült hossz:</span>
          <span className="font-medium">{formatAudioMinutes(estimatedMinutes)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Egyenleged:</span>
          <span className={canGenerate ? "text-green-600 font-medium" : "text-destructive font-medium"}>
            {formatAudioMinutes(balance)}
          </span>
        </div>
        {!canGenerate && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nincs elég kredit. Szükséges: {formatAudioMinutes(estimatedMinutes - balance)} további.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
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
        <CreditDisplay />
        <AudiobookProgress audiobook={audiobook} chapters={chapters} />
        <BuyAudiobookCreditModal open={showBuyModal} onOpenChange={setShowBuyModal} />
      </div>
    );
  }

  // Show player if audiobook is completed
  if (audiobook && audiobook.status === "completed") {
    const handleDownload = async () => {
      if (!audiobook.audio_url) return;
      const signedUrl = await getAudioUrl(audiobook.audio_url);
      if (signedUrl) {
        const a = document.createElement("a");
        a.href = signedUrl;
        a.download = `audiobook-${projectId}.mp3`;
        a.click();
      }
    };

    return (
      <div className="space-y-4">
        <CreditDisplay />
        <AudiobookPlayerWrapper
          audiobook={audiobook}
          getAudioUrl={getAudioUrl}
          onDownload={handleDownload}
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
                Válassz egy hangot a hangoskönyvedhez.
              </DialogDescription>
            </DialogHeader>
            <CostEstimate />
            <VoicePicker
              sampleText={sampleText || "Ez egy minta szöveg a hang előnézetéhez."}
              selectedVoiceId={selectedVoiceId}
              onSelect={setSelectedVoiceId}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowVoicePicker(false)}>
                Mégse
              </Button>
              {!canGenerate ? (
                <Button onClick={() => { setShowVoicePicker(false); setShowBuyModal(true); }}>
                  <Coins className="h-4 w-4 mr-2" />
                  Kredit vásárlás
                </Button>
              ) : (
                <Button
                  onClick={handleStartGeneration}
                  disabled={!selectedVoiceId || startGeneration.isPending}
                >
                  {startGeneration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Hangoskönyv készítése
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <BuyAudiobookCreditModal open={showBuyModal} onOpenChange={setShowBuyModal} />
      </div>
    );
  }

  // Show failed state
  if (audiobook && audiobook.status === "failed") {
    return (
      <div className="space-y-4">
        <CreditDisplay />
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
        </Card>
        
        <Dialog open={showVoicePicker} onOpenChange={setShowVoicePicker}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Hangnarrátor kiválasztása</DialogTitle>
              <DialogDescription>
                Válassz egy hangot a hangoskönyvedhez.
              </DialogDescription>
            </DialogHeader>
            <CostEstimate />
            <VoicePicker
              sampleText={sampleText || "Ez egy minta szöveg a hang előnézetéhez."}
              selectedVoiceId={selectedVoiceId}
              onSelect={setSelectedVoiceId}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowVoicePicker(false)}>
                Mégse
              </Button>
              {!canGenerate ? (
                <Button onClick={() => { setShowVoicePicker(false); setShowBuyModal(true); }}>
                  <Coins className="h-4 w-4 mr-2" />
                  Kredit vásárlás
                </Button>
              ) : (
                <Button
                  onClick={handleStartGeneration}
                  disabled={!selectedVoiceId || startGeneration.isPending}
                >
                  {startGeneration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Hangoskönyv készítése
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <BuyAudiobookCreditModal open={showBuyModal} onOpenChange={setShowBuyModal} />
      </div>
    );
  }

  // Show initial state - no audiobook yet
  return (
    <>
      <CreditDisplay />
      <Card className="mt-4">
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
          {totalCharacters > 0 && (
            <div className="text-sm text-muted-foreground">
              Becsült hangoskönyv hossz: <strong>{formatAudioMinutes(estimatedMinutes)}</strong>
            </div>
          )}
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
          <CostEstimate />
          <VoicePicker
            sampleText={sampleText || "Ez egy minta szöveg a hang előnézetéhez."}
            selectedVoiceId={selectedVoiceId}
            onSelect={setSelectedVoiceId}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowVoicePicker(false)}>
              Mégse
            </Button>
            {!canGenerate ? (
              <Button onClick={() => { setShowVoicePicker(false); setShowBuyModal(true); }}>
                <Coins className="h-4 w-4 mr-2" />
                Kredit vásárlás
              </Button>
            ) : (
              <Button
                onClick={handleStartGeneration}
                disabled={!selectedVoiceId || startGeneration.isPending}
              >
                {startGeneration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Hangoskönyv készítése
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <BuyAudiobookCreditModal open={showBuyModal} onOpenChange={setShowBuyModal} />
    </>
  );
}
