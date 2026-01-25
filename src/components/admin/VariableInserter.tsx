import { useState } from "react";
import { Search, User, CreditCard, BookOpen, Lock, BarChart, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { 
  EMAIL_VARIABLES, 
  EMAIL_VARIABLE_CATEGORIES,
  type EmailVariable 
} from "@/constants/emailVariables";

interface VariableInserterProps {
  onInsert: (variable: string) => void;
  className?: string;
}

const categoryIcons = {
  user: User,
  subscription: CreditCard,
  project: BookOpen,
  auth: Lock,
  usage: BarChart,
  system: Settings,
};

export function VariableInserter({ onInsert, className }: VariableInserterProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredVariables = EMAIL_VARIABLES.filter(v => {
    const matchesSearch = !search || 
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || v.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedVariables = filteredVariables.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, EmailVariable[]>);

  const handleInsert = (variable: EmailVariable, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only send the variable name, the wrapper {{}} will be added by the editor
    onInsert(variable.name);
  };

  return (
    <div className={cn("border rounded-lg bg-muted/30", className)}>
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Változó keresése..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 flex-wrap">
          <TabsTrigger 
            value="all" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            Mind
          </TabsTrigger>
          {Object.entries(EMAIL_VARIABLE_CATEGORIES).map(([key, { label }]) => {
            const Icon = categoryIcons[key as keyof typeof categoryIcons];
            return (
              <TabsTrigger 
                key={key} 
                value={key}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <ScrollArea className="h-[200px]">
          <div className="p-2 space-y-1">
            {activeCategory === "all" ? (
              Object.entries(groupedVariables).map(([category, variables]) => (
                <div key={category} className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                    {EMAIL_VARIABLE_CATEGORIES[category as keyof typeof EMAIL_VARIABLE_CATEGORIES]?.label}
                  </div>
                  {variables.map((v) => (
                    <VariableButton key={v.name} variable={v} onInsert={handleInsert} />
                  ))}
                </div>
              ))
            ) : (
              filteredVariables.map((v) => (
                <VariableButton key={v.name} variable={v} onInsert={handleInsert} />
              ))
            )}
            {filteredVariables.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nincs találat
              </div>
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function VariableButton({ 
  variable, 
  onInsert 
}: { 
  variable: EmailVariable; 
  onInsert: (v: EmailVariable, e: React.MouseEvent) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start h-auto py-2 px-2 text-left"
      onClick={(e) => onInsert(variable, e)}
    >
      <div className="flex flex-col items-start gap-0.5">
        <code className="text-xs font-mono text-primary">{`{{${variable.name}}}`}</code>
        <span className="text-xs text-muted-foreground">{variable.description}</span>
      </div>
    </Button>
  );
}
