import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Hogyan működik az AI szöveggenerálás?",
    answer: "Az AI elemzi az eddigi szövegedet, a műfajt és a stílusodat, majd javaslatokat ad a folytatásra. Te döntöd el, mit fogadsz el, mit módosítasz. Az AI soha nem ír helyetted – segít, de te maradsz a szerző.",
  },
  {
    question: "Milyen formátumokba exportálhatok?",
    answer: "Támogatjuk a Word (.docx), PDF, EPUB és TXT formátumokat. Az export professzionális formázással történik, kiadásra készen. A magasabb csomagokban egyedi formázási lehetőségek is elérhetők.",
  },
  {
    question: "Van szólimit az AI generálásra?",
    answer: "Igen, minden csomag tartalmaz havi szókeretet. Az ingyenes csomag 10.000 szó/hó, a Hobbi 100.000, a Profi 250.000 szó/hó. A szókeret havonta megújul.",
  },
  {
    question: "Biztonságban van a szövegem?",
    answer: "Igen, minden adatot titkosítva tárolunk. A szöveged csak a te tulajdonod – nem használjuk AI tanításra, és nem osztjuk meg harmadik féllel.",
  },
  {
    question: "Bármikor lemondhatom az előfizetésem?",
    answer: "Igen, bármikor lemondhatod az előfizetésedet. A lemondás után az aktuális számlázási ciklus végéig használhatod a szolgáltatást. 14 napos pénzvisszafizetési garanciát is biztosítunk.",
  },
  {
    question: "Tudok offline dolgozni?",
    answer: "A KönyvÍró webalkalmazásként működik, de PWA támogatással telepítheted az eszközödre. Jelenleg az internet-kapcsolat szükséges, de dolgozunk az offline módú szerkesztésen.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="bg-muted/30 py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Gyakran Ismételt Kérdések
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Minden, amit tudni akarsz a KönyvÍró AI-ról
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="mx-auto mt-12 max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
