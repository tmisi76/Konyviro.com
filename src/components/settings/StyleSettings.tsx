import { useState } from "react";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  FileText, 
  Loader2,
  BarChart3,
  MessageSquare,
  BookOpen,
  Brain,
  Quote,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useWritingStyle } from "@/hooks/useWritingStyle";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

export function StyleSettings() {
  const {
    samples,
    styleProfile,
    isLoading,
    isAnalyzing,
    isSaving,
    addSample,
    deleteSample,
    analyzeStyle,
  } = useWritingStyle();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSample, setNewSample] = useState({ title: "", content: "" });

  const handleAddSample = async () => {
    if (!newSample.title.trim() || !newSample.content.trim()) return;
    
    const success = await addSample(newSample.title, newSample.content);
    if (success) {
      setNewSample({ title: "", content: "" });
      setIsAddModalOpen(false);
    }
  };

  const totalWords = samples.reduce((sum, s) => sum + s.wordCount, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-material-1">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Saját stílus</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Töltsd fel korábbi írásaidat, és az AI megtanulja az írói stílusodat. 
              Így a generált szövegek olyan lesznek, mintha te írtad volna.
            </p>
          </div>
        </div>
      </div>

      {/* Writing Samples Section */}
      <div className="rounded-xl border bg-card p-6 shadow-material-1">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Szövegminták</h3>
            <p className="text-sm text-muted-foreground">
              {samples.length} minta • {totalWords.toLocaleString("hu-HU")} szó összesen
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Minta hozzáadása
          </Button>
        </div>

        {samples.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/50 p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h4 className="mt-4 font-medium text-foreground">Nincs még szövegminta</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Adj hozzá korábbi írásaidat, hogy az AI elemezni tudja a stílusodat.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Első minta hozzáadása
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {samples.map((sample) => (
              <div
                key={sample.id}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-4"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-foreground truncate">{sample.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {sample.wordCount.toLocaleString("hu-HU")} szó • 
                    {format(new Date(sample.createdAt), " yyyy. MMM d.", { locale: hu })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteSample(sample.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Analyze Button */}
        {samples.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={analyzeStyle} 
              disabled={isAnalyzing}
              size="lg"
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Elemzés folyamatban...
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  Stílus elemzése
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Style Profile Section */}
      {styleProfile.analyzedAt && (
        <div className="rounded-xl border bg-card p-6 shadow-material-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Stílusprofil</h3>
            <Badge variant="secondary">
              {styleProfile.samplesAnalyzed} minta elemezve
            </Badge>
          </div>

          {/* Summary */}
          {styleProfile.styleSummary && (
            <div className="mb-6 rounded-lg bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{styleProfile.styleSummary}</p>
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Sentence Length */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  Átlagos mondathossz
                </span>
                <span className="font-medium text-foreground">
                  {styleProfile.avgSentenceLength?.toFixed(1) || "-"} szó
                </span>
              </div>
            </div>

            {/* Vocabulary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  Szókincs komplexitás
                </span>
                <span className="font-medium text-foreground">
                  {styleProfile.vocabularyComplexity?.toFixed(1) || "-"}/10
                </span>
              </div>
              <Progress 
                value={(styleProfile.vocabularyComplexity || 0) * 10} 
                className="h-2" 
              />
            </div>

            {/* Dialogue Ratio */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  Párbeszéd arány
                </span>
                <span className="font-medium text-foreground">
                  {((styleProfile.dialogueRatio || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={(styleProfile.dialogueRatio || 0) * 100} 
                className="h-2" 
              />
            </div>

            {/* Tone Analysis */}
            {styleProfile.toneAnalysis.formality !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Formalitás</span>
                  <span className="font-medium text-foreground">
                    {styleProfile.toneAnalysis.formality}/10
                  </span>
                </div>
                <Progress 
                  value={styleProfile.toneAnalysis.formality * 10} 
                  className="h-2" 
                />
              </div>
            )}

            {styleProfile.toneAnalysis.emotionality !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Érzelmesség</span>
                  <span className="font-medium text-foreground">
                    {styleProfile.toneAnalysis.emotionality}/10
                  </span>
                </div>
                <Progress 
                  value={styleProfile.toneAnalysis.emotionality * 10} 
                  className="h-2" 
                />
              </div>
            )}

            {styleProfile.toneAnalysis.descriptiveness !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Részletesség</span>
                  <span className="font-medium text-foreground">
                    {styleProfile.toneAnalysis.descriptiveness}/10
                  </span>
                </div>
                <Progress 
                  value={styleProfile.toneAnalysis.descriptiveness * 10} 
                  className="h-2" 
                />
              </div>
            )}
          </div>

          {/* Common Phrases */}
          {styleProfile.commonPhrases.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Quote className="h-4 w-4" />
                Jellemző kifejezések
              </h4>
              <div className="flex flex-wrap gap-2">
                {styleProfile.commonPhrases.map((phrase, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    „{phrase}"
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Last Analysis */}
          <p className="mt-4 text-xs text-muted-foreground">
            Utolsó elemzés: {format(new Date(styleProfile.analyzedAt), "yyyy. MMM d. HH:mm", { locale: hu })}
          </p>
        </div>
      )}

      {/* Add Sample Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Szövegminta hozzáadása</DialogTitle>
            <DialogDescription>
              Illeszd be egy korábbi írásodat, hogy az AI elemezni tudja a stílusodat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sample-title">Cím</Label>
              <Input
                id="sample-title"
                placeholder="Pl. Első regényem, 3. fejezet"
                value={newSample.title}
                onChange={(e) => setNewSample({ ...newSample, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample-content">Szöveg</Label>
              <Textarea
                id="sample-content"
                placeholder="Illeszd be a szöveget..."
                value={newSample.content}
                onChange={(e) => setNewSample({ ...newSample, content: e.target.value })}
                rows={12}
                className="font-serif"
              />
              <p className="text-xs text-muted-foreground">
                {newSample.content.trim().split(/\s+/).filter(w => w.length > 0).length} szó
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Mégse
            </Button>
            <Button 
              onClick={handleAddSample} 
              disabled={!newSample.title.trim() || !newSample.content.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mentés...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Hozzáadás
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
