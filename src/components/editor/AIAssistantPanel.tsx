import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Send,
  Loader2,
  Play,
  RefreshCw,
  Minimize2,
  Maximize2,
  MessageSquare,
  FileText,
  ChevronDown,
  BookOpen,
  Users,
  Mic,
  Copy,
  Check,
  X,
  Plus,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAIGeneration, AIAction, AISettings, AIContext } from "@/hooks/useAIGeneration";
import { toast } from "sonner";

interface AIAssistantPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  projectId: string;
  projectGenre?: string;
  projectDescription?: string;
  projectTone?: string;
  currentChapterId?: string;
  currentChapterTitle?: string;
  currentChapterContent?: string;
  characterCount?: number;
  charactersContext?: string;
  sourcesContext?: string;
  selectedText?: string;
  onInsertText?: (text: string) => void;
}

type QuickAction = {
  id: AIAction;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresSelection?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: "write_chapter", label: "Fejezet", icon: <Wand2 className="h-4 w-4" />, description: "Teljes fejezet megírása" },
  { id: "continue", label: "Folytatás", icon: <Play className="h-4 w-4" />, description: "Folytatás a kurzortól" },
  { id: "rewrite", label: "Átírás", icon: <RefreshCw className="h-4 w-4" />, description: "Kijelölt szöveg átírása", requiresSelection: true },
  { id: "shorten", label: "Rövidítés", icon: <Minimize2 className="h-4 w-4" />, description: "Szöveg rövidítése", requiresSelection: true },
  { id: "expand", label: "Bővítés", icon: <Maximize2 className="h-4 w-4" />, description: "Szöveg kibővítése", requiresSelection: true },
  { id: "dialogue", label: "Dialógus", icon: <MessageSquare className="h-4 w-4" />, description: "Párbeszéd generálása" },
  { id: "description", label: "Leírás", icon: <FileText className="h-4 w-4" />, description: "Leírás generálása" },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function AIAssistantPanel({
  isCollapsed,
  onToggleCollapse,
  projectId,
  projectGenre = "fiction",
  projectDescription,
  projectTone,
  currentChapterId,
  currentChapterTitle = "Bevezető",
  currentChapterContent,
  characterCount = 0,
  charactersContext,
  sourcesContext,
  selectedText,
  onInsertText,
}: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Generation settings
  const [creativity, setCreativity] = useState([50]);
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [useProjectStyle, setUseProjectStyle] = useState(true);

  const settings: AISettings = {
    creativity: creativity[0],
    length,
    useProjectStyle,
  };

  const { isGenerating, generatedText, generate, cancel, reset } = useAIGeneration({
    projectId,
    chapterId: currentChapterId,
    genre: projectGenre,
  });

  // Update streaming message
  useEffect(() => {
    if (isGenerating && generatedText) {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === "assistant" && lastMsg.isStreaming) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: generatedText } : m
          );
        }
        return prev;
      });
    }
  }, [generatedText, isGenerating]);

  // Finalize streaming message
  useEffect(() => {
    if (!isGenerating && generatedText) {
      setMessages((prev) =>
        prev.map((m) =>
          m.isStreaming ? { ...m, isStreaming: false } : m
        )
      );
    }
  }, [isGenerating, generatedText]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = (): AIContext => {
    const context: AIContext = {};
    
    if (projectDescription) context.bookDescription = projectDescription;
    if (projectTone && useProjectStyle) context.tone = projectTone;
    
    // Include last ~2000 characters of chapter content
    if (currentChapterContent) {
      const maxChars = 2000;
      context.chapterContent = currentChapterContent.length > maxChars
        ? currentChapterContent.slice(-maxChars)
        : currentChapterContent;
    }
    
    // For fiction, include character context
    if ((projectGenre === "fiction" || projectGenre === "erotikus") && charactersContext) {
      context.characters = charactersContext;
    }
    
    // For non-fiction, include sources
    if (projectGenre === "szakkonyv" && sourcesContext) {
      context.sources = sourcesContext;
    }
    
    return context;
  };

  const buildPrompt = (action: AIAction): string => {
    switch (action) {
      case "write_chapter":
        return `Írd meg a "${currentChapterTitle}" című fejezetet teljes terjedelmében.
${projectDescription ? `A könyv témája: ${projectDescription}.` : ""}
Műfaj: ${projectGenre}.
${projectTone ? `Hangnem: ${projectTone}.` : ""}
Írj legalább 500 szavas, jól strukturált fejezetet bekezdésekkel.`;
      case "continue":
        return "Folytasd a szöveget természetesen, megtartva a stílust.";
      case "rewrite":
        return selectedText 
          ? `Írd át ezt a szöveget jobban, megtartva az értelmét:\n\n"${selectedText}"`
          : "Nincs kijelölt szöveg az átíráshoz.";
      case "shorten":
        return selectedText
          ? `Tömörítsd ezt a szöveget, megtartva a lényeget:\n\n"${selectedText}"`
          : "Nincs kijelölt szöveg a rövidítéshez.";
      case "expand":
        return selectedText
          ? `Bővítsd ki ezt a szöveget részletesebb leírásokkal:\n\n"${selectedText}"`
          : "Nincs kijelölt szöveg a bővítéshez.";
      case "dialogue":
        return "Írj természetes párbeszédet a karakterek között a jelenlegi kontextus alapján.";
      case "description":
        return "Írj részletes, érzékletes leírást a jelenlegi jelenetről.";
      default:
        return prompt;
    }
  };

  const handleQuickAction = async (actionId: AIAction) => {
    const action = QUICK_ACTIONS.find((a) => a.id === actionId);
    if (!action) return;

    // Check if action requires selection
    if (action.requiresSelection && !selectedText) {
      toast.error("Jelölj ki szöveget a szerkesztőben ehhez a művelethez!");
      return;
    }

    const actionPrompt = buildPrompt(actionId);
    const context = buildContext();

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `[${action.label}] ${action.description}` },
    ]);

    // Add streaming placeholder
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isStreaming: true },
    ]);

    reset();
    await generate(actionId, actionPrompt, context, settings);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return;

    const userMessage = prompt.trim();
    setPrompt("");
    
    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    // Add streaming placeholder
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isStreaming: true },
    ]);

    const context = buildContext();
    reset();
    await generate("chat", userMessage, context, settings);
  };

  const handleInsert = () => {
    if (generatedText && onInsertText) {
      onInsertText(generatedText);
      toast.success("Szöveg beillesztve!");
    }
  };

  const handleCopy = async () => {
    if (!generatedText) return;
    await navigator.clipboard.writeText(generatedText);
    setCopied(true);
    toast.success("Másolva!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) return;

    // Check if it was a quick action
    const actionMatch = lastUserMessage.content.match(/^\[([^\]]+)\]/);
    if (actionMatch) {
      const actionLabel = actionMatch[1];
      const action = QUICK_ACTIONS.find((a) => a.label === actionLabel);
      if (action) {
        // Remove last assistant message
        setMessages((prev) => prev.filter((_, i) => i !== prev.length - 1));
        // Re-add streaming placeholder
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "", isStreaming: true },
        ]);
        const context = buildContext();
        reset();
        await generate(action.id, buildPrompt(action.id), context, settings);
        return;
      }
    }

    // Regular chat regeneration
    const originalPrompt = lastUserMessage.content;
    setMessages((prev) => prev.filter((_, i) => i !== prev.length - 1));
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isStreaming: true },
    ]);
    const context = buildContext();
    reset();
    await generate("chat", originalPrompt, context, settings);
  };

  const getCreativityLabel = (value: number) => {
    if (value <= 25) return "Konzervatív";
    if (value <= 50) return "Kiegyensúlyozott";
    if (value <= 75) return "Kreatív";
    return "Nagyon kreatív";
  };

  const getModelBadge = () => {
    // Using Gemini Flash via Lovable AI Gateway
    return "Gemini Flash";
  };

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-l border-border bg-sidebar-background transition-all duration-300",
        isCollapsed ? "w-12" : "w-[350px]"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-foreground">AI Asszisztens</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {getModelBadge()}
            </Badge>
          </div>
        ) : (
          <Sparkles className="h-5 w-5 text-secondary" />
        )}
      </div>

      {!isCollapsed && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Quick Actions */}
          <div className="border-b border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Gyors műveletek</p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant={action.id === "write_chapter" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickAction(action.id)}
                  disabled={isGenerating}
                  className={cn(
                    "flex h-auto flex-col gap-1 py-2 text-xs",
                    action.id === "write_chapter" && "bg-secondary text-secondary-foreground hover:bg-secondary/90 col-span-2",
                    action.requiresSelection && !selectedText && "opacity-50"
                  )}
                  title={action.requiresSelection && !selectedText 
                    ? "Jelölj ki szöveget a használathoz"
                    : action.description
                  }
                >
                  {action.icon}
                  <span>{action.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Context Display */}
          <div className="border-b border-border bg-muted/30 px-3 py-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Kontextus</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs">
                <BookOpen className="h-3 w-3 text-primary" />
                <span>{currentChapterTitle}</span>
              </div>
              {characterCount > 0 && (
                <div className="flex items-center gap-1 rounded bg-background px-2 py-1 text-xs">
                  <Users className="h-3 w-3 text-secondary" />
                  <span>{characterCount} karakter</span>
                </div>
              )}
              {selectedText && (
                <div className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                  <span>Kijelölés: {selectedText.length} kar.</span>
                </div>
              )}
            </div>
          </div>

          {/* Generation Settings */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50">
              <span>Generálási beállítások</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  settingsOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-b border-border px-3 py-3 space-y-4">
              {/* Creativity Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Kreativitás</Label>
                  <span className="text-xs text-muted-foreground">
                    {getCreativityLabel(creativity[0])}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Konzervatív</span>
                  <Slider
                    value={creativity}
                    onValueChange={setCreativity}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">Kreatív</span>
                </div>
              </div>

              {/* Length Selection */}
              <div className="space-y-2">
                <Label className="text-xs">Hossz</Label>
                <RadioGroup
                  value={length}
                  onValueChange={(v) => setLength(v as "short" | "medium" | "long")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="short" id="short" />
                    <Label htmlFor="short" className="text-xs cursor-pointer">
                      Rövid (~300 szó)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="text-xs cursor-pointer">
                      Közepes (~1200 szó)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="long" id="long" />
                    <Label htmlFor="long" className="text-xs cursor-pointer">
                      Hosszú (~3500 szó)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Style Override */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Projekt stílus használata</Label>
                <Switch
                  checked={useProjectStyle}
                  onCheckedChange={setUseProjectStyle}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Chat Messages */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-6">
                  <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Használd a gyors műveleteket, vagy kérdezz bármit!
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg p-3 text-sm",
                        msg.role === "user"
                          ? "bg-primary/10 text-foreground ml-4"
                          : "bg-muted text-foreground mr-4"
                      )}
                    >
                      {msg.content || (msg.isStreaming && (
                        <span className="animate-pulse">▊</span>
                      ))}
                    </div>
                  ))}
                  
                  {/* Action buttons for last assistant message */}
                  {!isGenerating && generatedText && messages[messages.length - 1]?.role === "assistant" && (
                    <div className="flex flex-wrap gap-2 ml-4">
                      {onInsertText && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleInsert}
                          className="h-7 text-xs gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Beillesztés
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopy}
                        className="h-7 text-xs gap-1"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? "Másolva" : "Másolás"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRegenerate}
                        className="h-7 text-xs gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Új generálás
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              {isGenerating && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Generálás...</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancel}
                    className="h-7 text-xs gap-1"
                  >
                    <X className="h-3 w-3" />
                    Mégse
                  </Button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

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
                placeholder="Kérdezz vagy kérj segítséget..."
                className="min-h-[80px] resize-none pr-20"
                disabled={isGenerating}
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Hangbemenet (hamarosan)"
                  disabled
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isGenerating}
                  className="h-8 w-8 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
