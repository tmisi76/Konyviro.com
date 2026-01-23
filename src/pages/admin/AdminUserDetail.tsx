import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Mail, 
  Edit, 
  BookOpen, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  FileText,
  User,
  Ban,
  Key,
  Send,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";

import { useUserDetails } from "@/hooks/admin/useUserDetails";
import { useState } from "react";
import { EditUserModal } from "@/components/admin/EditUserModal";
import { SendEmailModal } from "@/components/admin/SendEmailModal";

export default function AdminUserDetail() {
  const { id } = useParams();
  const { data: user, isLoading, refetch } = useUserDetails(id);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const handleResetPassword = async () => {
    toast.info("Jelszó visszaállítás funkció hamarosan...");
  };

  const handleBanUser = async () => {
    toast.info("Tiltás funkció hamarosan...");
  };

  const getTierBadge = (tier: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      free: { label: 'Ingyenes', variant: 'outline' },
      hobby: { label: 'Hobbi', variant: 'secondary' },
      writer: { label: 'Író', variant: 'default' },
      pro: { label: 'PRO', variant: 'default' }
    };
    const config = variants[tier] || variants.free;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Felhasználó nem található</p>
        <Button asChild variant="link">
          <Link to="/admin/users">Vissza a listához</Link>
        </Button>
      </div>
    );
  }

  const usagePercent = user.monthly_word_limit > 0 
    ? Math.min((user.stats.wordsThisMonth / user.monthly_word_limit) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-xl">
              {user.full_name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{user.full_name || 'Névtelen'}</h1>
              {getTierBadge(user.subscription_tier)}
            </div>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Regisztrált: {format(new Date(user.created_at), 'yyyy. MMMM d.', { locale: hu })}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEmailModalOpen(true)}>
            <Send className="mr-2 h-4 w-4" />
            Email küldés
          </Button>
          <Button variant="outline" onClick={() => setEditModalOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Szerkesztés
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Projektek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{user.stats.totalProjects}</p>
            <p className="text-xs text-muted-foreground">
              {user.stats.projectsThisMonth} ebben a hónapban
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Szavak összesen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{user.stats.totalWords.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {user.stats.totalChapters} fejezetben
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Havi használat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {user.stats.wordsThisMonth.toLocaleString()} / {user.monthly_word_limit.toLocaleString()}
            </p>
            <Progress value={usagePercent} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Extra egyenleg
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{user.extra_words_balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">szó</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projektek</TabsTrigger>
          <TabsTrigger value="subscription">Előfizetés</TabsTrigger>
          <TabsTrigger value="activity">Tevékenység</TabsTrigger>
          <TabsTrigger value="actions">Műveletek</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Projektek</CardTitle>
              <CardDescription>A felhasználó könyvprojektjei</CardDescription>
            </CardHeader>
            <CardContent>
              {user.projects.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Még nincs projekt</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cím</TableHead>
                      <TableHead>Műfaj</TableHead>
                      <TableHead>Szavak</TableHead>
                      <TableHead>Létrehozva</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.genre}</Badge>
                        </TableCell>
                        <TableCell>{project.word_count.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: hu })}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/admin/projects/${project.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Előfizetési adatok</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Csomag</p>
                  <p className="font-medium">{getTierBadge(user.subscription_tier)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Státusz</p>
                  <Badge variant={user.subscription_status === 'active' ? 'default' : 'destructive'}>
                    {user.subscription_status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Havi szólimit</p>
                  <p className="font-medium">{user.monthly_word_limit.toLocaleString()} szó</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projekt limit</p>
                  <p className="font-medium">{user.project_limit} projekt</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Legutóbbi tevékenységek</CardTitle>
            </CardHeader>
            <CardContent>
              {user.recentActivity.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nincs rögzített tevékenység</p>
              ) : (
                <div className="space-y-4">
                  {user.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <Badge variant="outline">{activity.action}</Badge>
                      <span className="text-sm">{activity.entity_type}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(activity.created_at), 'yyyy.MM.dd HH:mm', { locale: hu })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Admin műveletek</CardTitle>
              <CardDescription>Speciális műveletek a felhasználón</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" onClick={handleResetPassword}>
                  <Key className="mr-2 h-4 w-4" />
                  Jelszó visszaállítás
                </Button>
                <Button variant="outline" onClick={() => toast.info("Impersonation hamarosan...")}>
                  <User className="mr-2 h-4 w-4" />
                  Bejelentkezés mint felhasználó
                </Button>
                <Button variant="destructive" onClick={handleBanUser}>
                  <Ban className="mr-2 h-4 w-4" />
                  Felhasználó tiltása
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={user ? {
          id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          subscription_tier: user.subscription_tier
        } : null}
        onSuccess={() => {
          setEditModalOpen(false);
          refetch();
        }}
      />

      <SendEmailModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        user={user ? {
          id: user.user_id,
          email: user.email,
          full_name: user.full_name
        } : null}
      />
    </div>
  );
}
