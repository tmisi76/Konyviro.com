
# Terv: Email Küldő Javítása + Leiratkozás

## 1. Probléma Azonosítása

A konzol hibából látszik:
```
null value in column "admin_id" of relation "admin_email_campaigns" violates not-null constraint
```

**Ok:** A `useCreateCampaign` hook-ban az insert nem tartalmazza az `admin_id` mezőt, pedig az kötelező!

---

## 2. Javítások

### 2.1 Admin ID Hozzáadása az Insert-hez

**Fájl:** `src/hooks/admin/useEmailCampaigns.ts`

A 49. sorban már lekérjük a user-t, de nem használjuk:
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

**Javítás:** Hozzáadjuk az `admin_id: user.id` mezőt az inserthez (55-62. sor).

---

### 2.2 Leiratkozási Rendszer

#### Adatbázis: Új tábla `email_unsubscribes`

| Oszlop | Típus | Leírás |
|--------|-------|--------|
| id | uuid | PK |
| user_id | uuid | FK a profiles-hoz (nullable) |
| email | text | Email cím |
| unsubscribed_at | timestamptz | Leiratkozás időpontja |
| reason | text | Opcionális ok |
| token | text | Egyedi token a linkeléshez |

#### Új Edge Function: `unsubscribe-email`

- Fogadja a tokent URL-ből
- Validálja és elmenti a leiratkozást
- Visszaad egy megerősítő HTML oldalt

#### Kampány Email Frissítése

A `send-campaign-email` edge function-ben:
1. Ellenőrzi minden küldés előtt, hogy az email nincs-e a `email_unsubscribes` táblában
2. Automatikusan hozzáadja a leiratkozási linket minden email végéhez

---

## 3. Leiratkozási Link Formátum

Minden kampány emailhez automatikusan hozzáadódik:

```html
<div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
  <p style="font-size: 12px; color: #94a3b8;">
    Ha nem szeretnél több emailt kapni, 
    <a href="https://[PROJECT_URL]/api/unsubscribe?token={{unsubscribe_token}}" style="color: #7c3aed;">
      kattints ide a leiratkozáshoz
    </a>.
  </p>
</div>
```

---

## 4. Érintett Fájlok

| Fájl | Művelet |
|------|---------|
| `src/hooks/admin/useEmailCampaigns.ts` | Javítás: admin_id hozzáadása |
| `supabase/functions/send-campaign-email/index.ts` | Leiratkozás ellenőrzés + link |
| `supabase/functions/unsubscribe-email/index.ts` | Új: leiratkozás kezelése |
| Adatbázis migráció | Új tábla: `email_unsubscribes` |

---

## 5. Leiratkozási Folyamat

```text
┌─────────────────────────────────────────────────────────────────┐
│  Felhasználó kap egy kampány emailt                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Email tartalma:                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  [Admin által írt tartalom]                               │  │
│  │                                                           │  │
│  │  ─────────────────────────────────────────────────────    │  │
│  │                                                           │  │
│  │  Ha nem szeretnél több emailt kapni, kattints ide ←───────│──│─── Link
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Kattintás után:                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  ✓ Sikeresen leiratkoztál!                                │  │
│  │                                                           │  │
│  │  Többé nem fogsz marketing emaileket kapni.               │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Adatbázis Séma (SQL)

```sql
CREATE TABLE email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(user_id),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  reason text,
  unsubscribed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Index a gyors kereséshez
CREATE INDEX idx_email_unsubscribes_email ON email_unsubscribes(email);
CREATE INDEX idx_email_unsubscribes_token ON email_unsubscribes(token);

-- RLS: Service role can manage, users can view their own
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage unsubscribes"
ON email_unsubscribes FOR ALL
USING (true)
WITH CHECK (true);
```

---

## 7. Token Generálás

Minden email küldésekor egyedi token generálása:
```typescript
const token = crypto.randomUUID();
```

A token tartalmazza az email címet titkosítva, így a leiratkozás oldal tudja azonosítani a felhasználót.

---

## 8. Összefoglalás

| Javítás | Leírás |
|---------|--------|
| **admin_id bug** | Hozzáadjuk a user.id-t az inserthez |
| **Leiratkozás tábla** | Új `email_unsubscribes` tábla |
| **Leiratkozás link** | Automatikusan beillesztve minden emailbe |
| **Leiratkozás endpoint** | Új edge function a token feldolgozásához |
| **Küldés előtti ellenőrzés** | Kihagyja a leiratkozott címeket |
