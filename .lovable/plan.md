

# Terv: Admin Email Küldő Rendszer

## Összefoglaló

Új admin oldal létrehozása (`/admin/email-sender`) ahol:
1. **Csoport kiválasztása** - kinek küldjük az emailt
2. **Email szerkesztés** - tárgy és tartalom megírása (RichTextEditor-ral)
3. **Küldés** - batch-ekben kiküldés
4. **Előzmények** - minden elküldött email eltárolása és megjelenítése

---

## 1. Adatbázis Séma

### Új tábla: `admin_email_campaigns`

| Oszlop | Típus | Leírás |
|--------|-------|--------|
| id | uuid | Elsődleges kulcs |
| admin_id | uuid | Küldő admin user_id |
| subject | text | Email tárgya |
| body_html | text | HTML tartalom |
| body_text | text | Plain text verzió |
| recipient_type | text | 'all', 'plan', 'inactive', 'custom' |
| recipient_filter | jsonb | Szűrési paraméterek |
| recipient_count | integer | Címzettek száma |
| sent_count | integer | Sikeresen elküldött |
| failed_count | integer | Sikertelen küldések |
| status | text | 'draft', 'sending', 'completed', 'failed' |
| started_at | timestamptz | Küldés kezdete |
| completed_at | timestamptz | Küldés befejezése |
| created_at | timestamptz | Létrehozás ideje |

---

## 2. Címzett Csoportok

Választható opciók:

| Csoport | Leírás |
|---------|--------|
| **Minden felhasználó** | Összes regisztrált user |
| **Előfizetési csomag** | Free / Hobby / Író / Pro |
| **Inaktív felhasználók** | X napja nem aktív |
| **Egyéni lista** | Kézzel beírt email címek |

---

## 3. Új Fájlok

| Fájl | Leírás |
|------|--------|
| `src/pages/admin/AdminEmailSender.tsx` | Fő oldal komponens |
| `src/hooks/admin/useEmailCampaigns.ts` | Hook a kampányok kezeléséhez |
| `supabase/functions/send-campaign-email/index.ts` | Edge function a küldéshez |

---

## 4. UI Felépítés

```text
┌────────────────────────────────────────────────────────────┐
│  📧 Email Kampányok                     [+ Új kampány]     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Új Email Küldése                                    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Címzettek: [Minden felhasználó ▼]                   │   │
│  │                                                     │   │
│  │ Ha "Előfizetési csomag":  [Free / Hobby / Író / Pro]│   │
│  │ Ha "Inaktív":             [7/14/30 napja ▼]         │   │
│  │ Ha "Egyéni":              [Textarea email címek]    │   │
│  │                                                     │   │
│  │ Tárgy: [________________________________]           │   │
│  │                                                     │   │
│  │ Tartalom:                                           │   │
│  │ ┌───────────────────────────────────────────────┐   │   │
│  │ │ [B] [I] [U] │ [Link] │ [Változó▼]  │ [HTML]   │   │   │
│  │ ├───────────────────────────────────────────────┤   │   │
│  │ │                                               │   │   │
│  │ │  RichTextEditor                               │   │   │
│  │ │                                               │   │   │
│  │ └───────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │ [Teszt email küldése]      [📤 Kampány indítása]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Előző kampányok                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Tárgy          │ Címzettek │ Küldve    │ Státusz    │   │
│  │────────────────┼───────────┼───────────┼────────────│   │
│  │ Akciós ajánlat │ 156       │ 2026.02.05│ ✓ Kész     │   │
│  │ Inaktív emléke │ 42        │ 2026.02.01│ ✓ Kész     │   │
│  │ Új funkció     │ 312       │ 2026.01.28│ ✓ Kész     │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Implementációs Részletek

### 5.1 Címzett számláló

A csoport kiválasztásakor a rendszer lekérdezi, hány felhasználó fog emailt kapni:

```typescript
const { data: count } = await supabase.rpc('count_campaign_recipients', {
  recipient_type: 'plan',
  filter_value: 'hobby'
});
// Megjelenik: "~156 címzett"
```

### 5.2 Változók beszúrása

A `VariableInserter` komponens használata, ami beilleszti a `{{user_name}}` stb. változókat.

### 5.3 Küldés folyamat

1. Admin elindítja a kampányt
2. Edge function batch-ekben (10/kör) küldi az emaileket
3. Státusz frissítés minden batch után
4. Befejezéskor összesítés mentése

---

## 6. Navigáció Frissítése

Az `AdminLayout.tsx`-ben új menüpont:

```typescript
{ name: "Email Küldés", href: "/admin/email-sender", icon: Send },
```

Vagy beágyazás az "Email Sablonok" alá al-link-ként.

---

## 7. Routing Frissítése

Az `App.tsx`-ben új route:

```typescript
<Route
  path="/admin/email-sender"
  element={
    <ProtectedRoute>
      <AdminLayout>
        <AdminEmailSender />
      </AdminLayout>
    </ProtectedRoute>
  }
/>
```

---

## 8. Változtatandó Fájlok Összesítése

| Fájl | Művelet |
|------|---------|
| `src/pages/admin/AdminEmailSender.tsx` | Új fájl - fő oldal |
| `src/hooks/admin/useEmailCampaigns.ts` | Új fájl - hook |
| `supabase/functions/send-campaign-email/index.ts` | Új fájl - edge function |
| `src/layouts/AdminLayout.tsx` | Módosítás - új menüpont |
| `src/App.tsx` | Módosítás - új route |
| `src/pages/admin/index.ts` | Módosítás - export |
| Adatbázis migráció | Új tábla: `admin_email_campaigns` |

---

## 9. RLS Szabályok

A `admin_email_campaigns` táblára:

```sql
-- Csak adminok láthatják és kezelhetik
CREATE POLICY "Admins can manage email campaigns"
ON admin_email_campaigns FOR ALL
USING (is_admin(auth.uid()));
```

