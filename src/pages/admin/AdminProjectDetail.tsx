import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminProjectDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Projekt részletei</h1>
          <p className="text-muted-foreground">ID: {id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projekt adatai</CardTitle>
          <CardDescription>Könyv részletes információi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Projekt adatok betöltése...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
