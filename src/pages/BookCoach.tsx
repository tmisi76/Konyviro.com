import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Send, RotateCcw, BookOpen, GraduationCap, Flame, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useBookCoach, CoachSummary } from "@/hooks/useBookCoach";
import { useCoachToAutoWrite } from "@/hooks/useCoachToAutoWrite";
import { useAdultVerification } from "@/hooks/useAdultVerification";
import { AgeVerificationModal } from "@/components/projects/AgeVerificationModal";
import { cn } from "@/lib/utils";

type CoachGenre = "szakkonyv" | "fiction" | "erotikus";

const GENRE_CONFIG: { id: CoachGenre; label: string; icon: React.ReactNode; description: string; isAdult?: boolean }[] = [
  { 
    id: "szakkonyv", 
    label: "Szakkönyv", 
    icon: <GraduationCap className="h-8 w-8" />, 
    description: "Önfejlesztés, üzlet, tech, oktatás" 
  },
  { 
    id: "fiction", 
    label: "Regény", 
    icon: <BookOpen className="h-8 w-8" />, 
    description: "Fantasy, krimi, romantikus, sci-fi" 
  },
  { 
    id: "erotikus", 
    label: "Erotikus", 
    icon: <Flame className="h-8 w-8" />, 
    description: "18+ felnőtt irodalom",
    isAdult: true
  },
];

export default function BookCoach() {
  const navigate = useNavigate();
  const [selectedGenre, setSelectedGenre] = useState<CoachGenre | null>(null);
  const [input, setInput] = useState("");
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [pendingGenre, setPendingGenre] = useState<CoachGenre | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { isVerified, verifyAdultContent } = useAdultVerification();
  
  // Use "szakkönyv" for the edge function but "szakkonyv" internally
  const edgeFunctionGenre = selectedGenre === "szakkonyv" ? "szakkönyv" : selectedGenre || "fiction";
  const { messages, isLoading, summary, sendMessage, reset } = useBookCoach(edgeFunctionGenre);
  const { isCreating, progress, startAutoWrite } = useCoachToAutoWrite();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea when genre is selected
  useEffect(() => {
    if (selectedGenre && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedGenre]);

  const handleGenreSelect = (genre: CoachGenre) => {
    if (genre === "erotikus" && !isVerified) {
      setPendingGenre(genre);
      setShowAgeVerification(true);
      return;
    }
    setSelectedGenre(genre);
    reset();
  };

  const handleAgeVerificationConfirm = async () => {
    await verifyAdultContent();
    setShowAgeVerification(false);
    if (pendingGenre) {
      setSelectedGenre(pendingGenre);
      setPendingGenre(null);
      reset();
    }
  };

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStartWriting = async () => {
    if (!summary || !selectedGenre) return;
    
    const wizardGenre = selectedGenre === "szakkonyv" ? "szakkonyv" : 
                        selectedGenre === "erotikus" ? "fiction" : "fiction";
    
    const projectId = await startAutoWrite(summary, wizardGenre, selectedGenre === "erotikus" ? "erotikus" : undefined);
    
    if (projectId) {
      navigate(`/project/${projectId}`);
    }
  };

  const handleBack = () => {
    if (selectedGenre) {
      setSelectedGenre(null);
      reset();
    } else {
      navigate("/dashboard");
    }
  };

  // Strip JSON from displayed messages
  const cleanMessageContent = (content: string) => {
    return content
      .replace(/```json[\s\S]*?```/g, "")
      .replace(/\{[\s\S]*"complete"\s*:\s*true[\s\S]*\}/g, "")
      .trim();
  };

  // Parse summary for display
  const getSummaryItems = (summary: CoachSummary) => {
    const items: { label: string; value: string }[] = [];
    const s = summary.summary;
    
    if (s.topic) items.push({ label: "Téma", value: s.topic });
    if (s.subgenre) items.push({ label: "Alműfaj", value: s.subgenre });
    if (s.audience) items.push({ label: "Célközönség", value: s.audience });
    if (s.protagonist) items.push({ label: "Főszereplő", value: s.protagonist });
    if (s.conflict) items.push({ label: "Konfliktus", value: s.conflict });
    if (s.setting) items.push({ label: "Helyszín", value: s.setting });
    if (s.toneRecommendation) items.push({ label: "Hangnem", value: s.toneRecommendation });
    if (s.targetLength) items.push({ label: "Hossz", value: s.targetLength });
    if (s.keyLearnings?.length) items.push({ label: "Fő tanulságok", value: s.keyLearnings.join(", ") });
    if (s.suggestedOutline?.length) items.push({ label: "Fejezetek", value: `${s.suggestedOutline.length} fejezet` });
    
    return items;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Könyv Coach</h1>
          </div>
          {selectedGenre && (
            <Badge variant="secondary" className="ml-auto">
              {GENRE_CONFIG.find(g => g.id === selectedGenre)?.label}
            </Badge>
          )}
        </div>
      </header>

      <main className="container py-6">
        <AnimatePresence mode="wait">
          {!selectedGenre ? (
            // Genre Selection
            <motion.div
              key="genre-select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Mit szeretnél írni?</h2>
                <p className="text-muted-foreground">
                  Válaszd ki a műfajt, és segítek megtervezni a könyvedet
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {GENRE_CONFIG.map((genre) => (
                  <Card
                    key={genre.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary hover:shadow-lg",
                      genre.isAdult && "border-orange-500/30"
                    )}
                    onClick={() => handleGenreSelect(genre.id)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className={cn(
                        "inline-flex p-4 rounded-full mb-4",
                        genre.isAdult ? "bg-orange-500/10 text-orange-500" : "bg-primary/10 text-primary"
                      )}>
                        {genre.icon}
                      </div>
                      <h3 className="font-semibold mb-1">{genre.label}</h3>
                      <p className="text-sm text-muted-foreground">{genre.description}</p>
                      {genre.isAdult && (
                        <Badge variant="outline" className="mt-2 text-orange-500 border-orange-500/50">
                          18+
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          ) : isCreating ? (
            // Creating project / AutoWrite starting
            <motion.div
              key="creating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto text-center py-12"
            >
              <div className="inline-flex p-6 rounded-full bg-primary/10 mb-6">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Könyv létrehozása...</h2>
              <p className="text-muted-foreground mb-6">{progress}</p>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 30, ease: "linear" }}
                />
              </div>
            </motion.div>
          ) : (
            // Chat Interface
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-6 lg:grid-cols-[1fr_320px]"
            >
              {/* Chat Column */}
              <Card className="flex flex-col h-[calc(100vh-12rem)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Tervezési beszélgetés
                  </CardTitle>
                </CardHeader>
                <Separator />
                
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const cleanContent = cleanMessageContent(message.content);
                      if (!cleanContent) return null;
                      
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
                            message.role === "user" && "justify-end"
                          )}
                        >
                          {message.role === "assistant" && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-lg px-4 py-2 max-w-[80%]",
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{cleanContent}</p>
                            {message.isStreaming && (
                              <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator />
                
                {/* Input */}
                <div className="p-4 space-y-3">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Írd be a válaszod..."
                    className="min-h-[80px] resize-none"
                    disabled={isLoading || !!summary}
                  />
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGenre(null);
                        reset();
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Újrakezdés
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={!input.trim() || isLoading || !!summary}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Küldés
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Summary Column */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className={cn(
                        "h-4 w-4",
                        summary ? "text-green-500" : "text-muted-foreground"
                      )} />
                      Összefoglaló
                    </CardTitle>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-4">
                    {summary ? (
                      <div className="space-y-3">
                        {getSummaryItems(summary).map((item, i) => (
                          <div key={i}>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {item.label}
                            </p>
                            <p className="text-sm">{item.value}</p>
                          </div>
                        ))}
                        
                        {summary.summary.suggestedOutline && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                              Fejezetek
                            </p>
                            <ol className="text-sm space-y-1 list-decimal list-inside">
                              {summary.summary.suggestedOutline.slice(0, 5).map((ch, i) => (
                                <li key={i} className="text-muted-foreground">{ch}</li>
                              ))}
                              {summary.summary.suggestedOutline.length > 5 && (
                                <li className="text-muted-foreground">
                                  +{summary.summary.suggestedOutline.length - 5} további...
                                </li>
                              )}
                            </ol>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Válaszolj a kérdésekre a könyv megtervezéséhez
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Action Button */}
                {summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleStartWriting}
                    >
                      <BookOpen className="h-5 w-5 mr-2" />
                      Könyv automatikus írása
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      A coach által megtervezett könyv automatikus megírása
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AgeVerificationModal
        open={showAgeVerification}
        onOpenChange={setShowAgeVerification}
        onConfirm={handleAgeVerificationConfirm}
        onCancel={() => {
          setShowAgeVerification(false);
          setPendingGenre(null);
        }}
      />
    </div>
  );
}
