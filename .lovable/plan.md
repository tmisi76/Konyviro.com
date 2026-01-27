
# Felhasználó Létrehozás és Belépési Adatok Email Küldése

## Összefoglaló

A kérés két fő funkciót tartalmaz:
1. **Új felhasználó létrehozása** → automatikus email küldés a belépési adatokkal és üdvözléssel
2. **Admin emlékeztető** → meglévő admin felhasználók számára belépési adatok újraküldése

---

## Jelenlegi Állapot

### Ami már működik:
- `AddUserModal` komponens meglévő UI-val
- `admin-create-user` Edge Function részleges email küldéssel
- `send-admin-email` Edge Function admin emailekhez
- Email sablonok a `email_templates` táblában (welcome, password_reset, stb.)

### Ami hiányzik:
- A jelenlegi email nem használja a sablonrendszert
- Nincs "Belépési adatok küldése" gomb a meglévő felhasználóknál
- Nincs admin emlékeztető funkció
- A storybook_credit_limit nincs beállítva a user létrehozáskor

---

## Megoldás

### 1. Edge Function Frissítése: `admin-create-user`

**Változtatások:**
- Storybook kredit limit hozzáadása tier alapján (hobby: 1, profi: 5, free: 0)
- Szebb HTML email sablon használata
- Részletesebb belépési információk küldése

```text
supabase/functions/admin-create-user/index.ts
```

**Új logika:**
```typescript
// Storybook credits based on tier
const storybookCredits = {
  free: 0,
  hobby: 1,
  writer: 5,
  pro: 999
};

// Update profile with storybook_credit_limit
storybook_credit_limit: storybookCredits[subscription_tier]
```

### 2. Új Edge Function: `admin-send-credentials`

**Cél:** Meglévő felhasználónak belépési adatok (email + új jelszó) küldése

**Működése:**
1. Admin jogosultság ellenőrzése
2. Felhasználó keresése user_id alapján
3. Új jelszó generálása és beállítása (`supabase.auth.admin.updateUserById`)
4. Email küldése a belépési adatokkal

```text
supabase/functions/admin-send-credentials/index.ts
```

### 3. Frontend: Belépési Adatok Küldése Gomb

**Helyszín:** `AdminUsers.tsx` dropdown menüben

**Új menüpont:**
```tsx
<DropdownMenuItem onClick={() => handleSendCredentials(user)}>
  <KeyRound className="mr-2 h-4 w-4" />
  Belépési adatok küldése
</DropdownMenuItem>
```

**Működése:**
- Megerősítő dialog megjelenítése
- Edge function hívása
- Új jelszó generálása és küldése emailben

### 4. Admin Emlékeztető Funkció

**Cél:** Admin felhasználóknak emlékeztető email küldése a belépési adataikról

**Helyszín:** Admin Users táblázatban egy új gomb admin felhasználóknál

**Logika:**
- Azonosítás: ha a user `admin_users` táblában van
- Gomb: "Emlékeztető küldése"
- Email tartalom: belépési link, email cím, jelszó reset link

---

## Részletes Technikai Terv

### 1. `admin-create-user` Edge Function Frissítése

**Változások:**
- `storybook_credit_limit` beállítása tier alapján
- Szebb email sablon HTML formátumban
- Gomb stílusú bejelentkezési link

**Email minta:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Üdvözlünk az Ink Story-ban!</h2>
  <p>Kedves {{name}}!</p>
  <p>Fiókod sikeresen létrehoztuk az alábbi adatokkal:</p>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Email:</strong> {{email}}</p>
    <p><strong>Jelszó:</strong> {{password}}</p>
    <p><strong>Előfizetés:</strong> {{tier}} ({{period}})</p>
  </div>
  
  <p style="text-align: center;">
    <a href="{{login_url}}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      Bejelentkezés
    </a>
  </p>
  
  <p><small>Kérjük, változtasd meg a jelszavad az első bejelentkezés után!</small></p>
</div>
```

### 2. `admin-send-credentials` Edge Function

**Paraméterek:**
```typescript
{
  user_id: string;       // Célfelhasználó ID
  generate_new_password?: boolean;  // Új jelszó generálása (default: true)
  custom_message?: string;  // Egyedi üzenet hozzáadása
}
```

**Működés:**
1. Admin ellenőrzés
2. Felhasználó lekérdezése (email, név, tier)
3. Ha `generate_new_password`: új jelszó generálása és beállítása
4. Email küldése Resend API-val
5. Admin activity log bejegyzés

### 3. Frontend Változások

**Új komponens:** `SendCredentialsModal.tsx`
```text
src/components/admin/SendCredentialsModal.tsx
```

**Funkciók:**
- Felhasználó adatainak megjelenítése
- Opció: új jelszó generálása vagy csak emlékeztető
- Megerősítés gomb
- Sikeres küldés visszajelzés

**AdminUsers.tsx módosítások:**
- Új state: `isSendCredentialsOpen`, `credentialsUser`
- Új dropdown menüpont
- Modal integráció

### 4. Admin Emlékeztető

**Logika a táblázatban:**
```tsx
{isAdminUser(user.id) && (
  <DropdownMenuItem onClick={() => handleSendAdminReminder(user)}>
    <Bell className="mr-2 h-4 w-4" />
    Admin emlékeztető küldése
  </DropdownMenuItem>
)}
```

**Email tartalom:**
```html
<h2>Emlékeztető - Admin Hozzáférés</h2>
<p>Az admin felület elérhető itt:</p>
<a href="https://ink-story-magic-86.lovable.app/admin">Admin Felület</a>
<p>Bejelentkezési email: {{email}}</p>
<p>Ha elfelejtetted a jelszavad, kérj új jelszót a bejelentkezési oldalon.</p>
```

---

## Érintett Fájlok

| Fájl | Művelet |
|------|---------|
| `supabase/functions/admin-create-user/index.ts` | Frissítés (storybook credits, email) |
| `supabase/functions/admin-send-credentials/index.ts` | Új |
| `src/components/admin/SendCredentialsModal.tsx` | Új |
| `src/pages/admin/AdminUsers.tsx` | Frissítés (új menüpontok, modal) |

---

## Biztonsági Megfontolások

1. **Admin ellenőrzés** - Minden edge function ellenőrzi az admin státuszt
2. **Jelszó generálás** - Crypto API használata biztonságos jelszó generáláshoz
3. **Activity log** - Minden művelet naplózva
4. **Email validáció** - Csak létező felhasználóknak küldhető

---

## Tesztelési Lépések

1. Új felhasználó létrehozása különböző csomagokkal
2. Email megérkezésének ellenőrzése
3. Belépési adatok küldése meglévő felhasználónak
4. Admin emlékeztető küldése
5. Jelszó működésének ellenőrzése
