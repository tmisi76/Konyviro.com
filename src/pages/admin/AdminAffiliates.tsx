import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Gift,
  AlertTriangle,
  Search,
  MoreHorizontal,
  Eye,
  Ban,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import {
  useAdminAffiliates,
  useBanReferrer,
  ReferrerData,
} from "@/hooks/admin/useAdminAffiliates";
import { ReferrerDetailModal } from "@/components/admin/ReferrerDetailModal";
import { BanReferrerModal } from "@/components/admin/BanReferrerModal";

function getSuspicionBadge(score: number) {
  if (score === 0) {
    return null;
  }
  if (score <= 2) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        OK
      </Badge>
    );
  }
  if (score <= 5) {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        ⚠ {score}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      🚨 {score}
    </Badge>
  );
}

export default function AdminAffiliates() {
  const { data, isLoading, error } = useAdminAffiliates();
  const banMutation = useBanReferrer();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReferrer, setSelectedReferrer] = useState<ReferrerData | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banParams, setBanParams] = useState<{
    referrerId: string;
    banReferrer: boolean;
    selectedIds: string[];
    email: string;
  } | null>(null);

  const handleViewDetails = (referrer: ReferrerData) => {
    setSelectedReferrer(referrer);
    setDetailModalOpen(true);
  };

  const handleBanFromDetail = (
    referrerId: string,
    banReferrer: boolean,
    selectedIds: string[]
  ) => {
    const referrer = data?.referrers.find((r) => r.user_id === referrerId);
    setBanParams({
      referrerId,
      banReferrer,
      selectedIds,
      email: referrer?.email || "",
    });
    setDetailModalOpen(false);
    setBanModalOpen(true);
  };

  const handleConfirmBan = (reason: string, revokeBonus: boolean) => {
    if (banParams) {
      banMutation.mutate(
        {
          referrer_id: banParams.referrerId,
          ban_referrer: banParams.banReferrer,
          ban_referred_ids: banParams.selectedIds,
          reason,
          revoke_bonus: revokeBonus,
        },
        {
          onSuccess: () => {
            setBanModalOpen(false);
            setBanParams(null);
          },
        }
      );
    }
  };

  // Filter referrers
  const filteredReferrers = data?.referrers.filter((r) => {
    const matchesSearch =
      search === "" ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.referral_code.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "suspicious" && r.suspicion_score >= 3) ||
      (statusFilter === "banned" && r.referral_banned) ||
      (statusFilter === "active" && !r.referral_banned && r.suspicion_score < 3);

    return matchesSearch && matchesStatus;
  });

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Hiba: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Affiliate Kezelő</h1>
        <p className="text-muted-foreground">
          Ajánlók és behozott felhasználók kezelése, csalás felderítés
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Összes Ajánló</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{data?.stats.total_referrers}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sikeres Ajánlások</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{data?.stats.total_referrals}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kiosztott Bónusz</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {((data?.stats.total_bonus || 0) / 1000).toFixed(0)}K szó
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gyanús Aktivitás</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {data?.stats.suspicious_count}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keresés email vagy kód alapján..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Státusz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes</SelectItem>
            <SelectItem value="suspicious">Gyanús</SelectItem>
            <SelectItem value="banned">Tiltott</SelectItem>
            <SelectItem value="active">Aktív</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ajánló</TableHead>
                <TableHead>Kód</TableHead>
                <TableHead className="text-center">Behozva</TableHead>
                <TableHead className="text-center">Bónusz</TableHead>
                <TableHead className="text-center">Gyanús</TableHead>
                <TableHead className="text-center">Státusz</TableHead>
                <TableHead className="text-right">Művelet</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredReferrers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nincs találat
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferrers?.map((referrer) => (
                  <TableRow
                    key={referrer.user_id}
                    className={referrer.suspicion_score >= 6 ? "bg-destructive/5" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {referrer.suspicion_score >= 3 && (
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        )}
                        <div>
                          <div className="font-medium truncate max-w-[200px]">
                            {referrer.email}
                          </div>
                          {referrer.full_name && (
                            <div className="text-xs text-muted-foreground">
                              {referrer.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {referrer.referral_code}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      {referrer.referrals_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {(referrer.total_bonus_given / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-center">
                      {getSuspicionBadge(referrer.suspicion_score)}
                    </TableCell>
                    <TableCell className="text-center">
                      {referrer.referral_banned ? (
                        <Badge variant="destructive">Tiltva</Badge>
                      ) : referrer.is_banned ? (
                        <Badge variant="secondary">Fiók tiltva</Badge>
                      ) : (
                        <Badge variant="outline">Aktív</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(referrer)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Részletek
                          </DropdownMenuItem>
                          {!referrer.referral_banned && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedReferrer(referrer);
                                handleViewDetails(referrer);
                              }}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Kezelés
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <ReferrerDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        referrer={selectedReferrer}
        onBan={handleBanFromDetail}
      />

      {banParams && (
        <BanReferrerModal
          open={banModalOpen}
          onOpenChange={setBanModalOpen}
          referrerEmail={banParams.email}
          banReferrer={banParams.banReferrer}
          selectedCount={banParams.selectedIds.length}
          onConfirm={handleConfirmBan}
          isLoading={banMutation.isPending}
        />
      )}
    </div>
  );
}
