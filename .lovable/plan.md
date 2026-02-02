
# Admin Funkciók Bővítése - Technikai Terv

## 1. Új előfizetés értesítés email (tmisi76@gmail.com)

### Cél
Amikor valaki sikeresen előfizet (első fizetés), az admin kapjon értesítő emailt a részletekkel.

### Megvalósítás
**Fájl:** `supabase/functions/stripe-webhook/index.ts`

A `checkout.session.completed` event végén, sikeres profil frissítés után:
- Email küldése a `tmisi76@gmail.com` címre
- Tartalmazni:
  - Felhasználó neve és email címe
  - Csomag neve (Hobbi/Profi/Pro)
  - Havi/Éves előfizetés
  - Összeg (Ft)
  - Dátum

```text
// Kód elhelyezése: stripe-webhook/index.ts ~340. sor után
// A profil frissítés sikere után

const adminEmail = "tmisi76@gmail.com";
const tierDisplay = tierNames[tier] || tier;
const periodDisplay = billingPeriod === "yearly" ? "éves" : "havi";
const priceAmount = billingPeriod === "yearly" 
  ? { hobby: 29940, writer: 89940, pro: 179940 }[tier] 
  : { hobby: 4990, writer: 14990, pro: 29990 }[tier];

// Küldés Resend-del
```

---

## 2. Előfizetések menüpont javítása

### Problémák
| Jelenlegi hiba | Javítás |
|----------------|---------|
| Éves előfizetők is havidíjasként jelennek meg | `billing_period` mező használata |
| Számlák kód alapján jelennek meg | `full_name` vagy `display_name` megjelenítése |
| MRR nem különíti el havi/éves | Külön metrikák: havi MRR + éves bevétel |

### Fájlok módosítása

**1. `src/hooks/admin/useBillingStats.ts`**
- Új mezők hozzáadása:
  - `monthlyMRR`: Csak havidíjasok bevétele
  - `yearlyRevenue`: Éves előfizetők éves bevétele
  - `yearlyCount`: Éves előfizetők száma  
  - `monthlyCount`: Havidíjasok száma
- A `billing_period` mező lekérdezése és használata
- Ár számítás módosítása:
  - Havi: 4990/14990/29990
  - Éves: 2495/7495/14995 (havi ekvivalens MRR-hez)

**2. `src/hooks/admin/useAdminSubscriptions.ts`**
- `billing_period` mező hozzáadása az interfészhez
- Valódi nevek lekérdezése (`full_name`, `display_name`)
- Összeg megjelenítés: havi vs éves ár megkülönböztetése

**3. `src/hooks/admin/useRecentInvoices.ts`**
- Valódi nevek megjelenítése (`full_name` vagy `display_name`)
- Ha nincs név: email cím helyettesítő

**4. `src/pages/admin/AdminBilling.tsx`**
- Új KPI kártya: "Éves előfizetések bevétele"
- Új KPI kártya: "Éves előfizetők száma"
- MRR kártyánál "Havi ismétlődő bevétel" → csak havidíjasok
- Táblázatban "Ft/hó" → "Ft/hó" vagy "Ft/év" a `billing_period` alapján

---

## 3. AI Beállítások - Valós hatás tisztázása

### Jelenlegi helyzet
A `system_settings` táblában tárolt beállítások közül **csak az `ai_default_model` van használva** a kódban:
- `generate/index.ts` → `getAIModel()` lekéri a `ai_default_model`-t

### Ami NEM használt (placeholder):
- `ai_temperature` - nincs implementálva az AI hívásokban
- `ai_available_models` - nincs szűrve
- `ai_tier_models` - nincs szűrve előfizetés szerint
- `ai_token_limits` - a limitek a `profiles` táblából jönnek, nem innen

### Javasolt megoldás
**Opció A**: Címkék hozzáadása az UI-n, hogy mi működik:
- ✅ "Aktív" badge az `ai_default_model` mellé
- ⚠️ "Hamarosan" badge a többi mellé

**Opció B**: Implementálni a többi beállítást is

**Fájl módosítás:** `src/pages/admin/AdminAISettings.tsx`
- Vizuális jelzés hozzáadása: mely beállítások aktívak

---

## 4. Email sablonok - Login link változó

### Jelenlegi változók
A `src/constants/emailVariables.ts` fájlban van:
- `{{reset_link}}` - jelszó visszaállítás
- `{{verification_link}}` - email megerősítés
- `{{magic_link}}` - magic link bejelentkezés

### Új változó hozzáadása
```text
{ 
  name: 'login_url', 
  description: 'Bejelentkezési oldal URL', 
  category: 'auth', 
  example: 'https://konyviro.com/auth' 
}
```

**Fájl:** `src/constants/emailVariables.ts`

---

## 5. Support Ticketek - Email értesítések

### 5.1 Admin értesítés új ticketről

**Új edge function:** `send-support-notification`
- Trigger: új `support_tickets` rekord beszúrásakor (RLS/trigger)
- Vagy: a ticket létrehozó oldal hívja közvetlenül

**Egyszerűbb megoldás:** Database trigger + webhook
- Új ticket esetén email a `tmisi76@gmail.com` címre
- Tartalmazni: tárgy, leírás, felhasználó email

### 5.2 User értesítés admin válaszról

**Fájl módosítása:** `src/hooks/admin/useTicketMessages.ts` → `useSendTicketReply`

A `sendReplyMutation` után:
- Edge function hívás: `send-ticket-reply-email`
- Felhasználó emailcímének lekérése a ticketből
- Email küldése a válasszal

**Új edge function:** `send-ticket-reply-email`
```text
Input: { ticketId, message, recipientEmail }
Output: Email küldése a felhasználónak
```

---

## 6. Dashboard - Valós adatok bővítése

### Jelenlegi metrikák
- Összes felhasználó ✅
- Havi bevétel ✅
- Aktív előfizetések ✅
- Generált könyvek ✅

### Új metrikák hozzáadása

**Fájl:** `src/hooks/admin/useAdminStats.ts`

Új mezők:
```text
totalWords: number;         // Összes generált szó
totalChapters: number;      // Összes fejezet
freeUserBooks: number;      // Ingyenes userek könyvei
paidUserBooks: number;      // Fizetős userek könyvei
freeUserWords: number;      // Ingyenes userek szavai
paidUserWords: number;      // Fizetős userek szavai
```

SQL lekérdezés:
```sql
SELECT 
  p.subscription_tier,
  COUNT(DISTINCT proj.id) as project_count,
  SUM(proj.word_count) as total_words
FROM profiles p
LEFT JOIN projects proj ON proj.user_id = p.user_id
GROUP BY p.subscription_tier
```

**Fájl:** `src/pages/admin/AdminDashboard.tsx`

Új kártyák a "Generált könyvek" után:
- "Összes generált szó" (formázva: 599K)
- "Ingyenes vs Fizetős" projektek/szavak

---

## Összefoglaló - Érintett fájlok

| Fájl | Változtatás típusa |
|------|-------------------|
| `supabase/functions/stripe-webhook/index.ts` | Email küldés új előfizetésről |
| `src/hooks/admin/useBillingStats.ts` | Havi/éves szétválasztás |
| `src/hooks/admin/useAdminSubscriptions.ts` | Valódi nevek, billing_period |
| `src/hooks/admin/useRecentInvoices.ts` | Valódi nevek megjelenítése |
| `src/pages/admin/AdminBilling.tsx` | UI: új kártyák, táblázat javítás |
| `src/pages/admin/AdminAISettings.tsx` | Aktív beállítások jelölése |
| `src/constants/emailVariables.ts` | login_url változó |
| `src/hooks/admin/useTicketMessages.ts` | Email küldés válasz után |
| `src/hooks/admin/useAdminStats.ts` | Új statisztikák |
| `src/pages/admin/AdminDashboard.tsx` | Új dashboard kártyák |
| `supabase/functions/send-ticket-reply-email/index.ts` | ÚJ: ticket válasz email |
| `supabase/functions/send-support-notification/index.ts` | ÚJ: admin értesítés ticketről |

---

## Prioritási sorrend

1. **Előfizetés értesítés** - gyors, egy fájl módosítás
2. **Előfizetések menüpont** - 4 fájl, fontos üzleti adat
3. **Support email értesítések** - 2 új edge function + hook módosítás
4. **Dashboard statisztikák** - 2 fájl módosítás
5. **Email változó** - 1 fájl, egyszerű
6. **AI beállítások jelölés** - 1 fájl, kozmetikai
