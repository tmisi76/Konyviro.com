import { useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Pencil,
  KeyRound,
  Mail,
  UserCog,
  CreditCard,
  Ban,
  Unlock,
  Trash2,
  ChevronDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { AddUserModal } from "@/components/admin/AddUserModal";
import { EditUserModal } from "@/components/admin/EditUserModal";
import { SendEmailModal } from "@/components/admin/SendEmailModal";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: users, isLoading, refetch } = useAdminUsers({
    search,
    status: statusFilter,
    plan: planFilter,
    page,
    limit: 20,
  });

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    toast.info("Felhasználó törlése funkció hamarosan elérhető");
    setIsDeleteOpen(false);
  };

  const handleBanUser = async (userId: string) => {
    toast.info("Felhasználó tiltása funkció hamarosan elérhető");
  };

  const handleSendPasswordReset = async (email: string) => {
    toast.info("Jelszó reset email küldése funkció hamarosan elérhető");
  };

  const handleExportUsers = () => {
    toast.info("Export funkció hamarosan elérhető");
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case "pro":
        return "default";
      case "writer":
        return "secondary";
      case "hobby":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "banned":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Felhasználók</h1>
          <p className="text-muted-foreground">
            Összes regisztrált felhasználó kezelése
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportUsers}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setIsAddUserOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Új felhasználó
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Keresés név, email alapján..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Státusz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mind</SelectItem>
                <SelectItem value="active">Aktív</SelectItem>
                <SelectItem value="inactive">Inaktív</SelectItem>
                <SelectItem value="banned">Tiltott</SelectItem>
              </SelectContent>
            </Select>

            {/* Plan Filter */}
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Csomag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mind</SelectItem>
                <SelectItem value="free">Ingyenes</SelectItem>
                <SelectItem value="hobby">Hobbi</SelectItem>
                <SelectItem value="writer">Író</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {selectedUsers.length} kiválasztva
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Mail className="mr-2 h-4 w-4" />
                    Email küldése
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Exportálás
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Törlés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      users?.data?.length > 0 &&
                      selectedUsers.length === users?.data?.length
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers(users?.data?.map((u) => u.id) || []);
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Felhasználó</TableHead>
                <TableHead>Csomag</TableHead>
                <TableHead>Projektek</TableHead>
                <TableHead>Regisztráció</TableHead>
                <TableHead>Utolsó aktivitás</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <p className="text-muted-foreground">
                      Nem található felhasználó
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                users?.data?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(
                              selectedUsers.filter((id) => id !== user.id)
                            );
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium truncate max-w-[200px]">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPlanBadgeVariant(user.subscription_tier)}>
                        {user.subscription_tier === "free" && "Ingyenes"}
                        {user.subscription_tier === "hobby" && "Hobbi"}
                        {user.subscription_tier === "writer" && "Író"}
                        {user.subscription_tier === "pro" && "Pro"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.projects_count}</TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "yyyy.MM.dd", {
                        locale: hu,
                      })}
                    </TableCell>
                    <TableCell>
                      {user.last_seen_at ? (
                        formatDistanceToNow(new Date(user.last_seen_at), {
                          addSuffix: true,
                          locale: hu,
                        })
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status)}>
                        {user.status === "active" && "Aktív"}
                        {user.status === "inactive" && "Inaktív"}
                        {user.status === "banned" && "Tiltott"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/users/${user.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Részletek
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setIsEditUserOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Szerkesztés
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleSendPasswordReset(user.email)}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Jelszó reset küldése
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setIsSendEmailOpen(true);
                            }}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Email küldése
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserCog className="mr-2 h-4 w-4" />
                            Belépés userként
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Előfizetés kezelése
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status !== "banned" ? (
                            <DropdownMenuItem
                              onClick={() => handleBanUser(user.id)}
                              className="text-orange-500"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Tiltás
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>
                              <Unlock className="mr-2 h-4 w-4" />
                              Tiltás feloldása
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Törlés
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t p-4">
          <p className="text-sm text-muted-foreground">
            Összesen {users?.total || 0} felhasználó, {page}. oldal /{" "}
            {users?.totalPages || 1}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Előző
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= (users?.totalPages || 1)}
            >
              Következő
            </Button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <AddUserModal
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        onSuccess={() => {
          refetch();
          setIsAddUserOpen(false);
        }}
      />

      <EditUserModal
        open={isEditUserOpen}
        onOpenChange={setIsEditUserOpen}
        user={selectedUser}
        onSuccess={() => {
          refetch();
          setIsEditUserOpen(false);
        }}
      />

      <SendEmailModal
        open={isSendEmailOpen}
        onOpenChange={setIsSendEmailOpen}
        user={selectedUser}
      />

      <ConfirmationModal
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteUser}
        type="delete"
        title="Felhasználó törlése"
        description="Biztosan törölni szeretnéd ezt a felhasználót? Ez a művelet nem vonható vissza."
      />
    </div>
  );
}
