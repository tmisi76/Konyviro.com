import {
  Sparkles,
  Users,
  FileText,
  Lightbulb,
  Wand2,
  ShieldCheck,
  Network,
  Zap,
  BookmarkCheck,
  Users2,
} from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "AI Folytatás 1 kattintással",
    description: "Soha ne akadj el. Az AI a te stílusodban folytatja a mondatot, bekezdést vagy egész jelenetet — pillanatok alatt.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: BookmarkCheck,
    title: "Fejezet Recap",
    description: "Visszatérve azonnal képben vagy: 3-4 mondatos AI összefoglaló az előzményekről + 3 javasolt folytatási irány.",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    icon: Zap,
    title: "Plot Twist Generátor",
    description: "Megakadtál? Az AI a vázlatod alapján 3 logikus, mégis meglepő fordulatot javasol — válaszd ki, ami illik.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Users2,
    title: "Csapat & Kollaboráció",
    description: "Hívd meg a társszerződ vagy szerkesztőd. Megosztott projektek, szerepkörök (szerkesztő / olvasó), közös karakter- és vázlatkezelés.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: ShieldCheck,
    title: "Konzisztencia Őr",
    description: "Automatikus audit: karakternév-ellentmondások, kulturális hibák, helyszín-eltérések felismerése — javítási javaslatokkal.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Network,
    title: "Karakter Hálózat",
    description: "Vizuális gráf a karaktereid kapcsolatairól. Egy pillantás alatt átlátod a teljes szereplőhálót és a viszonyaikat.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Lightbulb,
    title: "Könyv Coach",
    description: "Személyre szabott tervezés és tanácsadás. A coach segít strukturálni a történeted és fejleszteni az írásodat.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Karakter Menedzsment",
    description: "Hozd létre és kövesd nyomon karaktereidet. Személyiségek, kapcsolatok, fejlődési ívek egy helyen.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: FileText,
    title: "Export: Word · PDF · EPUB",
    description: "Exportálj Word, PDF, EPUB vagy TXT formátumba. Professzionális formázás, kiadásra készen.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Minden, amire szükséged van a könyvíráshoz
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Professzionális eszközök íróknak, AI támogatással
          </p>
        </div>

        {/* Features grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Icon */}
              <div className={`mb-4 inline-flex rounded-xl ${feature.bgColor} p-3`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
