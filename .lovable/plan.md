
# Admin Felhasználók Oldal Befejezése

## Jelenlegi Problémák

### 1. Edge Function Telepítési Hiba
Az `admin-get-users` edge function nincs regisztrálva a `config.toml`-ben, ezért 404-et ad vissza.

### 2. Hook Duplikált Hívás
A `useAdminUsers.ts` hook kétszer hívja a `supabase.functions.invoke`-ot, ami felesleges és hibás.

### 3. Hiányzó Funkciók
Az alábbi műveletek nincsenek implementálva:
- Felhasználó törlése
- Felhasználó tiltása/feloldása
- CSV Export
- Bulk műveletek (tömeges email, tömeges export, tömeges törlés)

### 4. Email Küldés Hiba
A `SendEmailModal` plain text body-t küld az edge function-nak, de az HTML formátumot vár.

---

## Javítási Terv

### 1. config.toml Frissítése
Hozzáadjuk az `admin-get-users` function-t:
```toml
[functions.admin-get-users]
verify_jwt = false

[functions.admin-send-credentials]
verify_jwt = false
```

### 2. useAdminUsers Hook Javítása
Eltávolítjuk a duplikált function invoke hívást:
```typescript
// ELŐTTE (hibás):
const { data, error } = await supabase.functions.invoke('admin-get-users', {...});
const response = await supabase.functions.invoke(`admin-get-users?${params.toString()}`);

// UTÁNA (javított):
const params = new URLSearchParams({ search, plan, page, limit });
const response = await supabase.functions.invoke(`admin-get-users?${params.toString()}`);
```

### 3. Felhasználó Törlése - Új Edge Function
Új edge function: `admin-delete-user/index.ts`
- Admin jogosultság ellenőrzés
- Auth user törlése
- Profile és kapcsolódó adatok automatikus törlése (CASCADE)
- Activity log bejegyzés

### 4. Felhasználó Tiltása/Feloldása
Új edge function: `admin-ban-user/index.ts`
- User tiltása: subscription_status = 'banned', auth.users.banned_until beállítás
- Tiltás feloldása: subscription_status = 'active', auth.users.banned_until törlése
- Activity log bejegyzés

### 5. CSV Export Funkció
Client-side implementáció:
- Összes látható felhasználó exportálása CSV-be
- Mezők: Email, Név, Csomag, Projektek, Regisztráció, Státusz
- `file-saver` csomag használata

### 6. Bulk Műveletek
- Tömeges email küldés → BulkEmailModal megnyitása a kiválasztott email címekkel
- Tömeges export → Kiválasztott userek exportálása
- Tömeges törlés → Confirmation modal, majd törlés loop

### 7. SendEmailModal Javítása
HTML email küldés plain text helyett:
```typescript
const { error } = await supabase.functions.invoke('send-admin-email', {
  body: {
    to: user.email,
    subject: data.subject,
    html: `<div style="...">${data.body.replace(/\n/g, '<br>')}</div>`,
    text: data.body,
  }
});
```

---

## Érintett Fájlok

| Fájl | Változás |
|------|----------|
| `supabase/config.toml` | + admin-get-users és admin-send-credentials |
| `src/hooks/admin/useAdminUsers.ts` | Duplikált invoke eltávolítása |
| `supabase/functions/admin-delete-user/index.ts` | **ÚJ** - User törlés |
| `supabase/functions/admin-ban-user/index.ts` | **ÚJ** - Tiltás/feloldás |
| `src/pages/admin/AdminUsers.tsx` | Törlés, tiltás, export, bulk műveletek implementálása |
| `src/components/admin/SendEmailModal.tsx` | HTML email küldés javítása |

---

## Új Edge Function: admin-delete-user

```typescript
// Főbb lépések:
1. Admin jogosultság ellenőrzés
2. Target user profile lekérése (email log-hoz)
3. supabaseAdmin.auth.admin.deleteUser(user_id) - ez törli az auth user-t
4. A profile automatikusan törlődik (ON DELETE CASCADE)
5. admin_activity_logs bejegyzés
```

## Új Edge Function: admin-ban-user

```typescript
// Tiltás:
- profiles: subscription_status = 'banned'
- auth.users: banned_until = far future date

// Feloldás:
- profiles: subscription_status = 'active'  
- auth.users: banned_until = null
```

---

## Frontend Változások (AdminUsers.tsx)

### handleDeleteUser
```typescript
const handleDeleteUser = async () => {
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { user_id: selectedUser.user_id }
  });
  if (!error) {
    toast.success("Felhasználó törölve");
    refetch();
  }
};
```

### handleBanUser / handleUnbanUser
```typescript
const handleBanUser = async (userId: string, ban: boolean) => {
  const { error } = await supabase.functions.invoke("admin-ban-user", {
    body: { user_id: userId, action: ban ? "ban" : "unban" }
  });
  if (!error) {
    toast.success(ban ? "Felhasználó tiltva" : "Tiltás feloldva");
    refetch();
  }
};
```

### handleExportUsers
```typescript
const handleExportUsers = () => {
  const csvContent = users?.data?.map(u => 
    `"${u.email}","${u.full_name || ''}","${u.subscription_tier}",${u.projects_count},"${u.created_at}"`
  ).join('\n');
  
  const blob = new Blob([`Email,Név,Csomag,Projektek,Regisztráció\n${csvContent}`], { type: 'text/csv' });
  saveAs(blob, `felhasznalok_${format(new Date(), 'yyyy-MM-dd')}.csv`);
};
```

---

## Tesztelési Checklist

1. ☐ Admin felhasználók oldal betölt valós adatokkal
2. ☐ Keresés működik (név, email)
3. ☐ Szűrés működik (csomag, státusz)
4. ☐ Lapozás működik
5. ☐ Felhasználó szerkesztése működik (profil, előfizetés)
6. ☐ Belépési adatok küldése működik
7. ☐ Email küldése működik
8. ☐ Felhasználó törlése működik
9. ☐ Tiltás/feloldás működik
10. ☐ CSV export működik
11. ☐ Bulk műveletek működnek

---

## Telepítendő Edge Functions

A változtatások után az alábbi edge function-ök telepítése szükséges:
- `admin-get-users` (már létezik, csak deploy kell)
- `admin-delete-user` (új)
- `admin-ban-user` (új)
