import { Star, Quote } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/i18n/I18nContext";

interface Testimonial {
  id: string;
  author_name: string;
  author_role: string | null;
  content: string;
  rating: number;
  avatar_url: string | null;
}

export function TestimonialsSection() {
  const { t } = useTranslation();
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  if (isLoading) {
    return (
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!testimonials?.length) return null;

  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Mit mondanak az írók?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Csatlakozz a növekvő írói közösséghez
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <Quote className="absolute right-6 top-6 h-8 w-8 text-muted-foreground/20" />

              <div className="mb-4 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>

              <p className="text-foreground">"{testimonial.content}"</p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {testimonial.avatar_url ? (
                    <img
                      src={testimonial.avatar_url}
                      alt={testimonial.author_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    testimonial.author_name.charAt(0)
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">{testimonial.author_name}</p>
                  {testimonial.author_role && (
                    <p className="text-sm text-muted-foreground">{testimonial.author_role}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
