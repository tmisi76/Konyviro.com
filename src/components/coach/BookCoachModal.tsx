import { useState, useRef, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Sparkles,
  BookOpen,
  User,
  Bot,
  Check,
  RotateCcw,
  X
} from "lucide-react";
import { useBookCoach, CoachSummary } from "@/hooks/useBookCoach";
import { cn } from "@/lib/utils";

interface BookCoachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  genre: "szakkönyv" | "fiction" | "erotikus";
  onComplete: (summary: CoachSummary) => void;
}

const GENRE_LABELS: Record<string, string> = {
  szakkönyv: "Szakkönyv",
  fiction: "Regény",
  erotikus: "Erotikus",
};

const GENRE_ICONS: Record<string, React.ReactNode> = {
  szakkönyv: <BookOpen className="h-4 w-4" />,
  fiction: <Sparkles className="h-4 w-4" />,
  erotikus: <MessageCircle className="h-4 w-4" />,
};

export function BookCoachModal({ open, onOpenChange, genre, onComplete }: BookCoachModalProps) {
  const { messages, isLoading, summary, sendMessage, reset, cancel } = useBookCoach(genre);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus textarea on open
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleComplete = () => {
    if (summary) {
      onComplete(summary);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    if (isLoading) cancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Könyv Coach</DialogTitle>
                <DialogDescription className="text-sm">
                  Segítek megtervezni a könyvedet
                </DialogDescription>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              {GENRE_ICONS[genre]}
              {GENRE_LABELS[genre]}
            </Badge>
          </div>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 max-w-[80%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {/* Strip JSON blocks from display */}
                    {message.content
                      .replace(/```json[\s\S]*?```/g, "")
                      .replace(/\{[\s\S]*"complete"\s*:\s*true[\s\S]*\}/g, "")
                      .trim()}
                    {message.isStreaming && (
                      <span className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse" />
                    )}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Summary Card */}
            {summary && (
              <Card className="mt-6 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Check className="h-5 w-5 text-green-500" />
                    Összefoglaló
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {summary.summary.topic && (
                    <div>
                      <span className="font-medium">Téma:</span> {summary.summary.topic}
                    </div>
                  )}
                  {summary.summary.audience && (
                    <div>
                      <span className="font-medium">Célközönség:</span> {summary.summary.audience}
                    </div>
                  )}
                  {summary.summary.subgenre && (
                    <div>
                      <span className="font-medium">Műfaj:</span> {summary.summary.subgenre}
                    </div>
                  )}
                  {summary.summary.protagonist && (
                    <div>
                      <span className="font-medium">Főszereplő:</span> {summary.summary.protagonist}
                    </div>
                  )}
                  {summary.summary.protagonists && (
                    <div>
                      <span className="font-medium">Főszereplők:</span> {summary.summary.protagonists}
                    </div>
                  )}
                  {summary.summary.setting && (
                    <div>
                      <span className="font-medium">Helyszín:</span> {summary.summary.setting}
                    </div>
                  )}
                  {summary.summary.keyLearnings && summary.summary.keyLearnings.length > 0 && (
                    <div>
                      <span className="font-medium">Fő tanulságok:</span>
                      <ul className="list-disc list-inside mt-1 ml-2">
                        {summary.summary.keyLearnings.map((learning, i) => (
                          <li key={i}>{learning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {summary.summary.suggestedOutline && summary.summary.suggestedOutline.length > 0 && (
                    <div>
                      <span className="font-medium">Javasolt vázlat:</span>
                      <ul className="list-disc list-inside mt-1 ml-2">
                        {summary.summary.suggestedOutline.map((chapter, i) => (
                          <li key={i}>{chapter}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {summary.summary.toneRecommendation && (
                    <div>
                      <span className="font-medium">Javasolt hangnem:</span> {summary.summary.toneRecommendation}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 shrink-0">
          {summary ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={reset}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Újrakezdés
              </Button>
              <Button
                onClick={handleComplete}
                className="flex-1 gap-2"
              >
                <Check className="h-4 w-4" />
                Projekt létrehozása ezekkel
              </Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Írd le a válaszod..."
                className="min-h-[52px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-[52px] w-[52px] shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
