import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, LifeBuoy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminSupport() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Ticketek</h1>
          <p className="text-muted-foreground">Ügyfélszolgálati kérések kezelése</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">0 nyitott</Badge>
          <Badge variant="outline">0 várakozó</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Keresés tárgy, felhasználó alapján..." className="pl-9" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Szűrők
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <LifeBuoy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            Nincsenek support ticketek
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
