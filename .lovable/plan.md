
# Implementációs Terv: Könyv Megosztás + Hangoskönyv Készítő

## Áttekintés

Két fő funkció implementálása:
1. **Könyv megosztás** - Nyilvános/jelszóval védett linkek + interaktív olvasó nézetek
2. **Hangoskönyv készítő** - ElevenLabs TTS integráció hangválasztóval

## Megadott ElevenLabs Voice ID-k

| Voice ID | Használat |
|----------|-----------|
| NOpBlnGInO9m6vDvFkFC | Hang 1 |
| IRHApOXLvnW57QJPQH2P | Hang 2 |
| xjlfQQ3ynqiEyRpArrT8 | Hang 3 |
| XfNU2rGpBa01ckF309OY | Hang 4 |

---

## 1. RÉSZ: Adatbázis Változtatások

### 1.1 book_shares tábla
```sql
CREATE TABLE public.book_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  password_hash TEXT,
  view_mode TEXT DEFAULT 'scroll' CHECK (view_mode IN ('flipbook', 'scroll')),
  allow_download BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 tts_voices tábla (Admin kezeli)
```sql
CREATE TABLE public.tts_voices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elevenlabs_voice_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  gender TEXT DEFAULT 'neutral' CHECK (gender IN ('male', 'female', 'neutral')),
  language TEXT DEFAULT 'hu',
  sample_text TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Előre kitöltjük a megadott hangokkal
INSERT INTO public.tts_voices (elevenlabs_voice_id, name, description, gender, language, sort_order) VALUES
  ('NOpBlnGInO9m6vDvFkFC', 'Narrátor 1', 'Magyar férfi hang', 'male', 'hu', 1),
  ('IRHApOXLvnW57QJPQH2P', 'Narrátor 2', 'Magyar női hang', 'female', 'hu', 2),
  ('xjlfQQ3ynqiEyRpArrT8', 'Narrátor 3', 'Magyar semleges hang', 'neutral', 'hu', 3),
  ('XfNU2rGpBa01ckF309OY', 'Narrátor 4', 'Magyar hang', 'neutral', 'hu', 4);
```

### 1.3 audiobooks tábla
```sql
CREATE TABLE public.audiobooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  voice_id UUID REFERENCES public.tts_voices(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  completed_chapters INTEGER DEFAULT 0,
  audio_url TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### 1.4 audiobook_chapters tábla
```sql
CREATE TABLE public.audiobook_chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audiobook_id UUID REFERENCES public.audiobooks(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  audio_url TEXT,
  duration_seconds INTEGER,
  sort_order INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.5 RLS Policies
- **book_shares**: Tulajdonos CRUD + nyilvános token-alapú olvasás
- **tts_voices**: Mindenki olvashat, csak admin írhat
- **audiobooks**: Tulajdonos CRUD
- **audiobook_chapters**: Tulajdonos olvasás (audiobook-on keresztül)

---

## 2. RÉSZ: Könyv Megosztás

### 2.1 Új Fájlok

```
src/types/share.ts                    # TypeScript típusok
src/hooks/useBookShare.ts             # Megosztás logika hook
src/pages/PublicBookReader.tsx        # Nyilvános olvasó oldal
src/components/reader/
  ├── ShareBookModal.tsx              # Megosztás beállítások modal
  ├── BookScrollView.tsx              # Görgetős Word-szerű nézet
  ├── BookFlipView.tsx                # Könyv lapozós nézet
  ├── ReaderViewToggle.tsx            # Nézet váltó gomb
  └── PasswordGate.tsx                # Jelszó bekérés modal
```

### 2.2 Route Hozzáadása
```typescript
// App.tsx - Új public route (nincs ProtectedRoute)
<Route path="/read/:shareToken" element={
  <Suspense fallback={<FullPageLoader message="Könyv betöltése..." />}>
    <PublicBookReader />
  </Suspense>
} />
```

### 2.3 ShareBookModal Funkciók
- Toggle: Nyilvános / Jelszóval védett
- Nézet választás: Flipbook / Scroll
- Letöltés engedélyezése
- Lejárat beállítása
- Link másolás + QR kód

### 2.4 Olvasó Nézetek

**BookScrollView** (Word-szerű):
- Fejezetek egymás alatt folyamatosan
- Sidebar fejezet navigációval
- Szép tipográfia

**BookFlipView** (könyv-szerű):
- 2 oldalas lapozós nézet
- FlipBook komponens adaptálása könyvekhez
- Billentyűzet + touch navigáció

---

## 3. RÉSZ: Hangoskönyv Készítő

### 3.1 Secret Hozzáadása
- `ELEVENLABS_API_KEY` - Supabase secret

### 3.2 Új Fájlok

```
src/types/audiobook.ts                # TypeScript típusok
src/hooks/useAudiobook.ts             # Hangoskönyv logika hook
src/hooks/admin/useTTSVoices.ts       # Admin hangok kezelése
src/pages/admin/AdminVoices.tsx       # Admin hangok oldal
src/components/audiobook/
  ├── VoicePicker.tsx                 # Hangválasztó komponens
  ├── AudiobookProgress.tsx           # Generálás állapot
  ├── AudiobookPlayer.tsx             # Mini lejátszó
  └── AdminVoiceCard.tsx              # Admin hang kártya

supabase/functions/
  ├── elevenlabs-tts-preview/         # Hang előnézet
  ├── start-audiobook-generation/     # Generálás indítása
  └── process-audiobook-chapter/      # Fejezet feldolgozás
```

### 3.3 Admin Voices Oldal (/admin/voices)
- Hangok listázása kártyákon
- Hang hozzáadása/szerkesztése/törlése
- ElevenLabs voice ID, név, leírás, nem
- Minta szöveg beállítása
- Drag & drop rendezés

### 3.4 VoicePicker Működése
1. Lekéri a projektből 1-1 mondatot (első fejezet első 200 karakter)
2. Aktív hangok listázása kártyákon
3. "Előnézet" gomb → ElevenLabs TTS hívás a minta szöveggel
4. Kiválasztás → hangoskönyv generálás indítása

### 3.5 Edge Function-ök

**elevenlabs-tts-preview**:
- Input: elevenlabs_voice_id, sample_text
- ElevenLabs API hívás
- Return: audio base64 / blob

**start-audiobook-generation**:
- Audiobook rekord létrehozása
- Audiobook_chapters rekordok létrehozása minden fejezethez
- Első fejezet feldolgozás indítása

**process-audiobook-chapter**:
- Fejezet szöveg lekérése
- ElevenLabs TTS hívás (request stitching használata)
- Audio mentése Storage-ba
- Következő fejezet feldolgozás indítása
- Ha minden kész → audiobook státusz frissítése

### 3.6 Storage Bucket
- `audiobooks` bucket létrehozása (private)
- Signed URL-ek használata lejátszáshoz/letöltéshez

### 3.7 UI Integráció

**ProjectEditor-ban**:
- Új "Hangoskönyv" gomb/tab
- Ha nincs hangoskönyv: VoicePicker modal
- Ha generálás folyamatban: AudiobookProgress
- Ha kész: AudiobookPlayer + letöltés

**BookExportModal-ban**:
- Ha van kész hangoskönyv: "Hangoskönyv (MP3)" formátum opció
- Letöltés a meglévő fájlból

---

## 4. Implementációs Sorrend

### Fázis 1: Adatbázis + Megosztás Alapok
1. SQL migráció (book_shares, tts_voices, audiobooks, audiobook_chapters)
2. ELEVENLABS_API_KEY secret kérése
3. Típus definíciók
4. ShareBookModal komponens
5. useBookShare hook

### Fázis 2: Olvasó Nézetek
6. PublicBookReader oldal
7. BookScrollView komponens
8. BookFlipView komponens
9. PasswordGate + ReaderViewToggle
10. App.tsx route hozzáadása

### Fázis 3: Hangoskönyv Admin
11. AdminVoices oldal
12. useTTSVoices hook
13. AdminVoiceCard komponens
14. AdminLayout nav bővítése

### Fázis 4: Hangoskönyv Generálás
15. elevenlabs-tts-preview edge function
16. start-audiobook-generation edge function
17. process-audiobook-chapter edge function
18. audiobooks storage bucket
19. VoicePicker komponens
20. useAudiobook hook
21. AudiobookProgress + AudiobookPlayer komponensek

### Fázis 5: Integráció
22. ProjectEditor hangoskönyv gomb
23. BookExportModal hangoskönyv opció

---

## 5. Technikai Részletek

### ElevenLabs API Használat
- Model: `eleven_multilingual_v2` (magyar támogatás)
- Request stitching: `previous_text` + `next_text` paraméterek
- Output format: `mp3_44100_128`

### Biztonsági Szempontok
- Jelszó hash: bcrypt
- Share token: 32 karakteres cryptographically secure random string
- Audio fájlok: Private storage + signed URLs
- Rate limiting: max 10 jelszó próbálkozás

### Költség Becslés (ElevenLabs)
- ~1000 karakter = ~1 perc audio
- 50,000 szavas könyv ≈ 250,000 karakter ≈ 250 perc
- Javaslat: PRO előfizetőknek, vagy kredit alapú

---

## 6. Érintett Meglévő Fájlok

- `src/App.tsx` - Új route
- `src/layouts/AdminLayout.tsx` - Admin nav bővítés
- `src/components/export/BookExportModal.tsx` - Hangoskönyv opció
- `src/pages/ProjectEditor.tsx` - Megosztás + Hangoskönyv gombok
- `supabase/config.toml` - Új edge function-ök
