# ✅ MEGVALÓSÍTVA: Wizard Automatikus Könyvírás Indítás Javítása

## Probléma

A "Új szakkönyv" projektnél a wizard befejezésekor az `in_progress` státusz beállításra került, de a `start-book-writing` edge function **soha nem hívódott meg**, ezért nincs `writing_jobs` rekord és az írás nem indul el.

## Megoldás

Eltávolítottuk a fallback ágat a `Step6ChapterOutline` komponensből, amely a régi `onStartWriting` függvényt hívta meg. Most az `onStartAutoWriting` kötelező prop, és mindig az edge function hívódik meg.

## Változtatások

### 1. `src/components/wizard/steps/Step6ChapterOutline.tsx`
- `onStartWriting` prop eltávolítva az interface-ből
- `onStartAutoWriting` kötelezővé téve (optional → required)
- Fallback ág eltávolítva a `handleModeSelect` függvényből

### 2. `src/components/wizard/BookCreationWizard.tsx`
- `onStartWriting={handleStartWriting}` prop eltávolítva mindkét helyről (case 7, case 8)

## Eredmény

Most amikor a felhasználó kiválasztja az "Automatikus Könyvírás" módot:
1. Az `onStartAutoWriting()` meghívódik
2. A `start-book-writing` edge function elindul
3. A `writing_jobs` rekordok létrejönnek
4. A pg_cron elkezdi feldolgozni a job-okat
5. A könyv írása ténylegesen elindul
