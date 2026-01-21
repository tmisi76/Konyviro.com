import { useState } from "react";
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

interface AIAssistantPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  projectGenre?: string;
  currentChapterTitle?: string;
  characterCount?: number;
}

type QuickAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: "continue", label: "Folytatás", icon: <Play className="h-4 w-4" />, description: "Folytatás a kurzortól" },
  { id: "rewrite", label: "Átírás", icon: <RefreshCw className="h-4 w-4" />, description: "Kijelölt szöveg átírása" },
  { id: "shorten", label: "Rövidítés", icon: <Minimize2 className="h-4 w-4" />, description: "Szöveg rövidítése" },
  { id: "expand", label: "Bővítés", icon: <Maximize2 className="h-4 w-4" />, description: "Szöveg kibővítése" },
  { id: "dialogue", label: "Dialógus", icon: <MessageSquare className="h-4 w-4" />, description: "Párbeszéd generálása" },
  { id: "description", label: "Leírás", icon: <FileText className="h-4 w-4" />, description: "Leírás generálása" },
];

export function AIAssistantPanel({
  isCollapsed,
  onToggleCollapse,
  projectGenre,
  currentChapterTitle = "Bevezető",
  characterCount = 0,
}: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Generation settings
  const [creativity, setCreativity] = useState([50]);
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [useProjectStyle, setUseProjectStyle] = useState(true);

  const handleQuickAction = (actionId: string) => {
    const action = QUICK_ACTIONS.find((a) => a.id === actionId);
    if (!action) return;

    setMessages((prev) => [...prev, { role: "user", content: `[${action.label}] ${action.description}` }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `A "${action.label}" funkció hamarosan elérhető lesz! Itt fogom végrehajtani a kért műveletet.`,
        },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response
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

  const getCreativityLabel = (value: number) => {
    if (value <= 25) return "Konzervatív";
    if (value <= 50) return "Kiegyensúlyozott";
    if (value <= 75) return "Kreatív";
    return "Nagyon kreatív";
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
              Claude Sonnet 4.5
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
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.id)}
                  className="flex h-auto flex-col gap-1 py-2 text-xs"
                  title={action.description}
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
                      Rövid
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="text-xs cursor-pointer">
                      Közepes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="long" id="long" />
                    <Label htmlFor="long" className="text-xs cursor-pointer">
                      Hosszú
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
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Használd a gyors műveleteket, vagy kérdezz bármit!
                </p>
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
                placeholder="Kérdezz vagy kérj segítséget..."
                className="min-h-[80px] resize-none pr-20"
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
                  disabled={!prompt.trim() || isLoading}
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
