import { useState, useEffect } from "react";
import { Send, Mail, Users, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import {
  useEmailCampaigns,
  useCreateCampaign,
  useSendCampaign,
  useCountRecipients,
} from "@/hooks/admin/useEmailCampaigns";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

const RECIPIENT_TYPES = [
  { value: "all", label: "Minden felhasználó" },
  { value: "plan", label: "Előfizetési csomag alapján" },
  { value: "inactive", label: "Inaktív felhasználók" },
  { value: "custom", label: "Egyéni email lista" },
];

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "hobby", label: "Hobby" },
  { value: "iro", label: "Író" },
  { value: "pro", label: "Pro" },
];

const INACTIVE_OPTIONS = [
  { value: "7", label: "7 napja inaktív" },
  { value: "14", label: "14 napja inaktív" },
  { value: "30", label: "30 napja inaktív" },
  { value: "60", label: "60 napja inaktív" },
];

export default function AdminEmailSender() {
  const [recipientType, setRecipientType] = useState("all");
  const [planFilter, setPlanFilter] = useState("");
  const [inactiveDays, setInactiveDays] = useState("");
  const [customEmails, setCustomEmails] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const { data: campaigns, isLoading: campaignsLoading } = useEmailCampaigns();
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();
  const countRecipients = useCountRecipients();

  // Count recipients when filters change
  useEffect(() => {
    if (recipientType === "custom") {
      const emails = customEmails.split(/[\n,;]/).filter((e) => e.trim());
      setRecipientCount(emails.length);
      return;
    }

    const fetchCount = async () => {
      try {
        const count = await countRecipients.mutateAsync({
          recipient_type: recipientType,
          filter_value: recipientType === "plan" ? planFilter : undefined,
          inactive_days: recipientType === "inactive" ? parseInt(inactiveDays) : undefined,
        });
        setRecipientCount(count);
      } catch {
        setRecipientCount(null);
      }
    };

    if (recipientType === "all") {
      fetchCount();
    } else if (recipientType === "plan" && planFilter) {
      fetchCount();
    } else if (recipientType === "inactive" && inactiveDays) {
      fetchCount();
    } else {
      setRecipientCount(null);
    }
  }, [recipientType, planFilter, inactiveDays, customEmails]);

  const handleVariableInsert = (variable: string) => {
    setBodyHtml((prev) => prev + variable);
  };

  const handleSendCampaign = async () => {
    if (!subject.trim()) {
      toast({ title: "Hiányzó tárgy", variant: "destructive" });
      return;
    }
    if (!bodyHtml.trim()) {
      toast({ title: "Hiányzó tartalom", variant: "destructive" });
      return;
    }
    if (recipientCount === null || recipientCount === 0) {
      toast({ title: "Nincs címzett", variant: "destructive" });
      return;
    }

    try {
      // Create campaign first
      const campaign = await createCampaign.mutateAsync({
        subject,
        body_html: bodyHtml,
        recipient_type: recipientType,
        recipient_filter: {
          plan: planFilter || undefined,
          inactive_days: inactiveDays ? parseInt(inactiveDays) : undefined,
          custom_emails: recipientType === "custom" ? customEmails.split(/[\n,;]/).filter((e) => e.trim()) : undefined,
        },
        recipient_count: recipientCount,
      });

      // Then send it
      await sendCampaign.mutateAsync(campaign.id);

      // Reset form
      setSubject("");
      setBodyHtml("");
      setRecipientType("all");
      setPlanFilter("");
      setInactiveDays("");
      setCustomEmails("");
    } catch (error) {
      console.error("Campaign error:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Piszkozat</Badge>;
      case "sending":
        return <Badge className="bg-blue-500">Küldés alatt</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Kész</Badge>;
      case "failed":
        return <Badge variant="destructive">Sikertelen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRecipientTypeLabel = (type: string) => {
    return RECIPIENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Kampányok</h1>
        <p className="text-muted-foreground">
          Küldj csoportos emaileket a felhasználóknak
        </p>
      </div>

      {/* New Campaign Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Új Email Küldése
          </CardTitle>
          <CardDescription>
            Válaszd ki a címzetteket és írd meg az emailt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient Selection */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Címzettek</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz csoportot" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {recipientType === "plan" && (
                <div className="space-y-2">
                  <Label>Előfizetési csomag</Label>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz csomagot" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          {plan.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {recipientType === "inactive" && (
                <div className="space-y-2">
                  <Label>Inaktivitás időtartama</Label>
                  <Select value={inactiveDays} onValueChange={setInactiveDays}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz időtartamot" />
                    </SelectTrigger>
                    <SelectContent>
                      {INACTIVE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {recipientType === "custom" && (
              <div className="space-y-2">
                <Label>Email címek (soronként vagy vesszővel elválasztva)</Label>
                <Textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  placeholder="pelda@email.com&#10;masik@email.com"
                  rows={4}
                />
              </div>
            )}

            {recipientCount !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">~{recipientCount.toLocaleString("hu-HU")}</span>
                <span className="text-muted-foreground">címzett</span>
              </div>
            )}
          </div>

          {/* Email Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Tárgy</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email tárgya..."
              />
            </div>

            <div className="space-y-2">
              <Label>Tartalom</Label>
              <RichTextEditor
                value={bodyHtml}
                onChange={setBodyHtml}
                placeholder="Írd meg az email tartalmát..."
              />
              <p className="text-xs text-muted-foreground">
                Használható változók: {"{{user_name}}"}, {"{{email}}"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={handleSendCampaign}
              disabled={createCampaign.isPending || sendCampaign.isPending}
              className="gap-2"
            >
              {(createCampaign.isPending || sendCampaign.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Kampány Indítása
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Előző Kampányok
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaignsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tárgy</TableHead>
                  <TableHead>Címzettek</TableHead>
                  <TableHead>Küldve</TableHead>
                  <TableHead>Sikerült</TableHead>
                  <TableHead>Státusz</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {campaign.subject}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{campaign.recipient_count.toLocaleString("hu-HU")}</span>
                        <span className="text-xs text-muted-foreground">
                          {getRecipientTypeLabel(campaign.recipient_type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {campaign.started_at
                        ? format(new Date(campaign.started_at), "yyyy.MM.dd HH:mm", { locale: hu })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {campaign.status === "completed" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : campaign.status === "failed" ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : campaign.status === "sending" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>
                          {campaign.sent_count}/{campaign.recipient_count}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Még nincs elküldött kampány
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
