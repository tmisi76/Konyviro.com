import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, AlertCircle, CheckCircle2, Clock, Loader2, Search, Send } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved" | "wont_fix";
  priority: "low" | "medium" | "high" | "critical";
  category: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  sender_name: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: "Nyitott", variant: "destructive", icon: AlertCircle },
  in_progress: { label: "Folyamatban", variant: "default", icon: Clock },
  resolved: { label: "Megoldva", variant: "secondary", icon: CheckCircle2 },
  wont_fix: { label: "Nem javítjuk", variant: "outline", icon: AlertCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Alacsony", className: "bg-muted text-muted-foreground" },
  medium: { label: "Közepes", className: "bg-yellow-500/20 text-yellow-500" },
  high: { label: "Magas", className: "bg-orange-500/20 text-orange-500" },
  critical: { label: "Kritikus", className: "bg-destructive/20 text-destructive" },
};

export default function AdminIssues() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [replyText, setReplyText] = useState("");
  const [newIssue, setNewIssue] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "bug",
  });

  // Fetch issues from support_tickets table (reusing for issues)
  const { data: issues, isLoading } = useQuery({
    queryKey: ["admin-issues", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tickets = data || [];
      const userIds = [...new Set(tickets.map((t) => t.user_id).filter(Boolean))] as string[];

      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, full_name")
          .in("user_id", userIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap[p.user_id] = p.display_name || p.full_name || p.user_id.slice(0, 8);
          }
        }
      }

      return tickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.subject,
        description: ticket.description,
        status: ticket.status as Issue["status"],
        priority: ticket.priority as Issue["priority"],
        category: ticket.category,
        created_by: ticket.user_id,
        assigned_to: ticket.assigned_to,
        created_at: ticket.created_at || "",
        updated_at: ticket.updated_at || "",
        resolved_at: ticket.resolved_at,
        sender_name: ticket.user_id ? (profileMap[ticket.user_id] || ticket.user_id.slice(0, 8)) : null,
      })) as Issue[];
    },
  });

  const createIssue = useMutation({
    mutationFn: async (issue: typeof newIssue) => {
      const { error } = await supabase.from("support_tickets").insert({
        subject: issue.title,
        description: issue.description,
        priority: issue.priority,
        category: issue.category,
        status: "open",
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-issues"] });
      toast.success("Issue létrehozva!");
      setIsAddOpen(false);
      setNewIssue({ title: "", description: "", priority: "medium", category: "bug" });
    },
    onError: (error: any) => {
      toast.error("Hiba: " + error.message);
    },
  });

  const updateIssueStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("support_tickets").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-issues"] });
      toast.success("Státusz frissítve!");
    },
  });

  // Fetch messages for selected issue
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin", "issue-messages", selectedIssue?.id],
    queryFn: async () => {
      if (!selectedIssue) return [];
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("id, ticket_id, message, is_admin_reply, sender_id, created_at")
        .eq("ticket_id", selectedIssue.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedIssue,
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedIssue || !replyText.trim()) return;
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: selectedIssue.id,
        message: replyText.trim(),
        is_admin_reply: true,
        sender_id: user?.id,
      });
      if (error) throw error;

      // Auto-update status to in_progress if open
      if (selectedIssue.status === "open") {
        await supabase
          .from("support_tickets")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", selectedIssue.id);
        setSelectedIssue((prev) => prev ? { ...prev, status: "in_progress" as Issue["status"] } : null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "issue-messages", selectedIssue?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-issues"] });
      setReplyText("");
      toast.success("Válasz elküldve!");
    },
    onError: (error: any) => {
      toast.error("Hiba: " + error.message);
    },
  });

  const filteredIssues = issues?.filter((issue) => {
    const matchesSearch =
      !search ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description?.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === "all" && (issue.status === "resolved" || issue.status === "wont_fix")) {
      return false;
    }

    return matchesSearch;
  });

  const openCount = issues?.filter((i) => i.status === "open").length || 0;
  const inProgressCount = issues?.filter((i) => i.status === "in_progress").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hibalista</h1>
          <p className="text-muted-foreground">Fejlesztési hibák és teendők nyomon követése</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Új issue
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{openCount}</div>
            <p className="text-sm text-muted-foreground">Nyitott</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{inProgressCount}</div>
            <p className="text-sm text-muted-foreground">Folyamatban</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{issues?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Összes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">
              {issues?.filter((i) => i.status === "resolved").length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Megoldva</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Keresés..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Státusz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Minden státusz</SelectItem>
                <SelectItem value="open">Nyitott</SelectItem>
                <SelectItem value="in_progress">Folyamatban</SelectItem>
                <SelectItem value="resolved">Megoldva</SelectItem>
                <SelectItem value="wont_fix">Nem javítjuk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !filteredIssues?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nincs issue</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cím</TableHead>
                  <TableHead>Küldő</TableHead>
                  <TableHead>Prioritás</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Kategória</TableHead>
                  <TableHead>Létrehozva</TableHead>
                  <TableHead>Művelet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => {
                  const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open;
                  const priorityConfig = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.medium;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={issue.id} className="cursor-pointer" onClick={() => setSelectedIssue(issue)}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{issue.title}</p>
                          {issue.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {issue.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{issue.sender_name || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityConfig.className}>
                          {priorityConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{issue.category || "Egyéb"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(issue.created_at), "yyyy.MM.dd", { locale: hu })}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={issue.status}
                          onValueChange={(status) =>
                            updateIssueStatus.mutate({ id: issue.id, status })
                          }
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Nyitott</SelectItem>
                            <SelectItem value="in_progress">Folyamatban</SelectItem>
                            <SelectItem value="resolved">Megoldva</SelectItem>
                            <SelectItem value="wont_fix">Nem javítjuk</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={(open) => { if (!open) { setSelectedIssue(null); setReplyText(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          {selectedIssue && (() => {
            const sc = STATUS_CONFIG[selectedIssue.status] || STATUS_CONFIG.open;
            const pc = PRIORITY_CONFIG[selectedIssue.priority] || PRIORITY_CONFIG.medium;
            const SI = sc.icon;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedIssue.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={pc.className}>{pc.label}</Badge>
                    <Badge variant="outline">{selectedIssue.category || "Egyéb"}</Badge>
                    <Badge variant={sc.variant} className="gap-1">
                      <SI className="h-3 w-3" />
                      {sc.label}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {selectedIssue.sender_name && (
                      <p>Küldő: <span className="font-medium text-foreground">{selectedIssue.sender_name}</span></p>
                    )}
                    <p>Létrehozva: {format(new Date(selectedIssue.created_at), "yyyy.MM.dd HH:mm", { locale: hu })}</p>
                    {selectedIssue.updated_at && (
                      <p>Frissítve: {format(new Date(selectedIssue.updated_at), "yyyy.MM.dd HH:mm", { locale: hu })}</p>
                    )}
                    {selectedIssue.resolved_at && (
                      <p>Megoldva: {format(new Date(selectedIssue.resolved_at), "yyyy.MM.dd HH:mm", { locale: hu })}</p>
                    )}
                  </div>
                  {selectedIssue.description && (
                    <div>
                      <Label className="mb-1 block">Leírás</Label>
                      <div className="rounded-md border p-3 text-sm whitespace-pre-wrap bg-muted/50">
                        {selectedIssue.description}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 min-h-0">
                    <Label className="mb-1 block">Üzenetek</Label>
                    <ScrollArea className="h-[200px] rounded-md border p-3">
                      {messagesLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : !messages?.length ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Még nincs üzenet</p>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`rounded-md p-2 text-sm ${
                                msg.is_admin_reply
                                  ? "bg-primary/10 border border-primary/20 ml-4"
                                  : "bg-muted/50 border mr-4"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-xs">
                                  {msg.is_admin_reply ? "Admin" : "Felhasználó"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(msg.created_at), "MM.dd HH:mm", { locale: hu })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap">{msg.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Reply */}
                  <div className="space-y-2">
                    <Label>Válasz írása</Label>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Írd ide a válaszod..."
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        onClick={() => sendReply.mutate()}
                        disabled={!replyText.trim() || sendReply.isPending}
                        className="self-end"
                      >
                        {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Státusz módosítása</Label>
                    <Select
                      value={selectedIssue.status}
                      onValueChange={(status) => {
                        updateIssueStatus.mutate({ id: selectedIssue.id, status });
                        setSelectedIssue((prev) => prev ? { ...prev, status: status as Issue["status"] } : null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Nyitott</SelectItem>
                        <SelectItem value="in_progress">Folyamatban</SelectItem>
                        <SelectItem value="resolved">Megoldva</SelectItem>
                        <SelectItem value="wont_fix">Nem javítjuk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setSelectedIssue(null); setReplyText(""); }}>Bezárás</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Issue Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új issue létrehozása</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cím *</Label>
              <Input
                placeholder="Mi a probléma?"
                value={newIssue.title}
                onChange={(e) => setNewIssue((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioritás</Label>
                <Select
                  value={newIssue.priority}
                  onValueChange={(value) => setNewIssue((prev) => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Alacsony</SelectItem>
                    <SelectItem value="medium">Közepes</SelectItem>
                    <SelectItem value="high">Magas</SelectItem>
                    <SelectItem value="critical">Kritikus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kategória</Label>
                <Select
                  value={newIssue.category}
                  onValueChange={(value) => setNewIssue((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Funkció</SelectItem>
                    <SelectItem value="improvement">Javítás</SelectItem>
                    <SelectItem value="documentation">Dokumentáció</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Leírás</Label>
              <Textarea
                placeholder="Részletes leírás..."
                rows={4}
                value={newIssue.description}
                onChange={(e) => setNewIssue((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Mégse
            </Button>
            <Button
              onClick={() => createIssue.mutate(newIssue)}
              disabled={!newIssue.title || createIssue.isPending}
            >
              {createIssue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Létrehozás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
