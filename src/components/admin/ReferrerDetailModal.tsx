import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Ban,
  Calendar,
  Mail,
  MapPin,
  Users,
  Gift,
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { useReferrerDetails, ReferrerData, ReferralDetail } from "@/hooks/admin/useAdminAffiliates";

interface ReferrerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referrer: ReferrerData | null;
  onBan: (referrerId: string, banReferrer: boolean, selectedIds: string[]) => void;
}

export function ReferrerDetailModal({
  open,
  onOpenChange,
  referrer,
  onBan,
}: ReferrerDetailModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: referrals, isLoading } = useReferrerDetails(referrer?.user_id || null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (referrals) {
      setSelectedIds(referrals.map((r) => r.referred_id));
    }
  };

  const selectSuspicious = () => {
    if (referrals) {
      setSelectedIds(
        referrals
          .filter((r) => r.suspicion_reasons.length > 0)
          .map((r) => r.referred_id)
      );
    }
  };

  const handleBanSelected = () => {
    if (referrer && selectedIds.length > 0) {
      onBan(referrer.user_id, false, selectedIds);
    }
  };

  const handleBanAll = () => {
    if (referrer && referrals) {
      onBan(referrer.user_id, true, referrals.map((r) => r.referred_id));
    }
  };

  if (!referrer) return null;

  const suspiciousReferrals = referrals?.filter((r) => r.suspicion_reasons.length > 0) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ajánló részletei
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Referrer Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{referrer.email}</span>
              </div>
              {referrer.referral_banned && (
                <Badge variant="destructive">Tiltva</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Ajánlói kód:</span>{" "}
                <span className="font-mono">{referrer.referral_code}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Regisztráció:</span>{" "}
                {referrer.created_at && format(new Date(referrer.created_at), "yyyy. MM. dd.", { locale: hu })}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{referrer.referrals_count} ajánlás</span>
              </div>
              <div className="flex items-center gap-1">
                <Gift className="h-4 w-4 text-muted-foreground" />
                <span>{(referrer.total_bonus_given / 1000).toFixed(0)}K szó bónusz</span>
              </div>
            </div>
          </div>

          {/* Suspicious Alerts */}
          {suspiciousReferrals.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                Gyanús jelzések ({suspiciousReferrals.length})
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {Array.from(
                  new Set(suspiciousReferrals.flatMap((r) => r.suspicion_reasons))
                ).map((reason, i) => (
                  <li key={i}>• {reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Referrals List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Behozott felhasználók</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectSuspicious}>
                  Gyanúsak
                </Button>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Mind
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[250px] border rounded-lg">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="divide-y">
                  {referrals?.map((referral) => (
                    <div
                      key={referral.id}
                      className={`p-3 flex items-center gap-3 hover:bg-muted/50 ${
                        referral.banned_at ? "opacity-50" : ""
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.includes(referral.referred_id)}
                        onCheckedChange={() => toggleSelect(referral.referred_id)}
                        disabled={!!referral.banned_at}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm">
                            {referral.referred_email}
                          </span>
                          {referral.suspicion_reasons.length > 0 && (
                            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                          )}
                          {referral.banned_at && (
                            <Badge variant="destructive" className="text-xs">
                              Tiltva
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {referral.ip_address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {referral.ip_address}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(referral.created_at), "MM.dd HH:mm")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleBanSelected}
              disabled={selectedIds.length === 0}
            >
              <Ban className="h-4 w-4 mr-2" />
              Kiválasztottak tiltása ({selectedIds.length})
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleBanAll}
            >
              <Ban className="h-4 w-4 mr-2" />
              Mind + Ajánló tiltása
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
