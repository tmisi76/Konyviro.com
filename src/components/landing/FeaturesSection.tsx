import { 
  Sparkles, 
  Users, 
  FileText, 
  BookOpen,
  Lightbulb,
  Search
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Szöveggenerálás",
    description: "Folytass szöveget, írj újra bekezdéseket, vagy generálj teljes fejezeteket AI segítségével. A te hangod, az AI gyorsasága.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Lightbulb,
    title: "Könyv Coach",
    description: "Személyre szabott tervezés és tanácsadás. A coach segít strukturálni a történeted és fejleszteni az írásodat.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: Users,
    title: "Karakter Menedzsment",
    description: "Hozd létre és kövesd nyomon karaktereidet. Személyiségek, kapcsolatok, fejlődési ívek egy helyen.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Search,
    title: "Kutatás Modul",
    description: "Gyűjtsd össze a kutatási anyagaidat, jegyzeteidet és forrásaidat. Automatikus bibliográfia generálás.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: FileText,
    title: "Minden Export Formátum",
    description: "Exportálj Word, PDF, EPUB vagy TXT formátumba. Professzionális formázás, kiadásra készen.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: BookOpen,
    title: "Fejezet Szervezés",
    description: "Drag-and-drop fejezet rendezés, vázlat nézet, és blokk-alapú szerkesztő a hatékony íráshoz.",
    color: "text-info",
    bgColor: "bg-info/10",
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
