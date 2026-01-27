
# Admin Felület Javítása - Valós Adatok Megjelenítése

## Probléma Azonosítása

Az admin felhasználók listája üres, mert:
1. A `profiles` tábla RLS policy-ja **csak a saját profilt engedi látni** minden felhasználónak
2. Nincs admin-specifikus SELECT policy a `profiles` táblán
3. Az email címek nem érhetők el kliens oldalról (placeholder értékek jelennek meg)

## Aktuális Adatbázis Állapot

| Felhasználó | Email | Tier | Stripe ID |
|------------|-------|------|-----------|
| Farkas Erzsébet | - | free | - |
| Dr. Varga-Nagy Adrienn | nagyadrienn986@gmail.com | hobby | cus_Ts1Q5TfJPrcbji |
| Berezi Nándor | - | free | - |
| Tóth Mihály (Admin) | tmisi76@gmail.com | writer | - |

## Megoldási Terv

### 1. RLS Policy Hozzáadása az Adminoknak

Új RLS policy létrehozása a `profiles` táblán, ami lehetővé teszi az adminoknak az összes profil olvasását:

```sql
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_admin(auth.uid()));
```

Ez a policy a már meglévő `is_admin()` security definer függvényt használja.

### 2. Edge Function Létrehozása Felhasználók Lekérdezésére

Új edge function: `admin-get-users`

A function service role-lal lekérdezi:
- A `profiles` tábla adatait
- Az `auth.users` tábla email címeit (csak service role érheti el)
- A `projects` tábla projekt számokat

Visszaadja:
- Teljes felhasználói lista email címekkel
- Projekt statisztikák
- Előfizetési információk

### 3. Admin Hookek Frissítése

A `useAdminUsers`, `useRecentUsers`, és `useAdminStats` hookokat módosítani kell:
- Az új edge function-t használják a közvetlen Supabase lekérdezések helyett
- Valós email címeket kapnak vissza
- A projekt számokat is megkapják

### 4. Dashboard Adatok Szinkronizálása

A dashboard statisztikák (összes felhasználó, előfizetések, bevétel) szintén a frissített adatokat fogják használni.

## Technikai Részletek

### Új Edge Function: `admin-get-users`

```text
supabase/functions/admin-get-users/index.ts
```

**Működése:**
1. JWT tokennel ellenőrzi az admin jogosultságot
2. Service role-lal lekérdezi az auth.users táblát
3. Join-olja a profiles adatokkal
4. Visszaadja a teljes felhasználói listát

### Hook Módosítások

**useAdminUsers.ts:**
- Edge function hívás a közvetlen query helyett
- Valós email megjelenítés
- Projekt számlálás integrálása

**useRecentUsers.ts:**
- Edge function használata
- Email és név megjelenítés

**useAdminStats.ts:**
- Edge function a pontos statisztikákhoz
- Stripe-ból lekért bevételi adatok

### RLS Policy Változások

```sql
-- Új admin policy a profiles táblára
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_admin(auth.uid()));
```

## Stripe Webhook Javítás

**A webhook nem futott le** - ezt a Stripe Dashboard-ban kell ellenőrizni és konfigurálni:

1. Webhook URL: `https://qdyneottmnulmkypzmtt.supabase.co/functions/v1/stripe-webhook`
2. Események: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Signing secret: Lovable Cloud secrets-be kell beállítani

## Végrehajtási Sorrend

1. RLS policy hozzáadása (migration)
2. Edge function létrehozása és deployolása
3. Hook-ok frissítése az edge function használatára
4. Tesztelés az admin felületen
5. Webhook konfiguráció ellenőrzése a Stripe Dashboard-ban
