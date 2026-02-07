
# Terv: 1000 Mesekönyv Kredit Hozzáadása

## Felhasználó adatai

| Mező | Érték |
|------|-------|
| Email | tmisi76@gmail.com |
| Név | Tóth Mihály (Misi) |
| User ID | 32f65d2a-ecae-473d-a069-3d4f6480fac4 |
| Jelenlegi kredit limit | 0 |
| Felhasznált kreditek | 0 |

## Végrehajtandó változtatás

A `profiles` táblában frissíteni kell:

```sql
UPDATE profiles 
SET storybook_credit_limit = 1000,
    storybook_credits_used = 0,
    updated_at = now()
WHERE user_id = '32f65d2a-ecae-473d-a069-3d4f6480fac4';
```

## Eredmény

A felhasználó ezután:
- 1000 mesekönyv kreditet fog látni
- 0 felhasznált kredit
- 1000 elérhető kredit a mesekönyv készítéshez
