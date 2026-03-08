import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BookOpen, ArrowRight, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_DEMO_WORDS = 500;

export default function Demo() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [wordsUsed, setWordsUsed] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  const wordCount = generatedText.split(/\s+/).filter(Boolean).length;

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Adj meg egy témát vagy leírást!");
      return;
    }
    if (wordsUsed >= MAX_DEMO_WORDS) {
      setShowOverlay(true);
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate", {
        body: {
          prompt: `Írj egy rövid, érdekes könyvrészletet (max 200 szó) a következő témáról: ${prompt}`,
          type: "demo",
          max_tokens: 500,
        },
      });

      if (error) throw error;
      const text = data?.text || data?.content || "";
      setGeneratedText((prev) => (prev ? prev + "\n\n" + text : text));
      const newWords = text.split(/\s+/).filter(Boolean).length;
      setWordsUsed((prev) => {
        const total = prev + newWords;
        if (total >= MAX_DEMO_WORDS) setShowOverlay(true);
        return total;
      });
    } catch (err: any) {
      toast.error("Hiba történt a generálás során");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, wordsUsed]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">KönyvÍró AI – Demo</span>
          </div>
          <Button onClick={() => navigate("/auth?mode=register")} size="sm">
            Regisztráció
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 text-center">
          <Badge className="mb-4">Ingyenes próba – regisztráció nélkül</Badge>
          <h1 className="text-3xl font-bold text-foreground">
            Próbáld ki az AI könyvírást
          </h1>
          <p className="mt-2 text-muted-foreground">
            Adj meg egy témát, és az AI ír neked egy rövid részletet. {MAX_DEMO_WORDS} szó korlát.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Miről szóljon a könyved?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Pl. Egy fiatal varázsló, aki felfedezi, hogy a nagyszülei titkos társaság tagjai voltak..."
              rows={3}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {wordsUsed} / {MAX_DEMO_WORDS} szó felhasználva
              </span>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || wordsUsed >= MAX_DEMO_WORDS}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generálás...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generálás
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {generatedText && (
          <Card>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {generatedText}
              </div>
              <div className="mt-4 text-right text-sm text-muted-foreground">
                {wordCount} szó
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upgrade overlay */}
        {showOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Card className="mx-4 max-w-md">
              <CardContent className="p-8 text-center">
                <Lock className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h2 className="mb-2 text-xl font-bold text-foreground">
                  Elérted a demo limitet!
                </h2>
                <p className="mb-6 text-muted-foreground">
                  Regisztrálj ingyenesen, és írj teljes könyveket AI segítségével.
                  Havi 10 000 szó ingyenesen!
                </p>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => navigate("/auth?mode=register")} size="lg">
                    Ingyenes regisztráció
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => setShowOverlay(false)}>
                    Bezárás
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
