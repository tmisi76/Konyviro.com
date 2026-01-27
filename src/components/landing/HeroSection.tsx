import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, BookOpen, Feather } from "lucide-react";
import { useNavigate } from "react-router-dom";
export function HeroSection() {
  const navigate = useNavigate();
  const scrollToPricing = () => {
    const element = document.getElementById("pricing");
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
    }
  };
  return <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
      
      {/* Floating elements */}
      <div className="absolute left-10 top-20 hidden animate-float opacity-20 lg:block">
        <BookOpen className="h-16 w-16 text-primary" />
      </div>
      <div className="absolute right-20 top-40 hidden animate-float opacity-20 lg:block" style={{
      animationDelay: "1s"
    }}>
        <Feather className="h-12 w-12 text-secondary" />
      </div>
      <div className="absolute bottom-20 left-1/4 hidden animate-float opacity-20 lg:block" style={{
      animationDelay: "2s"
    }}>
        <Sparkles className="h-10 w-10 text-accent" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Mesterséges intelligenciával támogatott írás</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Írd meg a könyved{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              mesterséges intelligenciával
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A KönyvÍró AI segít megírni, megtervezni és publikálni a könyved. 
            Használj AI-t a szövegíráshoz, könyvcoach-ot a tervezéshez, és exportálj bármilyen formátumba.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={() => navigate("/auth?mode=register")} className="group w-full px-8 sm:w-auto">
              Ingyenesen kipróbálom
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={scrollToPricing} className="w-full sm:w-auto">
              Csomagok megtekintése
            </Button>
          </div>

          {/* Social proof - hidden */}
        </div>

        {/* Hero Video - kézzel rajzolt stílussal */}
        <div className="mx-auto mt-16 max-w-5xl">
          {/* Piros marker szöveg - 15° döntéssel */}
          <div className="mb-4 flex justify-start pl-8">
            
          </div>
          
          {/* Rajzolt nyíl SVG */}
          <div className="relative -mt-2 ml-48 mb-2">
            
          </div>

          {/* Video container árnyékkal */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div style={{
            position: "relative",
            paddingBottom: "56.25%",
            height: 0
          }}>
              <iframe style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0
            }} src="https://www.tella.tv/video/vid_cmkwhdz8801g404jl4pfa93et/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0" allowFullScreen />
            </div>
            {/* Decorative gradient overlay */}
            
          </div>
        </div>
      </div>
    </section>;
}