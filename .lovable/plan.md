

# Terv: Referral Link Frissítése - konyviro.com Landing Page

## Összefoglaló

A referral linket módosítani kell, hogy:
1. **Fix domain**: `https://konyviro.com` (nem a jelenlegi `window.location.origin`)
2. **Landing page**: A főoldalra vigyen (`/`), nem az `/auth` oldalra

---

## Szükséges Változtatások

### 1. useReferral.ts - Link generálás módosítása

**Fájl:** `src/hooks/useReferral.ts`

**Jelenlegi kód (64-70. sor):**
```typescript
const getReferralLink = () => {
  if (!referralStats?.referralCode) return null;
  
  // Use the production URL
  const baseUrl = window.location.origin;
  return `${baseUrl}/auth?ref=${referralStats.referralCode}`;
};
```

**Új kód:**
```typescript
const getReferralLink = () => {
  if (!referralStats?.referralCode) return null;
  
  // Always use the production domain and landing page
  return `https://konyviro.com/?ref=${referralStats.referralCode}`;
};
```

---

### 2. Index.tsx - Referral kód kezelése a főoldalon

**Fájl:** `src/pages/Index.tsx`

Hozzá kell adni a referral kód localStorage-ba mentését, hogy amikor a user a landing page-re érkezik `?ref=` paraméterrel, az eltárolódjon a későbbi regisztrációhoz.

**Új import és useEffect:**
```typescript
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { REFERRAL_STORAGE_KEY } from "@/constants/referral";

const Index = () => {
  const [searchParams] = useSearchParams();

  // Store referral code if present in URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode.toUpperCase());
      console.log("Referral code stored from landing:", refCode.toUpperCase());
    }
  }, [searchParams]);

  return (
    // ... existing JSX
  );
};
```

---

## Érintett Fájlok

| Fájl | Változtatás |
|------|-------------|
| `src/hooks/useReferral.ts` | Fix domain és `/` útvonal használata |
| `src/pages/Index.tsx` | Referral kód tárolása localStorage-ban |

---

## Folyamat Áttekintése

```text
1. User megosztja: https://konyviro.com/?ref=ABC123
                            ↓
2. Meghívott kattint, Landing Page-re érkezik
                            ↓
3. Index.tsx elmenti a kódot localStorage-ba
                            ↓
4. User böngészi az oldalt, majd regisztrál
                            ↓
5. RegisterForm kiolvas a localStorage-ból és feldolgozza
                            ↓
6. Mindkét fél megkapja a 10.000 szó kreditet
```

---

## Konstans Bővítése (opcionális)

Ha a jövőben módosítani kell a domaint, érdemes központilag tárolni:

**Fájl:** `src/constants/referral.ts`

```typescript
export const REFERRAL_BONUS_WORDS = 10000;
export const REFERRAL_CODE_LENGTH = 6;
export const REFERRAL_STORAGE_KEY = 'referral_code';
export const REFERRAL_BASE_URL = 'https://konyviro.com';
```

Ez opcionális, de megkönnyíti a jövőbeli karbantartást.

