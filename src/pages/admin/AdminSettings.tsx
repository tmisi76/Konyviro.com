import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save, Shield, Globe, Bell } from "lucide-react";

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rendszer Beállítások</h1>
          <p className="text-muted-foreground">Általános beállítások és konfiguráció</p>
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
              <Globe className="h-5 w-5" />
              Általános
            </CardTitle>
            <CardDescription>Alapvető rendszer beállítások</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Beállítások betöltése...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Biztonság
            </CardTitle>
            <CardDescription>Biztonsági beállítások</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Beállítások betöltése...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Értesítések
            </CardTitle>
            <CardDescription>Rendszerértesítések konfigurálása</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Beállítások betöltése...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Karbantartás
            </CardTitle>
            <CardDescription>Karbantartási mód és rendszerállapot</CardDescription>
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
