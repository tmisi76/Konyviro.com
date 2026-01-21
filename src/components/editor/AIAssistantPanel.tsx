import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AIAssistantPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  projectGenre?: string;
}

export function AIAssistantPanel({
  isCollapsed,
  onToggleCollapse,
  projectGenre,
}: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response (would connect to actual AI in production)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "AI asszisztens hamarosan elérhető! Itt tudok majd segíteni a könyvírásban, karakterfejlesztésben, és történetszálak kidolgozásában.",
        },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-l border-border bg-sidebar-background transition-all duration-300",
        isCollapsed ? "w-12" : "w-80"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -left-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted"
      >
        {isCollapsed ? (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Header */}
      <div className={cn("border-b border-border p-3", isCollapsed && "flex justify-center")}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium text-foreground">AI Asszisztens</span>
          </div>
        ) : (
          <Sparkles className="h-5 w-5 text-secondary" />
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Kérdezz bármit a könyvírásról!
                </p>
                <div className="mt-4 space-y-2">
                  <SuggestionButton onClick={() => setPrompt("Segíts kidolgozni a főszereplőt")}>
                    Karakterfejlesztés
                  </SuggestionButton>
                  <SuggestionButton onClick={() => setPrompt("Írj egy drámai jelenetet")}>
                    Jelenet írása
                  </SuggestionButton>
                  <SuggestionButton onClick={() => setPrompt("Adj ötleteket a történethez")}>
                    Történet ötletek
                  </SuggestionButton>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg p-3 text-sm",
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground ml-4"
                      : "bg-muted text-foreground mr-4"
                  )}
                >
                  {msg.content}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Gondolkodom...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Kérdezz az AI-tól..."
                className="min-h-[80px] resize-none pr-12"
              />
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className="absolute bottom-2 right-2 h-8 w-8 bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function SuggestionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
