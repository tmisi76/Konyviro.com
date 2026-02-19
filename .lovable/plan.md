

# Hibalista valasz funkcio + Elfelejtett jelszo lathatosag

## 1. Hibalista -- valasz/komment funkcio (AdminIssues.tsx)

A reszletes nezet Dialog-ba bekerul:

- **Korabbi uzenetek listaja**: a `support_ticket_messages` tablabol lekerdezve a `ticket_id` alapjan, idoben rendezve. Minden uzenet megjelenik kuldo-vel es idobelyeggel, az admin valaszok vizualisan megkulonboztetve (pl. mas hatterszin).
- **Valasz iras mezo**: egy `Textarea` + "Valasz kuldese" gomb. A gomb `support_ticket_messages`-be szur be (`is_admin_reply: true`, `sender_id: auth.uid()`).
- A meglevo `useSendTicketReply` hook-ot NEMNHASZNALJUK, mert az a support ticketekhez van -- helyette kozvetlenul a `supabase.from("support_ticket_messages").insert(...)` hivas megy, es a statusz automatikusan `in_progress`-re all, ha `open` volt.

### Dialog bovitett felepites

```text
+------------------------------------------+
|  [Hiba cime]                         [X] |
|  [Prioritas] [Kategoria] [Statusz]       |
|  Letrehozva/Frissitve datumok            |
|                                          |
|  Leiras:                                 |
|  [Teljes leiras szoveg]                  |
|                                          |
|  --- Uzenetek ---                        |
|  [Felhasznalo uzenet] [datum]            |
|  [Admin valasz]       [datum]            |
|                                          |
|  [Valasz szoveg iras.................]   |
|  [Valasz kuldese]                        |
|                                          |
|  Statusz: [Select]                       |
|                          [Bezaras]       |
+------------------------------------------+
```

## 2. Bejelentkezesi felulet -- Elfelejtett jelszo lathatobb (LoginForm.tsx)

Az "Elfelejtett jelszo?" link mar letezik (154-159. sor), de apro es nem feltu. A valtozas:
- Nagyobb megjelenites: a jelszo mezo ala kerul egy kulon sor, nagyobb betumerettel
- A szoveg valtozik: "Elfelejtett jelszo? Kattints ide az uj jelszo kereshez"

## Technikai reszletek

| Fajl | Valtozas |
|------|---------|
| `src/pages/admin/AdminIssues.tsx` | Uzenetek lekerdezes (useQuery), valasz kuldese (useMutation), ScrollArea az uzenetekhez, Textarea + gomb |
| `src/components/auth/LoginForm.tsx` | "Elfelejtett jelszo?" link stilusanak bovitese, lathatobba tetele |

### Adatbazis

Nem kell migracio -- a `support_ticket_messages` tabla mar letezik a megfelelo oszlopokkal (`ticket_id`, `sender_id`, `is_admin_reply`, `message`, `created_at`).

