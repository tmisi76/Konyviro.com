
# Terv: Email Időzítés Funkció

## Összefoglaló

Az admin email küldő rendszerbe új időzítési funkció kerül, amely lehetővé teszi:
1. **Azonnali küldés** (jelenlegi működés)
2. **Ütemezett küldés** - megadott dátumra/időpontra

---

## 1. Adatbázis Módosítás

Új oszlop az `admin_email_campaigns` táblához:

| Oszlop | Típus | Leírás |
|--------|-------|--------|
| scheduled_at | timestamptz | Ütemezett küldési időpont (NULL = azonnali) |

A `status` mező új értéket kap: `scheduled` (ütemezve)

---

## 2. UI Módosítások

### Küldési mód választó

```text
┌─────────────────────────────────────────────────────────────┐
│  Küldés időpontja                                          │
│                                                             │
│  ○ Azonnali küldés                                          │
│  ● Ütemezett küldés                                         │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ 📅 2026.02.10    │  │ 🕐 14:30         │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Új komponensek az AdminEmailSender.tsx-ben:

- Radio group: "Azonnali" vs "Ütemezett"
- Dátum választó (Calendar komponens)
- Idő választó (Select vagy Input)
- Az "Ütemezés" gomb mellett megjelenik az időpont összefoglaló

### Táblázat frissítése

Az előző kampányok táblázatban:
- Új "scheduled" státusz badge: `🕐 Ütemezve` (narancs)
- "Küldve" oszlopban az ütemezett időpont is megjelenik

---

## 3. Backend Változások

### Új Edge Function: `process-scheduled-campaigns`

Ez egy **cron-triggered** function, ami percenként fut:

1. Lekérdezi az esedékes kampányokat: `WHERE status = 'scheduled' AND scheduled_at <= NOW()`
2. Minden esedékes kampánynál meghívja a `send-campaign-email` logikát
3. Státuszt `sending`-re állítja

### A `send-campaign-email` módosítása

Támogatnia kell az ütemezett kampányokat:
- Ha a kampány `scheduled` státuszú és `scheduled_at <= NOW()`, akkor küldi
- Egyébként nem küldi (hibát dob)

---

## 4. Cron Job Beállítása

pg_cron job létrehozása az ütemezett kampányok feldolgozásához:

```sql
SELECT cron.schedule(
  'process-scheduled-campaigns',
  '* * * * *',  -- percenként
  $$ SELECT net.http_post(...) $$
);
```

---

## 5. Érintett Fájlok

| Fájl | Művelet |
|------|---------|
| `src/pages/admin/AdminEmailSender.tsx` | Módosítás: időzítő UI |
| `src/hooks/admin/useEmailCampaigns.ts` | Módosítás: scheduled_at támogatás |
| `supabase/functions/send-campaign-email/index.ts` | Módosítás: ütemezett támogatás |
| `supabase/functions/process-scheduled-campaigns/index.ts` | Új: cron handler |
| Adatbázis migráció | Új oszlop + cron job |

---

## 6. UI Részletek

### State kezelés

```typescript
const [sendMode, setSendMode] = useState<"immediate" | "scheduled">("immediate");
const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
const [scheduledTime, setScheduledTime] = useState("12:00");
```

### Időpont összevonása

```typescript
// Dátum + idő kombinálása
const getScheduledAt = () => {
  if (!scheduledDate) return null;
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  const date = new Date(scheduledDate);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};
```

### Validáció

- Az ütemezett időpontnak a jövőben kell lennie
- Minimum 5 perces előnyt kérünk (biztonság)

---

## 7. Kampány Létrehozás Frissítése

A `useCreateCampaign` hook-ban:

```typescript
// Ha ütemezett
if (campaign.scheduled_at) {
  status: "scheduled",
  scheduled_at: campaign.scheduled_at,
}
// Ha azonnali
else {
  status: "draft",
}
```

---

## 8. Kampány Kezelő Gombok

```text
┌───────────────────────────────────────────────────────────┐
│                                                           │
│   Küldés: ○ Azonnal  ● Ütemezve: 2026.02.10 14:30        │
│                                                           │
│   [Kampány Ütemezése]           [Kampány Indítása]        │
│        ↑                              ↑                   │
│   Ütemezett módban              Azonnali módban           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 9. Ütemezett Kampányok Törlése/Módosítása

A táblázatban az ütemezett kampányoknál megjelenik:
- **Törlés** gomb - visszavonja az ütemezést
- Kattintásra megerősítő modal

---

## 10. Státusz Badge-ek

| Státusz | Badge | Szín |
|---------|-------|------|
| draft | Piszkozat | Szürke |
| **scheduled** | 🕐 Ütemezve | Narancs |
| sending | Küldés alatt | Kék |
| completed | Kész | Zöld |
| failed | Sikertelen | Piros |

---

## 11. Implementációs Sorrend

1. **Adatbázis migráció** - `scheduled_at` oszlop hozzáadása
2. **UI frissítése** - Időzítő komponensek
3. **Hook frissítése** - `scheduled_at` támogatás
4. **Cron Edge Function** - Ütemezett küldő
5. **Cron Job beállítása** - pg_cron
6. **Táblázat frissítése** - Új státusz és törlés lehetőség
