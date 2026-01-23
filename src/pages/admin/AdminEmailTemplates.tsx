import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Eye, Edit } from "lucide-react";

export default function AdminEmailTemplates() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Sablonok</h1>
          <p className="text-muted-foreground">Tranzakcionális és marketing emailek</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Új sablon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Sablonok
          </CardTitle>
          <CardDescription>Szerkeszthető email sablonok</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Email sablonok betöltése...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
