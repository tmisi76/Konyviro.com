import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { BookOpen, Search, Star, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface PublishedBook {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  cover_url: string | null;
  view_count: number;
  like_count: number;
  published_at: string;
  is_featured: boolean;
}

const genreLabels: Record<string, string> = {
  fiction: "Fiction",
  szakkonyv: "Szakkönyv",
  erotikus: "Erotikus",
  mesekonyv: "Mesekönyv",
};

export default function Gallery() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["gallery-books", genreFilter],
    queryFn: async () => {
      let query = supabase
        .from("published_books")
        .select("*")
        .order("published_at", { ascending: false });

      if (genreFilter !== "all") {
        query = query.eq("genre", genreFilter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as PublishedBook[];
    },
  });

  const filtered = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.description?.toLowerCase().includes(search.toLowerCase())
  );

  const featured = filtered.filter((b) => b.is_featured);
  const regular = filtered.filter((b) => !b.is_featured);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Könyv Galéria</h1>
            </div>
          </div>
          <Button onClick={() => navigate("/auth?mode=register")} size="sm">
            Publikálj te is!
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Műfaj" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes műfaj</SelectItem>
              <SelectItem value="fiction">Fiction</SelectItem>
              <SelectItem value="szakkonyv">Szakkönyv</SelectItem>
              <SelectItem value="mesekonyv">Mesekönyv</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Featured */}
        {featured.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Star className="h-5 w-5 text-warning" />
              Kiemelt könyvek
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        )}

        {/* All books */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">
            {search ? `Keresés: "${search}"` : "Legújabb könyvek"}
          </h2>
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : regular.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              {books.length === 0
                ? "Még nincsenek publikált könyvek. Légy te az első!"
                : "Nincs találat."}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {regular.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function BookCard({ book }: { book: PublishedBook }) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
      <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-secondary/20 relative">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-12 w-12 text-primary/30" />
          </div>
        )}
        {book.is_featured && (
          <Badge className="absolute left-2 top-2 bg-warning text-warning-foreground">
            <Star className="mr-1 h-3 w-3" /> Kiemelt
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1">{book.title}</h3>
        {book.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{book.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          {book.genre && (
            <Badge variant="secondary" className="text-xs">
              {genreLabels[book.genre] || book.genre}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            {book.view_count}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
