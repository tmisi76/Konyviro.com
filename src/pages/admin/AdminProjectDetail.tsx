import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  BookOpen, 
  FileText,
  Users,
  Calendar,
  User,
  Archive,
  Trash2,
  ExternalLink,
  Sparkles,
  Coins,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { useState } from "react";

import { useProjectDetails } from "@/hooks/admin/useAdminProjects";
import { useProjectAIUsage } from "@/hooks/admin/useProjectAIUsage";
import { ChapterContentModal } from "@/components/admin/ChapterContentModal";
import { formatHuf } from "@/lib/aiCostEstimator";

export default function AdminProjectDetail() {
  const { id } = useParams();
  const { data: project, isLoading } = useProjectDetails(id);
  const { data: aiUsage } = useProjectAIUsage(id);
  const [openChapter, setOpenChapter] = useState<any | null>(null);

  const handleArchiveProject = async () => {
    toast.info("Archiválás funkció hamarosan...");
  };

  const handleDeleteProject = async () => {
    toast.info("Törlés funkció hamarosan...");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">Projekt nem található</p>
        <Button asChild variant="link">
          <Link to="/admin/projects">Vissza a listához</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <Badge variant="outline">{project.genre || 'N/A'}</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleArchiveProject}>
            <Archive className="mr-2 h-4 w-4" />
            Archiválás
          </Button>
          <Button variant="destructive" onClick={handleDeleteProject}>
            <Trash2 className="mr-2 h-4 w-4" />
            Törlés
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Szavak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{project.stats.totalWords.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Fejezetek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{project.stats.chapterCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI tokenek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(aiUsage?.aggregate.totalTokens ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {(aiUsage?.aggregate.generationCount ?? 0)} generálás
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Becsült AI költség
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHuf(aiUsage?.aggregate.totalHuf ?? 0)}</p>
            <p className="text-xs text-muted-foreground">
              Lovable AI Gateway árazás
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Karakterek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{project.stats.characterCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Létrehozva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base font-medium">
              {format(new Date(project.created_at), 'yyyy.MM.dd', { locale: hu })}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: hu })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Modell bontás</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            {Object.keys(aiUsage?.aggregate.byModel || {}).length === 0 ? (
              <p className="text-muted-foreground">Nincs adat</p>
            ) : (
              Object.entries(aiUsage!.aggregate.byModel).map(([model, m]) => (
                <div key={model} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground" title={model}>
                    {model.replace(/^[^/]+\//, "")}
                  </span>
                  <span className="font-medium whitespace-nowrap">{formatHuf(m.huf)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Owner Info */}
      {project.owner && (
        <Card>
          <CardHeader>
            <CardTitle>Tulajdonos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={project.owner.avatar_url || undefined} />
                <AvatarFallback>
                  {project.owner.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{project.owner.full_name || 'Névtelen'}</p>
                <p className="text-sm text-muted-foreground">
                  {project.owner.subscription_tier || 'free'} csomag
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to={`/admin/users/${project.user_id}`}>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="chapters">
        <TabsList>
          <TabsTrigger value="chapters">Fejezetek</TabsTrigger>
          <TabsTrigger value="characters">Karakterek</TabsTrigger>
          <TabsTrigger value="ai">AI használat</TabsTrigger>
          <TabsTrigger value="details">Részletek</TabsTrigger>
        </TabsList>

        <TabsContent value="chapters">
          <Card>
            <CardHeader>
              <CardTitle>Fejezetek</CardTitle>
              <CardDescription>A könyv fejezetei és tartalma</CardDescription>
            </CardHeader>
            <CardContent>
              {project.chapters.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Még nincs fejezet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Cím</TableHead>
                      <TableHead>Szavak</TableHead>
                      <TableHead>Módosítva</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.chapters.map((chapter: any, index: number) => {
                      const wordCount = chapter.content 
                        ? chapter.content.split(/\s+/).filter(Boolean).length 
                        : 0;
                      return (
                        <TableRow key={chapter.id}>
                          <TableCell className="font-mono text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {chapter.title || `Fejezet ${index + 1}`}
                          </TableCell>
                          <TableCell>{wordCount.toLocaleString()}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(chapter.updated_at), { addSuffix: true, locale: hu })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenChapter({ ...chapter, word_count: wordCount })}
                              disabled={!chapter.content}
                            >
                              <Eye className="h-4 w-4 mr-1" /> Olvasás
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="characters">
          <Card>
            <CardHeader>
              <CardTitle>Karakterek</CardTitle>
              <CardDescription>A könyvben szereplő karakterek</CardDescription>
            </CardHeader>
            <CardContent>
              {project.characters.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Még nincs karakter</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {project.characters.map((character: any) => (
                    <Card key={character.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={character.avatar_url || undefined} />
                            <AvatarFallback>{character.name?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{character.name}</CardTitle>
                            {character.role && (
                              <Badge variant="outline" className="text-xs">{character.role}</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {character.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {character.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          {/* details below */}
        </TabsContent>
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI generálások</CardTitle>
              <CardDescription>
                Minden AI hívás ezen a projekten · összesen{" "}
                {formatHuf(aiUsage?.aggregate.totalHuf ?? 0)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!aiUsage || aiUsage.generations.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nincs AI generálási adat
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Művelet</TableHead>
                      <TableHead>Modell</TableHead>
                      <TableHead className="text-right">Input</TableHead>
                      <TableHead className="text-right">Output</TableHead>
                      <TableHead className="text-right">Költség</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiUsage.generations.slice(0, 200).map((g) => {
                      const huf =
                        (aiUsage.aggregate.byModel[g.model]?.huf ?? 0) > 0
                          ? // per-row cost
                            ((g.prompt_tokens || 0) +
                              (g.completion_tokens || 0)) > 0
                            ? // estimate inline
                              (() => {
                                // call estimator inline to avoid extra import noise
                                return null;
                              })()
                            : null
                          : null;
                      return (
                        <TableRow key={g.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(g.created_at), "MM.dd HH:mm", { locale: hu })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{g.action_type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {g.model.replace(/^[^/]+\//, "")}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {(g.prompt_tokens || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {(g.completion_tokens || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            <RowCost
                              model={g.model}
                              promptTokens={g.prompt_tokens || 0}
                              completionTokens={g.completion_tokens || 0}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details-old" className="hidden">
          <Card>
            <CardHeader>
              <CardTitle>Projekt részletek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Műfaj</p>
                  <p className="font-medium">{project.genre || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Célközönség</p>
                  <p className="font-medium">{project.target_audience || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hangnem</p>
                  <p className="font-medium">{project.tone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utolsó módosítás</p>
                  <p className="font-medium">
                    {format(new Date(project.updated_at), 'yyyy.MM.dd HH:mm', { locale: hu })}
                  </p>
                </div>
              </div>
              
              {project.story_idea && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-2">Történet ötlet</p>
                  <p className="p-4 bg-muted rounded-lg">{project.story_idea}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
