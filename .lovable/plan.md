

# Könyvíró motor minőségi javítása

## Azonosított gyengeségek

1. **Nincs jelenetpozíció-tudatosság**: Az AI nem tudja, hogy a jelenet a fejezet elején, közepén vagy végén van — nincs utasítás nyitó hook-ra vagy cliffhanger-re
2. **Minőségellenőrzés nem triggerel újragenerálást**: A `checkSceneQuality` csak logol, de ha túl rövid vagy meta-kommentárral kezdődik, nem próbálkozik újra jobb prompttal
3. **Nincs anti-összefoglaló szabály**: Az AI gyakran "elmesél" ahelyett, hogy dramatizálna — hiányzik az explicit tiltás
4. **Nincs jelenetátmenet utasítás**: Két jelenet között nincs utasítás a gördülékeny átvezetésre
5. **Párbeszéd-tag ismétlődés**: Nincs szabály a változatos narrátor-közbevetések használatára ("mondta", "kérdezte" ismétlődik)
6. **Előző jelenet tartalma túl rövid kontextus**: Csak az utolsó 1500-3000 karakter megy át, és nincs explicit "NE ismételd meg" szabály

## Javítások

### 1. `prompt-builder.ts` — Új függvények

**`buildScenePositionContext()`** — Jelenetpozíció-specifikus utasítások:
- Fejezet első jelenete: "Kezdd in medias res vagy erős képpel. Mutasd be a helyszínt érzékletesen."
- Köztes jelenet: "Építsd a feszültséget. Mélyítsd a konfliktust."
- Utolsó jelenet: "Zárd erős cliffhangerrel vagy érzelmi csúcsponttal."

**`buildAntiSummaryRules()`** — Összefoglaló-stílus tiltása:
- "NE foglald össze az eseményeket — DRAMATIZÁLD őket!"
- "NE írd: 'Aztán történt X.' HANEM írd le X-et valós időben, párbeszéddel, cselekvéssel."
- "Minden jelenet legyen jelenlegi idejű élmény, NE visszatekintő összefoglaló."

**`buildDialogueVarietyRules()`** — Párbeszéd változatosság:
- "Váltogasd a párbeszéd-tageket: mondta, suttogta, vetette oda, morogta, kérdezte — NE használd 3x egymás után ugyanazt"
- "Használj akció-tageket párbeszéd helyett is: 'Megforgatta a szemét. – Persze, ahogy mondod.'"

**`buildAntiRepetitionPrompt()`** — Előzetes ismétlés-megelőzés:
- "NE ismételd meg az előző jelenet utolsó eseményeit"
- "NE írd le újra, amit a szereplő már megcsinált — folytasd onnan, ahol abbahagyta"

### 2. `quality-checker.ts` — Bővített ellenőrzés + retry flag

- Új ellenőrzés: **összefoglaló-stílus detektálás** (ha a szöveg >30%-a "aztán", "ezután", "később" típusú szavakkal kezdődő mondatokból áll)
- Új ellenőrzés: **párbeszéd-tag ismétlődés** (ha "mondta" >5x szerepel 1000 szónként)
- A `QualityResult`-hoz új mező: `shouldRetry: boolean` — ha true, az író funkció újrapróbálkozik megerősített prompttal

### 3. `process-next-scene/index.ts` és `write-scene/index.ts` — Prompt javítás + retry logika

- A user prompt-ba beépítjük az összes új prompt-blokk: `buildScenePositionContext()`, `buildAntiSummaryRules()`, `buildDialogueVarietyRules()`, `buildAntiRepetitionPrompt()`
- **Quality-based retry**: Ha `checkSceneQuality` `shouldRetry: true`-t ad, az AI újrapróbálkozik egy megerősített prompttal (max 1 quality retry), ami tartalmazza a konkrét hibaüzeneteket javítási utasításként
- A `process-next-scene`-ben a `previousContent.slice(-3000)` helyett `-2000` + explicit "NE ismételd!" szabály

### 4. `generate-detailed-outline/index.ts` — Jobb vázlat

- A jelenet-vázlat promptba bekerül: `pov_goal` (mit akar elérni a POV karakter ebben a jelenetben) és `pov_emotion_start`/`pov_emotion_end` mezők kérése, hogy az AI-nak legyen konkrét érzelmi íve minden jelenethez
- A JSON schema-ba felvenni: `"pov_goal": "...", "pov_emotion_start": "...", "pov_emotion_end": "..."`

## Érintett fájlok

| Fájl | Változás |
|------|---------|
| `supabase/functions/_shared/prompt-builder.ts` | 4 új függvény |
| `supabase/functions/_shared/quality-checker.ts` | Összefoglaló-detektálás, párbeszéd-tag check, `shouldRetry` mező |
| `supabase/functions/process-next-scene/index.ts` | Új prompt blokkok + quality retry |
| `supabase/functions/write-scene/index.ts` | Új prompt blokkok + quality retry |
| `supabase/functions/generate-detailed-outline/index.ts` | Bővített jelenet-vázlat mezők |

