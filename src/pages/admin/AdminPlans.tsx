import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";

export default function AdminPlans() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/billing">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Előfizetési Csomagok</h1>
            <p className="text-muted-foreground">Csomagok és árak kezelése</p>
          </div>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Új csomag
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Elérhető Csomagok</CardTitle>
          <CardDescription>Aktív és inaktív előfizetési csomagok</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Csomagok betöltése...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
