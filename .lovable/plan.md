
# Email Domain Váltás: digitalisbirodalom.hu

## Összefoglaló

Az összes edge function-ben le kell cserélni a `resend.dev` teszt domaint a hitelesített `digitalisbirodalom.hu` domainre.

## Érintett Fájlok

| Fájl | Jelenlegi | Új |
|------|-----------|-----|
| `admin-send-credentials/index.ts` | `noreply@resend.dev` | `noreply@digitalisbirodalom.hu` |
| `send-credit-email/index.ts` | `onboarding@resend.dev` | `noreply@digitalisbirodalom.hu` |
| `send-completion-email/index.ts` | `onboarding@resend.dev` | `noreply@digitalisbirodalom.hu` |
| `send-bulk-email/index.ts` | `noreply@resend.dev` | `noreply@digitalisbirodalom.hu` |
| `send-admin-email/index.ts` | `noreply@resend.dev` | `noreply@digitalisbirodalom.hu` |

## Változtatások

### 1. admin-send-credentials/index.ts (272. sor)
```typescript
// Régi
from: "Ink Story <noreply@resend.dev>",

// Új
from: "Ink Story <noreply@digitalisbirodalom.hu>",
```

### 2. send-credit-email/index.ts (46. sor)
```typescript
// Régi
from: "Könyvíró AI <onboarding@resend.dev>",

// Új
from: "Ink Story <noreply@digitalisbirodalom.hu>",
```

### 3. send-completion-email/index.ts (44. sor)
```typescript
// Régi
from: "Könyvíró AI <onboarding@resend.dev>",

// Új
from: "Ink Story <noreply@digitalisbirodalom.hu>",
```

### 4. send-bulk-email/index.ts (135. sor)
```typescript
// Régi
from: "KönyvÍró AI <noreply@resend.dev>",

// Új
from: "Ink Story <noreply@digitalisbirodalom.hu>",
```

### 5. send-admin-email/index.ts (74. sor)
```typescript
// Régi
from: "KönyvÍró AI <noreply@resend.dev>",

// Új
from: "Ink Story <noreply@digitalisbirodalom.hu>",
```

## Fontos Előfeltétel

A `digitalisbirodalom.hu` domainnek **hitelesítve kell lennie** a Resend Dashboard-on:
- https://resend.com/domains

Ha még nincs hitelesítve, a Resend elutasítja az emaileket ugyanazzal a 403-as hibával.

## Végrehajtási Lépések

1. Módosítani mind az 5 edge function fájlt
2. Deployolni az összes érintett function-t
3. Tesztelni az email küldést

## Branding Egységesítés

Az email küldő nevet is egységesítem "Ink Story"-ra minden function-ben a konzisztencia érdekében.
