
# Javítási Terv: Hangoskönyv Előnézet Hiba + Árazási Információ

## Azonosított Problémák

### 1. ElevenLabs API 400 Hiba
A logok egyértelműen mutatják:
```
"voice_limit_reached": "You have reached your maximum amount of custom voices (30 / 30)"
```

**Probléma**: A 4 narrátor (`NOpBlnGInO9m6vDvFkFC`, `IRHApOXLvnW57QJPQH2P` stb.) custom/klónozott hangok, és az ElevenLabs fiók elérte a 30 custom voice limitjét.

**Megoldás**: A `tts_voices` táblában cserélni kell az `elevenlabs_voice_id` értékeket ElevenLabs standard hangokra. Magyar hangok helyett angol hangokat kell használni, mert a standard hangok között nincsenek magyar nyelvűek, de a `eleven_multilingual_v2` modell magyar szöveget is képes felolvasni angol hangokkal.

### 2. Hiányzó Árazási Információ
A felhasználónak tudnia kell, hogy:
- A hangoskönyv készítés extra költséggel jár
- Előbb krediteket kell vásárolnia
- Mennyibe kerül kb. a könyve

---

## Megoldások

### 1. Narrátor Hangok Frissítése (Adatbázis)

A `tts_voices` táblában az `elevenlabs_voice_id` értékeket cserélni kell működő ElevenLabs standard hangokra:

| Név | Jelenlegi (hibás) | Új voice_id | Hang típusa |
|-----|-------------------|-------------|-------------|
| Narrátor 1 | `NOpBlnGInO9m6vDvFkFC` | `JBFqnCBsd6RMkjVDRZzb` | George - férfi |
| Narrátor 2 | `IRHApOXLvnW57QJPQH2P` | `EXAVITQu4vr4xnSDxMaL` | Sarah - női |
| Narrátor 3 | `xjlfQQ3ynqiEyRpArrT8` | `onwK4e9ZLuTAKqWW03F9` | Daniel - férfi |
| Narrátor 4 | `XfNU2rGpBa01ckF309OY` | `pFZP5JQG7iQjIQuC4Bku` | Lily - női |

### 2. AudiobookTab.tsx Módosítás - Árazási Információ

A `CostEstimate` komponenst bővíteni kell:

```tsx
const CostEstimate = () => {
  // Kiszámítjuk a becsült költséget a legkisebb csomag áráig
  const cheapestPackage = AUDIOBOOK_CREDIT_PACKAGES[0]; // 30 perc / 9990 Ft
  const estimatedCostHuf = Math.ceil(estimatedMinutes * 300); // ~300 Ft/perc átlag
  
  return (
    <div className="rounded-lg border p-3 space-y-2">
      {/* Becsült hossz és egyenleg (már megvan) */}
      
      {/* ÚJ: Becsült költség kiírása */}
      {!canGenerate && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Becsült költség:</strong> kb. {estimatedCostHuf.toLocaleString("hu-HU")} Ft
          </p>
          <p className="text-xs text-amber-600 mt-1">
            A hangoskönyv készítéshez előbb kredit vásárlás szükséges.
          </p>
        </div>
      )}
    </div>
  );
};
```

### 3. VoicePicker.tsx - Hibaüzenet Javítás

A hibakezelést javítani kell, hogy ne az ElevenLabs technikai hibaüzenetét mutassa:

```tsx
// useVoicePreview onError:
onError: (error) => {
  // Barátságosabb hibaüzenet
  toast.error("Hang előnézet nem elérhető. Kérlek próbáld újra később.");
}
```

---

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| **Adatbázis migráció** | `tts_voices` tábla `elevenlabs_voice_id` frissítése |
| `src/components/audiobook/AudiobookTab.tsx` | + Becsült költség kiírása, kredit vásárlás szükségességének kommunikálása |
| `src/hooks/useAudiobook.ts` | Hibaüzenet javítása a voice preview-nál |

---

## Részletes Implementáció

### 1. SQL Migráció - Voice ID-k Cseréje

```sql
-- Update voice IDs to working ElevenLabs standard voices
UPDATE tts_voices SET 
  elevenlabs_voice_id = 'JBFqnCBsd6RMkjVDRZzb',
  description = 'Mély, nyugodt férfi hang'
WHERE id = 'e0ef7984-457e-4edc-94e5-4979531d5e37';

UPDATE tts_voices SET 
  elevenlabs_voice_id = 'EXAVITQu4vr4xnSDxMaL',
  description = 'Kellemes női hang'
WHERE id = '0f35d413-97e8-4acb-907a-45ef1c836b76';

-- stb...
```

### 2. AudiobookTab.tsx - Módosított CostEstimate

Új információk hozzáadása:
- Becsült költség Ft-ban
- Egyértelmű üzenet, hogy kredit vásárlás szükséges
- Link/gomb a kredit vásárláshoz közvetlenül itt is

### 3. useAudiobook.ts - Hibaüzenet Javítás

A `useVoicePreview` mutáció `onError` callback-jét módosítani:
- Ne jelenjen meg a technikai ElevenLabs hibaüzenet
- Barátságos magyar nyelvű üzenet helyette

---

## Implementációs Sorrend

1. **Adatbázis migráció** - Voice ID-k cseréje működő hangokra
2. **AudiobookTab.tsx** - Árazási információ és kredit vásárlás kommunikáció
3. **useAudiobook.ts** - Hibaüzenet javítása

---

## Várt Eredmény

- ✅ Az „Előnézet" gomb működik a 4 narrátornál
- ✅ A felhasználó látja, hogy kb. mennyibe kerül a hangoskönyv
- ✅ Egyértelmű üzenet, hogy kredit vásárlás szükséges
- ✅ Barátságos hibaüzenetek API hiba esetén
