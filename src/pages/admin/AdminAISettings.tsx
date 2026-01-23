import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Save } from "lucide-react";

export default function AdminAISettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Beállítások</h1>
          <p className="text-muted-foreground">Mesterséges intelligencia konfigurálása</p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Mentés
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Alapértelmezett Modell
            </CardTitle>
            <CardDescription>A könyvíráshoz használt AI modell</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Beállítások betöltése...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Token Limitek</CardTitle>
            <CardDescription>Generálási limitek beállítása</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Beállítások betöltése...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Elérhető Modellek</CardTitle>
            <CardDescription>Felhasználók számára elérhető AI modellek</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Beállítások betöltése...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kreativitás (Temperature)</CardTitle>
            <CardDescription>AI válaszok variabilitása</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Beállítások betöltése...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
