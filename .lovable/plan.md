
# Video Beágyazás a Nyitóoldalra - Piros Marker Stílussal

## Feladat

A nyitóoldal "Szerkesztő felület előnézet" helyére beágyazni a Tella videót, piros marker stílusú szöveggel és kézzel rajzolt nyíllal.

---

## Vizuális Elemek

| Elem | Leírás |
|------|--------|
| **Szöveg** | "Nézd meg, hogyan működik..." - piros marker font, 15°-kal döntve |
| **Stílus** | Kézzel írt hatás, mintha papírra rajzolták volna |
| **Nyíl** | Piros filctoll rajzolt nyíl, ami a videóra mutat |
| **Videó** | Tella embed iframe a megadott kóddal |
| **Árnyék** | A jelenlegi `shadow-2xl` megmarad a videó körül |

---

## Technikai Részletek

### Fájl: `src/components/landing/HeroSection.tsx`

**Cserélendő rész (77-92. sor):**
- A placeholder `<div>` helyett video embed
- Új elemek: piros marker szöveg + SVG nyíl

**Új kód struktúra:**

```tsx
{/* Hero Video - kézzel rajzolt stílussal */}
<div className="mx-auto mt-16 max-w-5xl">
  {/* Piros marker szöveg - 15° döntéssel */}
  <div className="mb-4 flex justify-start pl-8">
    <p 
      className="font-handwriting text-xl text-red-500 font-bold"
      style={{ 
        transform: "rotate(-15deg)",
        fontFamily: "'Caveat', cursive",
        textShadow: "1px 1px 2px rgba(0,0,0,0.1)"
      }}
    >
      Nézd meg, hogyan működik...
    </p>
  </div>
  
  {/* Rajzolt nyíl SVG */}
  <div className="relative -mt-2 ml-48 mb-2">
    <svg width="60" height="40" viewBox="0 0 60 40">
      {/* Kézzel rajzolt stílusú piros nyíl */}
      <path 
        d="M5,5 Q15,35 50,25 M50,25 L42,18 M50,25 L45,32" 
        stroke="#ef4444" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>

  {/* Video container árnyékkal */}
  <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
      <iframe 
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        src="https://www.tella.tv/video/vid_cmkwhdz8801g404jl4pfa93et/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0" 
        allowFullScreen 
      />
    </div>
    {/* Decorative gradient overlay */}
    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
  </div>
</div>
```

---

## Google Font Hozzáadása

### Fájl: `index.html`

Caveat font import a marker stílushoz:

```html
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap" rel="stylesheet">
```

---

## Összefoglalás

| Fájl | Módosítás |
|------|-----------|
| `index.html` | Caveat Google Font import |
| `src/components/landing/HeroSection.tsx` | Placeholder → Video + marker szöveg + rajzolt nyíl |

