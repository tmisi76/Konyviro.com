
# Email Értesítések Komplett Javítása

## Jelenlegi Állapot Összefoglalása

A vizsgálat alapján az alábbi email küldési hiányosságok vannak:

| Eset | Jelenlegi Állapot | Probléma |
|------|-------------------|----------|
| 1. Stripe fizetés után fiók létrehozás + email | ❌ Webhook email nem megy | A `stripe-webhook` nem küld email-t a guest checkout-nál létrehozott usernek |
| 2. Admin "Jelszó reset email küldése" | ⚠️ Részleges | A `admin-reset-password` rossz domaint használ (`inkstory.hu` helyett `digitalisbirodalom.hu`) |
| 3. Admin "Email küldése" | ✅ Működik | A `send-admin-email` megfelelő |
| 4. Elfelejtett jelszó form | ❌ Hiányzik | Nincs "Elfelejtett jelszó?" link a login form-on |
| 5. Ingyenes regisztráció üdvözlő email | ❌ Hiányzik | A `RegisterForm` nem triggerel welcome email-t |

---

## 1. Stripe Webhook - Email Küldés Sikeres Fizetés Után

### Probléma
A `stripe-webhook` létrehozza a guest user-t de NEM küld email-t a belépési adatokkal.

### Megoldás
Módosítani a `stripe-webhook/index.ts` fájlt:
- A user létrehozása után automatikusan küld egy magyar nyelvű welcome + belépési adatok email-t
- Tartalmazza: email cím, jelszó link (recovery), csomag részletei

### Kód változtatás (`stripe-webhook/index.ts`, ~136. sor után):
```typescript
// Sikeres user létrehozás után, küldj welcome email-t
if (authData.user) {
  userId = authData.user.id;
  logStep("New user created", { userId, email: customer.email });
  
  // Generate password reset link for first login
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: customer.email,
    options: {
      redirectTo: "https://ink-story-magic-86.lovable.app/auth?mode=set-password",
    },
  });

  // Send welcome email with login details
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey && linkData?.properties?.action_link) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Ink Story <noreply@digitalisbirodalom.hu>",
        to: [customer.email],
        subject: "Üdvözlünk az Ink Story-ban! 🎉 Állítsd be a jelszavad",
        html: `<!-- Welcome email with password setup link -->`,
      }),
    });
    logStep("Welcome email sent");
  }
}
```

---

## 2. Admin Reset Password - Domain Javítás

### Probléma
A `admin-reset-password/index.ts` hibás domaint használ: `noreply@inkstory.hu` (nem létezik/nincs hitelesítve)

### Megoldás
Módosítani a 148-149. sort:
```typescript
// RÉGI:
from: "Ink Story <noreply@inkstory.hu>",

// ÚJ:
from: "Ink Story <noreply@digitalisbirodalom.hu>",
```

---

## 3. Admin Create User - Domain Javítás

### Probléma  
A `admin-create-user/index.ts` is hibás domaint használ a 254. sorban: `noreply@inkstory.hu`

### Megoldás
```typescript
// RÉGI:
from: "Ink Story <noreply@inkstory.hu>",

// ÚJ:
from: "Ink Story <noreply@digitalisbirodalom.hu>",
```

---

## 4. Elfelejtett Jelszó Funkció Hozzáadása

### Probléma
A `LoginForm.tsx` és `Auth.tsx` nem tartalmaz "Elfelejtett jelszó?" linket/funkciót

### Megoldás

#### 4a. AuthContext bővítése (`src/contexts/AuthContext.tsx`)
```typescript
// Új metódus hozzáadása:
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth?mode=reset`,
  });
  return { error: error as Error | null };
};
```

#### 4b. LoginForm bővítése (`src/components/auth/LoginForm.tsx`)
- "Elfelejtett jelszó?" link hozzáadása
- Modal vagy inline form a jelszó reset email kéréséhez
- Magyar nyelvű visszajelzés

### Supabase Auth Email Template
A Supabase beépített email template-ek angolul vannak. Ezeket le kell cserélni a Resend alapú megoldásra, vagy saját edge function-t használni.

**Új edge function: `send-password-reset/index.ts`**
- Fogadja az email címet
- Generálja a recovery linket via `auth.admin.generateLink`
- Küld magyar nyelvű emailt Resend-en keresztül

---

## 5. Ingyenes Regisztráció - Welcome Email

### Probléma
A `RegisterForm.tsx` sikeres regisztráció után NEM küld welcome email-t

### Megoldás
Új edge function létrehozása: `send-welcome-email/index.ts`
- Triggerelhető a frontend-ről sikeres regisztráció után
- VAGY: Supabase database trigger a profiles táblán

### Változtatás a `RegisterForm.tsx`-ben:
```typescript
// Sikeres regisztráció után:
if (!error) {
  await supabase.functions.invoke('send-welcome-email', {
    body: { email, full_name: fullName }
  });
  navigate("/dashboard");
}
```

---

## Érintett Fájlok Összefoglaló

| Fájl | Változtatás |
|------|-------------|
| `supabase/functions/stripe-webhook/index.ts` | + Welcome email küldés guest checkout-nál |
| `supabase/functions/admin-reset-password/index.ts` | Domain fix: `digitalisbirodalom.hu` |
| `supabase/functions/admin-create-user/index.ts` | Domain fix: `digitalisbirodalom.hu` |
| `supabase/functions/send-password-reset/index.ts` | **ÚJ** - Magyar jelszó reset email |
| `supabase/functions/send-welcome-email/index.ts` | **ÚJ** - Magyar welcome email |
| `src/contexts/AuthContext.tsx` | + `resetPassword` metódus |
| `src/components/auth/LoginForm.tsx` | + "Elfelejtett jelszó?" link és form |
| `src/components/auth/RegisterForm.tsx` | + Welcome email trigger |

---

## Tesztelési Checklist

1. ☐ Stripe fizetés után automatikusan jön email a belépési adatokkal
2. ☐ Admin "Új jelszó generálása és küldése" működik
3. ☐ Admin "Jelszó reset link küldése" működik
4. ☐ "Elfelejtett jelszó?" link a login form-on működik
5. ☐ Ingyenes regisztráció után welcome email érkezik
6. ☐ Minden email magyar nyelvű
7. ☐ Minden email a `digitalisbirodalom.hu` domainről jön

---

## Email HTML Sablonok

Minden új email sablon:
- Magyar nyelvű
- Egységes Ink Story branding (lila gradient: #7c3aed → #a855f7)
- Responsive design
- Tartalmazza a bejelentkezés linket
- Küldő: `Ink Story <noreply@digitalisbirodalom.hu>`
