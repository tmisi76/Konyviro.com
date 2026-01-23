import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Filter, BookOpen, MoreHorizontal, Eye, Trash2, Archive, User, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";

import { useAdminProjects, type AdminProject } from "@/hooks/admin/useAdminProjects";

const GENRES = [
  'all',
  'fiction',
  'non-fiction', 
  'romance',
  'mystery',
  'sci-fi',
  'fantasy',
  'thriller',
  'horror',
  'biography',
  'self-help',
  'business',
  'children',
  'young-adult'
];

const STATUSES = ['all', 'draft', 'in_progress', 'completed', 'archived'];

export default function AdminProjects() {
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data: projects, isLoading, refetch } = useAdminProjects({
    search,
    genre: genreFilter,
    status: statusFilter,
    page,
    limit: 20
  });

  const handleArchiveProject = async (projectId: string) => {
    toast.info("Archiválás funkció hamarosan...");
  };

  const handleDeleteProject = async (projectId: string) => {
    toast.info("Törlés funkció hamarosan...");
  };

  const handleExportProjects = () => {
    toast.info("Export funkció hamarosan...");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      draft: { label: 'Piszkozat', variant: 'outline' },
      in_progress: { label: 'Folyamatban', variant: 'default' },
      completed: { label: 'Befejezett', variant: 'secondary' },
      archived: { label: 'Archivált', variant: 'destructive' }
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getGenreLabel = (genre: string) => {
    const labels: Record<string, string> = {
      'fiction': 'Szépirodalom',
      'non-fiction': 'Ismeretterjesztő',
      'romance': 'Romantikus',
      'mystery': 'Krimi',
      'sci-fi': 'Sci-Fi',
      'fantasy': 'Fantasy',
      'thriller': 'Thriller',
      'horror': 'Horror',
      'biography': 'Életrajz',
      'self-help': 'Önfejlesztés',
      'business': 'Üzleti',
      'children': 'Gyerek',
      'young-adult': 'Fiatal felnőtt'
    };
    return labels[genre] || genre;
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projektek</h1>
          <p className="text-muted-foreground">
            Összes könyvprojekt áttekintése
            {projects && ` (${projects.total} projekt)`}
          </p>
        </div>
        <Button variant="outline" onClick={handleExportProjects}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Keresés cím alapján..." 
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={genreFilter} onValueChange={(v) => { setGenreFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Műfaj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Minden műfaj</SelectItem>
                  {GENRES.filter(g => g !== 'all').map(genre => (
                    <SelectItem key={genre} value={genre}>{getGenreLabel(genre)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Státusz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Minden státusz</SelectItem>
                  <SelectItem value="draft">Piszkozat</SelectItem>
                  <SelectItem value="in_progress">Folyamatban</SelectItem>
                  <SelectItem value="completed">Befejezett</SelectItem>
                  <SelectItem value="archived">Archivált</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          ) : !projects?.data.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nincs találat a megadott szűrőkkel</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cím</TableHead>
                    <TableHead>Műfaj</TableHead>
                    <TableHead>Szerző</TableHead>
                    <TableHead>Fejezetek</TableHead>
                    <TableHead>Szavak</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead>Létrehozva</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.data.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{project.title}</span>
                          {project.is_adult && (
                            <Badge variant="destructive" className="text-xs">18+</Badge>
                          )}
                        </div>
                        {project.subgenre && (
                          <p className="text-xs text-muted-foreground">{project.subgenre}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getGenreLabel(project.genre)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/admin/users/${project.user_id}`}
                          className="flex items-center gap-1 text-sm hover:underline"
                        >
                          <User className="h-3 w-3" />
                          {project.user_name || 'Névtelen'}
                        </Link>
                      </TableCell>
                      <TableCell>{project.chapter_count}</TableCell>
                      <TableCell>{formatWordCount(project.word_count)}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(project.created_at), { addSuffix: true, locale: hu })}
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
                              <Link to={`/admin/projects/${project.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Részletek
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/users/${project.user_id}`}>
                                <User className="mr-2 h-4 w-4" />
                                Szerző profil
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleArchiveProject(project.id)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Archiválás
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Törlés
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {projects.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {(page - 1) * 20 + 1} - {Math.min(page * 20, projects.total)} / {projects.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Előző
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(projects.totalPages, p + 1))}
                      disabled={page === projects.totalPages}
                    >
                      Következő
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
