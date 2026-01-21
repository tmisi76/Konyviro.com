import { PenLine, Sparkles, Download, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: PenLine,
    title: "Hozd létre a projekted",
    description: "Válaszd ki a műfajt, add meg a könyved címét és rövid leírását. Az AI coach segít megtervezni a struktúrát.",
    color: "from-primary to-primary/50",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Írj AI segítségével",
    description: "Használd az AI-t szöveg folytatásához, újraírásához vagy új bekezdések generálásához. Te irányítasz, az AI segít.",
    color: "from-secondary to-secondary/50",
  },
  {
    number: "03",
    icon: Download,
    title: "Exportáld és publikáld",
    description: "Amikor elkészültél, exportáld a könyved Word, PDF, EPUB vagy más formátumba. Készen állsz a publikálásra.",
    color: "from-accent to-accent/50",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-muted/30 py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Hogyan működik?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Három egyszerű lépésben a kész könyvig
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute right-0 top-12 hidden w-full translate-x-1/2 lg:block">
                  <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}

              <div className="flex flex-col items-center text-center">
                {/* Number badge */}
                <div className={`mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color}`}>
                  <step.icon className="h-10 w-10 text-white" />
                </div>

                {/* Step number */}
                <span className="mb-2 text-sm font-bold text-primary">
                  {step.number}. LÉPÉS
                </span>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
