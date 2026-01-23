import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Loader2, FileText } from "lucide-react";
import { format, subDays } from "date-fns";

import { useActivityLogs, type ActivityLog } from "@/hooks/admin/useActivityLogs";
import { DateRangePicker } from "@/components/admin/DateRangePicker";

export default function AdminActivityLogs() {
  const [filter, setFilter] = useState({
    action: "all",
    admin: "all",
    dateRange: { from: subDays(new Date(), 7), to: new Date() },
  });

  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const { data: logs, isLoading } = useActivityLogs(filter);

  const actionLabels: Record<string, string> = {
    user_created: "Felhasználó létrehozás",
    user_deleted: "Felhasználó törlés",
    user_updated: "Felhasználó módosítás",
    subscription_changed: "Előfizetés módosítás",
    settings_updated: "Beállítás módosítás",
    email_sent: "Email küldés",
    ticket_replied: "Ticket válasz",
    plan_updated: "Csomag módosítás",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tevékenység napló</h1>
        <p className="text-muted-foreground">Admin műveletek és rendszer események</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4">
          <Select
            value={filter.action}
            onValueChange={(v) => setFilter((f) => ({ ...f, action: v }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Művelet típus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Minden művelet</SelectItem>
              <SelectItem value="user_created">Felhasználó létrehozás</SelectItem>
              <SelectItem value="user_deleted">Felhasználó törlés</SelectItem>
              <SelectItem value="user_updated">Felhasználó módosítás</SelectItem>
              <SelectItem value="subscription_changed">Előfizetés módosítás</SelectItem>
              <SelectItem value="settings_updated">Beállítás módosítás</SelectItem>
              <SelectItem value="email_sent">Email küldés</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker
            value={filter.dateRange}
            onChange={(v) => setFilter((f) => ({ ...f, dateRange: v }))}
          />
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Napló bejegyzések
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Időpont</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Művelet</TableHead>
              <TableHead>Entitás</TableHead>
              <TableHead>Részletek</TableHead>
              <TableHead>IP cím</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nincsenek napló bejegyzések
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(log.created_at), "yyyy.MM.dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>{log.admin_email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.action.includes("delete")
                          ? "destructive"
                          : log.action.includes("create")
                          ? "default"
                          : "secondary"
                      }
                    >
                      {actionLabels[log.action] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.entity_type && (
                      <span className="text-muted-foreground">
                        {log.entity_type}: {log.entity_id?.slice(0, 8)}...
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.details && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {log.ip_address ? String(log.ip_address) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Napló részletek</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Időpont</p>
                <p className="font-medium">
                  {selectedLog && format(new Date(selectedLog.created_at), "yyyy.MM.dd HH:mm:ss")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Admin</p>
                <p className="font-medium">{selectedLog?.admin_email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Művelet</p>
                <p className="font-medium">
                  {selectedLog && (actionLabels[selectedLog.action] || selectedLog.action)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">IP cím</p>
                <p className="font-mono">{selectedLog?.ip_address ? String(selectedLog.ip_address) : "-"}</p>
              </div>
            </div>

            {selectedLog?.entity_type && (
              <div>
                <p className="text-muted-foreground text-sm">Entitás</p>
                <p className="font-medium">
                  {selectedLog.entity_type}: {selectedLog.entity_id}
                </p>
              </div>
            )}

            {selectedLog?.details && (
              <div>
                <p className="text-muted-foreground text-sm mb-2">Részletek</p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog?.user_agent && (
              <div>
                <p className="text-muted-foreground text-sm">User Agent</p>
                <p className="font-mono text-xs break-all">{selectedLog.user_agent}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
