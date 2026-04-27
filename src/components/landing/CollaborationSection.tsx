import { Button } from "@/components/ui/button";
import { Mail, ShieldCheck, Share2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const bullets = [
  {
    icon: Mail,
    title: "Meghívás emailen",
    description: "Egy kattintással hívd be a társszerződ, szerkesztőd vagy lektorod — automatikus értesítő emaillel.",
  },
  {
    icon: ShieldCheck,
    title: "Szerepkörök & jogosultságok",
    description: "Szerkesztő, kommentelő vagy csak olvasó — te döntöd el, ki mit lát és mit módosíthat.",
  },
  {
    icon: Share2,
    title: "Közös karakterek és vázlat",
    description: "Ugyanaz a karaktertár, vázlat és kutatási anyag mindenkinek. Mindig naprakész, sosem fognak szétcsúszni.",
  },
];

export function CollaborationSection() {
  const navigate = useNavigate();

  return (
    <section id="collaboration" className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: copy */}
          <div>
            <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
              Új · Csapatmunka
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Írj csapatban — egy közös vásznon
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Hívd meg a társszerződ, szerkesztőd vagy lektorod, és dolgozzatok ugyanazon a könyvön. Nincs többé file-küldözgetés vagy verzió-káosz.
            </p>

            <ul className="mt-8 space-y-5">
              {bullets.map((b) => (
                <li key={b.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                    <b.icon className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{b.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/auth?mode=register")}>
                Próbáld ki ingyen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
                Csomagok megtekintése
              </Button>
            </div>
          </div>

          {/* Right: visual mock */}
          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Aktív projekt
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-foreground">
                    A holló évszaka
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  3 társszerző él
                </span>
              </div>

              {/* Avatars */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    { letter: "A", bg: "bg-primary" },
                    { letter: "K", bg: "bg-secondary" },
                    { letter: "T", bg: "bg-accent" },
                    { letter: "M", bg: "bg-warning" },
                  ].map((a) => (
                    <div
                      key={a.letter}
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${a.bg} text-sm font-semibold text-primary-foreground ring-2 ring-card`}
                    >
                      {a.letter}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">+ 2 olvasó</span>
              </div>

              {/* Activity rows */}
              <div className="mt-6 space-y-3">
                {[
                  { who: "Anna", what: "szerkeszti a 4. fejezetet", color: "bg-primary" },
                  { who: "Kata", what: "új karaktert adott hozzá: Báthory István", color: "bg-secondary" },
                  { who: "Tamás", what: "kommentelt a vázlaton", color: "bg-accent" },
                ].map((row) => (
                  <div
                    key={row.who}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3"
                  >
                    <div className={`h-2 w-2 rounded-full ${row.color}`} />
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{row.who}</span>{" "}
                      <span className="text-muted-foreground">{row.what}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating accent */}
            <div className="pointer-events-none absolute -top-6 -right-6 hidden h-24 w-24 rounded-full bg-secondary/20 blur-2xl lg:block" />
            <div className="pointer-events-none absolute -bottom-6 -left-6 hidden h-24 w-24 rounded-full bg-primary/20 blur-2xl lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}