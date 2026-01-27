
# Marker Szöveg és Nyíl Pozíció Módosítás

## Kért Változtatások

1. **Piros felirat** → videó közepére helyezve, 5° dőléssel (15° helyett)
2. **Nyíl** → a szöveg alá kerül, lefelé mutat a videóra
3. **Fehér gradient** → eltávolítás a videó aljáról

---

## Kód Módosítások

### Fájl: `src/components/landing/HeroSection.tsx`

**77-117. sorok cseréje:**

```tsx
{/* Hero Video - kézzel rajzolt stílussal */}
<div className="mx-auto mt-16 max-w-5xl">
  {/* Piros marker szöveg - középen, 5° döntéssel */}
  <div className="mb-2 flex justify-center">
    <p 
      className="text-2xl font-bold text-red-500"
      style={{ 
        transform: "rotate(-5deg)",
        fontFamily: "'Caveat', cursive",
        textShadow: "1px 1px 2px rgba(0,0,0,0.1)"
      }}
    >
      Nézd meg, hogyan működik...
    </p>
  </div>
  
  {/* Rajzolt nyíl SVG - középen, lefelé mutat */}
  <div className="flex justify-center mb-4">
    <svg width="40" height="50" viewBox="0 0 40 50">
      <path 
        d="M20,5 Q15,25 20,40 M20,40 L12,32 M20,40 L28,32" 
        stroke="#ef4444" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>

  {/* Video container árnyékkal - gradient nélkül */}
  <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
      <iframe 
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        src="https://www.tella.tv/video/vid_cmkwhdz8801g404jl4pfa93et/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0" 
        allowFullScreen 
      />
    </div>
  </div>
</div>
```

---

## Változások Összefoglalása

| Elem | Jelenlegi | Új |
|------|-----------|-----|
| Szöveg pozíció | Balra igazított (`justify-start pl-8`) | Középre (`justify-center`) |
| Szöveg dőlés | -15° | -5° |
| Nyíl irány | Jobbra görbülő | Lefelé mutató |
| Nyíl pozíció | Balra (`ml-48`) | Középen (`justify-center`) |
| Gradient overlay | Van (115-116. sor) | Eltávolítva |

---

## Technikai Részletek

**Nyíl SVG path magyarázata:**
- `M20,5` - Kezdőpont fent középen
- `Q15,25 20,40` - Enyhe ív lefelé
- `M20,40 L12,32` - Bal nyílhegy
- `M20,40 L28,32` - Jobb nyílhegy
