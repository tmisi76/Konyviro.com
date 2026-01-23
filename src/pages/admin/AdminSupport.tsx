import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MessageSquare,
  User,
  Clock,
  Send,
  Loader2,
  Paperclip,
  FileText,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { toast } from "sonner";
import {
  useAdminTickets,
  type AdminTicket,
} from "@/hooks/admin/useAdminTickets";
import {
  useTicketMessages,
  useSendTicketReply,
  useUpdateTicketStatus,
  useUpdateTicketPriority,
} from "@/hooks/admin/useTicketMessages";

export default function AdminSupport() {
  const [statusFilter, setStatusFilter] = useState("open");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);

  const { data: tickets, isLoading, refetch } = useAdminTickets({
    status: statusFilter,
    priority: priorityFilter,
  });

  const openCount = tickets?.filter((t) => t.status === "open").length || 0;
  const inProgressCount = tickets?.filter((t) => t.status === "in_progress").length || 0;

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Ticket List */}
      <div className="w-96 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Support</h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{openCount} nyitott</Badge>
              <Badge variant="outline">{inProgressCount} folyamatban</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Nyitott</SelectItem>
                <SelectItem value="in_progress">Folyamatban</SelectItem>
                <SelectItem value="waiting_for_customer">Válaszra vár</SelectItem>
                <SelectItem value="resolved">Megoldva</SelectItem>
                <SelectItem value="closed">Lezárt</SelectItem>
                <SelectItem value="all">Mind</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mind</SelectItem>
                <SelectItem value="urgent">Sürgős</SelectItem>
                <SelectItem value="high">Magas</SelectItem>
                <SelectItem value="medium">Közepes</SelectItem>
                <SelectItem value="low">Alacsony</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <LifeBuoy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nincsenek ticketek</p>
              </div>
            ) : (
              tickets?.map((ticket) => (
                <button
                  key={ticket.id}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors",
                    selectedTicket?.id === ticket.id
                      ? "bg-primary/20 border border-primary"
                      : "bg-muted hover:bg-muted/80"
                  )}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          ticket.priority === "urgent" && "bg-red-500",
                          ticket.priority === "high" && "bg-orange-500",
                          ticket.priority === "medium" && "bg-yellow-500",
                          ticket.priority === "low" && "bg-green-500"
                        )}
                      />
                      <span className="text-xs text-muted-foreground">
                        #{ticket.id.slice(0, 8)}
                      </span>
                    </div>
                    {ticket.category && (
                      <Badge variant="outline" className="text-xs">
                        {ticket.category}
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium truncate">{ticket.subject}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {ticket.user_email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(ticket.created_at), {
                      addSuffix: true,
                      locale: hu,
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Ticket Detail */}
      {selectedTicket ? (
        <TicketDetail
          ticket={selectedTicket}
          onUpdate={() => {
            refetch();
          }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Válassz egy ticketet a bal oldali listából</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface TicketDetailProps {
  ticket: AdminTicket;
  onUpdate: () => void;
}

function TicketDetail({ ticket, onUpdate }: TicketDetailProps) {
  const { data: messages, refetch: refetchMessages } = useTicketMessages(ticket.id);
  const sendReplyMutation = useSendTicketReply();
  const updateStatusMutation = useUpdateTicketStatus();
  const updatePriorityMutation = useUpdateTicketPriority();
  
  const [reply, setReply] = useState("");

  async function handleSendReply() {
    if (!reply.trim()) return;

    try {
      await sendReplyMutation.mutateAsync({ ticketId: ticket.id, message: reply });
      setReply("");
      refetchMessages();
      onUpdate();
      toast.success("Válasz elküldve!");
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await updateStatusMutation.mutateAsync({ ticketId: ticket.id, status: newStatus });
      onUpdate();
      toast.success("Státusz frissítve!");
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    }
  }

  async function handlePriorityChange(newPriority: string) {
    try {
      await updatePriorityMutation.mutateAsync({ ticketId: ticket.id, priority: newPriority });
      onUpdate();
      toast.success("Prioritás frissítve!");
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Ticket Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{ticket.subject}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {ticket.user_email}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(new Date(ticket.created_at), "yyyy.MM.dd HH:mm")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={ticket.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Nyitott</SelectItem>
                <SelectItem value="in_progress">Folyamatban</SelectItem>
                <SelectItem value="waiting_for_customer">Válaszra vár</SelectItem>
                <SelectItem value="resolved">Megoldva</SelectItem>
                <SelectItem value="closed">Lezárt</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ticket.priority} onValueChange={handlePriorityChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">🔴 Sürgős</SelectItem>
                <SelectItem value="high">🟠 Magas</SelectItem>
                <SelectItem value="medium">🟡 Közepes</SelectItem>
                <SelectItem value="low">🟢 Alacsony</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Original Description */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback>
                  {ticket.user_email[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{ticket.user_email}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(ticket.created_at), "yyyy.MM.dd HH:mm")}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Reply Messages */}
          {messages?.map((message) => (
            <div
              key={message.id}
              className={cn(
                "p-4 rounded-lg",
                message.is_admin_reply
                  ? "bg-primary/20 ml-8"
                  : "bg-muted mr-8"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>
                    {message.is_admin_reply
                      ? "A"
                      : message.sender_email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {message.is_admin_reply ? "Support Team" : message.sender_email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(message.created_at), "yyyy.MM.dd HH:mm")}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{message.message}</p>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            placeholder="Írd be a válaszod..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            className="flex-1"
          />
        </div>
        <div className="flex justify-between mt-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Paperclip className="h-4 w-4 mr-1" />
              Csatolmány
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" />
              Sablon
            </Button>
          </div>
          <Button
            onClick={handleSendReply}
            disabled={sendReplyMutation.isPending || !reply.trim()}
          >
            {sendReplyMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Küldés
          </Button>
        </div>
      </div>
    </div>
  );
}
