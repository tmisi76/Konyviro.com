
# Email Branding Javítás: "Ink Story" → "KönyvÍró"

## Összefoglalás

A screenshot-ok és a kód átvizsgálása alapján az összes email-ben módosítani kell a branding-et:
- **Jelenlegi:** "Ink Story"
- **Helyes:** "KönyvÍró"

## Érintett Fájlok és Változások

### 1. `supabase/functions/stripe-webhook/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 165 | Üdvözlünk az Ink Story-ban! | Üdvözlünk a KönyvÍró-nál! |
| 172 | előfizettél az Ink Story-ra | előfizettél a KönyvÍró-ra |
| 206 | Az Ink Story csapata | A KönyvÍró csapata |
| 221 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |
| 223 | Üdvözlünk az Ink Story-ban! | Üdvözlünk a KönyvÍró-nál! |

### 2. `supabase/functions/admin-send-credentials/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 137 | Admin hozzáférés az Ink Story-hoz | Admin hozzáférés a KönyvÍró-hoz |
| 155 | az Ink Story admin hozzáférésedről | a KönyvÍró admin hozzáférésedről |
| 194 | Új belépési adatok - Ink Story | Új belépési adatok - KönyvÍró |
| 195 | Belépési emlékeztető - Ink Story | Belépési emlékeztető - KönyvÍró |
| 257 | Az Ink Story csapata | A KönyvÍró csapata |
| 272 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |

### 3. `supabase/functions/admin-reset-password/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 148 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |
| 150 | Új jelszavad az Ink Story-hoz | Új jelszavad a KönyvÍró-hoz |
| 158 | Az Ink Story csapata | A KönyvÍró csapata |

### 4. `supabase/functions/admin-create-user/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 173-174 | Üdvözlünk az Ink Story-ban | Üdvözlünk a KönyvÍró-nál |
| 186 | Üdvözlünk az Ink Story-ban! | Üdvözlünk a KönyvÍró-nál! |
| 239 | Az Ink Story csapata | A KönyvÍró csapata |
| 254 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |

### 5. `supabase/functions/send-welcome-email/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 44 | Üdvözlünk az Ink Story-ban! | Üdvözlünk a KönyvÍró-nál! |
| 51 | az Ink Story közösségében | a KönyvÍró közösségében |
| 81 | Az Ink Story csapata | A KönyvÍró csapata |
| 95 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |
| 97 | Üdvözlünk az Ink Story-ban! | Üdvözlünk a KönyvÍró-nál! |

### 6. `supabase/functions/send-password-reset/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 121 | Az Ink Story csapata | A KönyvÍró csapata |
| 135 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |
| 137 | Jelszó visszaállítás - Ink Story | Jelszó visszaállítás - KönyvÍró |

### 7. `supabase/functions/send-admin-email/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 74 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |

### 8. `supabase/functions/send-completion-email/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 44 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |
| 82 | Könyvíró AI által | KönyvÍró által |

### 9. `supabase/functions/send-credit-email/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 46 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |
| 101 | Könyvíró AI-t választottad | KönyvÍró-t választottad |

### 10. `supabase/functions/send-bulk-email/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 135 | from: "Ink Story <...>" | from: "KönyvÍró <...>" |

### 11. `supabase/functions/export-storybook/index.ts`
| Sor | Régi | Új |
|-----|------|-----|
| 268 | Készült az InkStory segítségével | Készült a KönyvÍró segítségével |
| 290 | Készült az InkStory segítségével | Készült a KönyvÍró segítségével |

### 12. `src/components/admin/SendEmailModal.tsx`
| Sor | Régi | Új |
|-----|------|-----|
| 108 | `<h1>Ink Story</h1>` | `<h1>KönyvÍró</h1>` |
| 116 | © Ink Story. Minden jog fenntartva. | © KönyvÍró. Minden jog fenntartva. |

## URL Változások

A konyviro.com domain miatt az email linkeket is módosítani kell:

| Régi URL | Új URL |
|----------|--------|
| `https://ink-story-magic-86.lovable.app/auth` | `https://konyviro.com/auth` |
| `https://ink-story-magic-86.lovable.app/dashboard` | `https://konyviro.com/dashboard` |
| `https://ink-story-magic-86.lovable.app/admin` | `https://konyviro.com/admin` |
| `https://ink-story-magic-86.lovable.app/project/` | `https://konyviro.com/project/` |

## Telepítendő Edge Functions

A változtatások után az alábbi function-ök újratelepítése szükséges:
- stripe-webhook
- admin-send-credentials
- admin-reset-password
- admin-create-user
- send-welcome-email
- send-password-reset
- send-admin-email
- send-completion-email
- send-credit-email
- send-bulk-email
- export-storybook

## Összesen: 12 fájl módosítása, ~50+ szöveg csere
