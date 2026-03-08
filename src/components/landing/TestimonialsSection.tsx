import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    content: "A KönyvÍró AI teljesen megváltoztatta az írási folyamatomat. Amit korábban hónapokig tartott, most heteken belül elkészül.",
    author: "Kovács Anna",
    role: "Romantikus regény író",
    rating: 5,
  },
  {
    content: "A Könyv Coach funkció fantasztikus! Segített strukturálni a gondolataimat és valódi könyvvé formálni az ötletemet.",
    author: "Nagy Péter",
    role: "Thriller szerző",
    rating: 5,
  },
  {
    content: "Végre egy magyar nyelvű eszköz, ami érti a magyar nyelv finomságait. Az AI szövegei természetesek és az én hangomon szólnak.",
    author: "Szabó Eszter",
    role: "Kezdő író",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Mit mondanak az írók?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Csatlakozz a növekvő írói közösséghez
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              {/* Quote icon */}
              <Quote className="absolute right-6 top-6 h-8 w-8 text-muted-foreground/20" />

              {/* Rating */}
              <div className="mb-4 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-warning text-warning"
                  />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground">"{testimonial.content}"</p>

              {/* Author */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
