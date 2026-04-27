import { ShieldCheck, Sparkles, Globe2 } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Konzisztencia-audit",
    description: "Az AI átfésüli az egész könyvet, és felismeri a karakternév-eltéréseket, helyszín-ellentmondásokat és a logikai bukfenceket.",
  },
  {
    icon: Sparkles,
    title: "Auto-lektor",
    description: "Eltávolítja a kliséket, javítja a szóismétléseket és simítja a mondatszerkezetet — a stílusod megőrzésével.",
  },
  {
    icon: Globe2,
    title: "Kulturális névadás",
    description: "Magyar regényhez magyar nevek. Japán helyszínhez japán nevek. A választott országhoz illő szereplőnevek, automatikusan.",
  },
];

export function QualityShowcaseSection() {
  return (
    <section className="relative overflow-hidden bg-muted/40 py-20 sm:py-28">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            Profi minőség, automatikusan
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Minden mondatra vigyáz a háttérben dolgozó motor
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Háromrétegű minőségbiztosítás: konzisztencia, stílus és kulturális hitelesség — anélkül, hogy egy ujjadat is mozdítanod kellene.
          </p>
        </div>

        {/* Pillars */}
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {pillars.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                <p.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            </div>
          ))}
        </div>

        {/* Before / After */}
        <div className="mx-auto mt-16 max-w-4xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Előtte / Utána · Auto-lektor
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-destructive">
                Nyers AI változat
              </p>
              <p className="text-sm leading-relaxed text-foreground/80">
                „Anna gyorsan kiment a szobából. Anna ideges volt, mert Anna tudta, hogy nem szabadna ezt megtennie. A szíve a torkában dobogott."
              </p>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-success">
                Lektorált verzió
              </p>
              <p className="text-sm leading-relaxed text-foreground/90">
                „Anna kisietett a szobából. Pulzusa a fülében dübörgött — pontosan tudta, hogy ezt nem volna szabad tennie, mégis ment tovább."
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}