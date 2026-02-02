import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Save, Loader2, Zap, Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemSettings, useUpdateSystemSettings } from "@/hooks/admin/useSystemSettings";

// Available AI models from Lovable AI Gateway (verified list)
const AI_MODELS = [
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Legjobb képi+szöveges, komplex feladatokhoz" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview", description: "Következő generációs Gemini modell" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview", description: "Gyors előnézet, kiegyensúlyozott teljesítmény" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Gyors multimodális modell" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", description: "Leggyorsabb, egyszerű feladatokhoz" },
  { id: "openai/gpt-5", name: "GPT-5", description: "OpenAI legerősebb modellje, kiváló következtetés" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", description: "Költséghatékony, erős teljesítmény" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano", description: "Leggyorsabb, nagy volumenű feladatokhoz" },
  { id: "openai/gpt-5.2", name: "GPT-5.2", description: "OpenAI legújabb, továbbfejlesztett modell" },
];

const SUBSCRIPTION_TIERS = ['free', 'hobby', 'writer', 'pro'] as const;

interface AISettings {
  default_model: string;
  available_models: string[];
  temperature: number;
  token_limits: Record<string, number>;
  tier_models: Record<string, string[]>;
}

const DEFAULT_SETTINGS: AISettings = {
  default_model: "google/gemini-3-flash-preview",
  available_models: AI_MODELS.map(m => m.id),
  temperature: 0.7,
  token_limits: {
    free: 1000,
    hobby: 10000,
    writer: 50000,
    pro: 200000
  },
  tier_models: {
    free: ["google/gemini-2.5-flash-lite"],
    hobby: ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"],
    writer: ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "openai/gpt-5-mini"],
    pro: AI_MODELS.map(m => m.id)
  }
};

export default function AdminAISettings() {
  const { data: savedSettings, isLoading } = useSystemSettings('ai');
  const updateSettings = useUpdateSystemSettings();
  
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        default_model: savedSettings.ai_default_model || DEFAULT_SETTINGS.default_model,
        available_models: savedSettings.ai_available_models || DEFAULT_SETTINGS.available_models,
        temperature: savedSettings.ai_temperature || DEFAULT_SETTINGS.temperature,
        token_limits: savedSettings.ai_token_limits || DEFAULT_SETTINGS.token_limits,
        tier_models: savedSettings.ai_tier_models || DEFAULT_SETTINGS.tier_models
      });
    }
  }, [savedSettings]);

  const handleModelToggle = (modelId: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      available_models: checked
        ? [...prev.available_models, modelId]
        : prev.available_models.filter(m => m !== modelId)
    }));
    setHasChanges(true);
  };

  const handleTierModelToggle = (tier: string, modelId: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      tier_models: {
        ...prev.tier_models,
        [tier]: checked
          ? [...(prev.tier_models[tier] || []), modelId]
          : (prev.tier_models[tier] || []).filter(m => m !== modelId)
      }
    }));
    setHasChanges(true);
  };

  const handleTokenLimitChange = (tier: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setSettings(prev => ({
      ...prev,
      token_limits: {
        ...prev.token_limits,
        [tier]: numValue
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        ai_default_model: settings.default_model,
        ai_available_models: settings.available_models,
        ai_temperature: settings.temperature,
        ai_token_limits: settings.token_limits,
        ai_tier_models: settings.tier_models
      });
      toast.success("AI beállítások mentve!");
      setHasChanges(false);
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    }
  };

  const getTierName = (tier: string) => {
    const names: Record<string, string> = {
      free: 'Ingyenes',
      hobby: 'Hobbi',
      writer: 'Író',
      pro: 'PRO'
    };
    return names[tier] || tier;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Beállítások</h1>
          <p className="text-muted-foreground">Mesterséges intelligencia konfigurálása</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending || !hasChanges}>
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Mentés
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Default Model */}
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Könyvírási Modell
              <Badge variant="default" className="ml-2 bg-green-600">✓ Aktív</Badge>
            </CardTitle>
            <CardDescription>A könyvíráshoz és szövegszerkesztőhöz használt AI modell. Ez a beállítás közvetlenül befolyásolja a generálást.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select 
              value={settings.default_model} 
              onValueChange={(value) => {
                setSettings(prev => ({ ...prev, default_model: value }));
                setHasChanges(true);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Válassz modellt" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Temperature */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Kreativitás (Temperature)
              <Badge variant="secondary" className="ml-2">⏳ Hamarosan</Badge>
            </CardTitle>
            <CardDescription>AI válaszok variabilitása (0 = konzisztens, 1 = kreatív). Még nincs implementálva.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Alacsony</span>
              <span className="font-medium">{settings.temperature.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">Magas</span>
            </div>
            <Slider
              value={[settings.temperature]}
              onValueChange={([value]) => {
                setSettings(prev => ({ ...prev, temperature: value }));
                setHasChanges(true);
              }}
              min={0}
              max={1}
              step={0.05}
              disabled
            />
          </CardContent>
        </Card>

        {/* Token Limits */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Token Limitek
              <Badge variant="secondary" className="ml-2">⏳ Hamarosan</Badge>
            </CardTitle>
            <CardDescription>Havi szólimit előfizetésenként. A valós limitek a profiles táblában vannak tárolva.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {SUBSCRIPTION_TIERS.map(tier => (
              <div key={tier} className="flex items-center gap-4">
                <Label className="w-20 font-medium">{getTierName(tier)}</Label>
                <Input
                  type="number"
                  value={settings.token_limits[tier] || 0}
                  onChange={(e) => handleTokenLimitChange(tier, e.target.value)}
                  className="flex-1"
                  disabled
                />
                <span className="text-sm text-muted-foreground w-16">szó/hó</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Available Models */}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Elérhető Modellek
              <Badge variant="secondary" className="ml-2">⏳ Hamarosan</Badge>
            </CardTitle>
            <CardDescription>Rendszerben engedélyezett AI modellek. Még nincs szűrés implementálva.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AI_MODELS.map(model => (
              <div key={model.id} className="flex items-center gap-3">
                <Checkbox
                  id={model.id}
                  checked={settings.available_models.includes(model.id)}
                  onCheckedChange={(checked) => handleModelToggle(model.id, !!checked)}
                  disabled
                />
                <div className="flex-1">
                  <Label htmlFor={model.id} className="cursor-pointer font-medium">
                    {model.name}
                  </Label>
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Tier-specific Models */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Előfizetési szintenkénti modellek
            <Badge variant="secondary" className="ml-2">⏳ Hamarosan</Badge>
          </CardTitle>
          <CardDescription>Melyik előfizetési szint milyen modelleket használhat. Még nincs implementálva.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SUBSCRIPTION_TIERS.map(tier => (
              <div key={tier} className="space-y-3">
                <h4 className="font-medium border-b pb-2">{getTierName(tier)}</h4>
                {AI_MODELS.map(model => (
                  <div key={model.id} className="flex items-center gap-2">
                    <Switch
                      id={`${tier}-${model.id}`}
                      checked={(settings.tier_models[tier] || []).includes(model.id)}
                      onCheckedChange={(checked) => handleTierModelToggle(tier, model.id, checked)}
                      disabled={!settings.available_models.includes(model.id)}
                    />
                    <Label 
                      htmlFor={`${tier}-${model.id}`} 
                      className={`text-sm cursor-pointer ${!settings.available_models.includes(model.id) ? 'text-muted-foreground line-through' : ''}`}
                    >
                      {model.name}
                    </Label>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
