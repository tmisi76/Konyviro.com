## A felfedezett problémák

### 1. KönyvCoach → Automata írás: **eltört a flow** (ezért látsz hibaüzenetet)

A `useCoachToAutoWrite` hook hibásan van bekötve:

- **Paraméter-eltérés**: A `generate-chapter-outline` edge function ezeket a mezőket várja: `{ genre, length, concept, targetWordCount }`, de a hívás ezeket küldi: `{ projectId, storyIdea, tone, targetAudience, suggestedChapters }`. A kötelező `concept` mező hiányzik → vagy üres outline-t generál, vagy hibára fut.
- **A motor sosem indul el**: A flow csak `writing_status: 'in_progress'`-re állítja a projektet, de **soha nem hívja meg a `start-book-writing` edge function-t**, amely létrehozza a `writing_jobs` bejegyzéseket. A pg_cron `process-writing-job` üres queue-t talál, ezért semmi nem történik. A dashboardon ezért látod „elindul, de nem halad" állapotot.

Bizonyíték az adatbázisból: A te legutóbbi coach-projekted (Livi Boost, március 7.) `wizard_step: 7`, `writing_status: in_progress` — de **0 fejezet és 0 writing_job** tartozik hozzá.

### 2. Ticketek: **az admin felület nem működik** (ezért nem válaszol senki)

Az `AdminTicketDetail.tsx` oldal jelenleg csak egy üres placeholder, amely mindössze ennyit ír ki: „Ticket adatok betöltése..." Sosem tölti be a tickethez tartozó beszélgetést, és **nincs válaszküldő űrlap**. Az adminok technikailag nem tudnak válaszolni.

A háttérben minden megvan és működik:
- `useTicketMessages` hook — beszélgetést olvas
- `useSendTicketReply` hook — választ ment és emailt küld a `send-ticket-reply-email` function-ön át
- `useUpdateTicketStatus`, `useUpdateTicketPriority` — státusz/prioritás módosítás

Csak az UI nincs összerakva.

Bizonyíték: 4 sürgős/magas prioritású ticketed van `in_progress` státuszban (köztük 3 hetek óta nyitva), egyetlen admin válasz nélkül.

---

## A javítás terve

### A) Coach → Automata írás javítása

`src/hooks/useCoachToAutoWrite.ts` átírása:

1. **Paraméterek megfelelő átadása** a `generate-chapter-outline`-nak:
   - `concept`: a `storyIdea`-ból + `s.suggestedOutline`-ból építve egy bővebb leírás
   - `length`: a `targetWordCount` alapján (`short`/`medium`/`long`)
   - `genre`, `targetWordCount`: ahogy most
2. **A motor tényleges elindítása**: a chapters mentése után meghívja a `start-book-writing` edge function-t `action: 'start'` paraméterrel. Ez:
   - létrehozza a `writing_jobs` bejegyzéseket minden fejezethez (`generate_outline` job, mert még nincs `scene_outline`)
   - átállítja a project-et `writing_status: 'generating_outlines'`-ra
   - a `process-writing-job` cron job innen átveszi és háttérben dolgozik
3. **Jobb hibakezelés**: ha valami fail-el a flow közben, a részleges projekt törlődik vagy `writing_status: 'idle'` lesz, hogy ne ragadjon stuck állapotban.

### B) Admin Ticket Detail oldal felépítése

`src/pages/admin/AdminTicketDetail.tsx` teljes újraírása. Az új oldal:

- **Ticket fejléc kártya**: tárgy, státusz badge, prioritás dropdown, létrehozás dátuma, kérelmező email
- **Beszélgetés panel**: az összes üzenet időrendben (felhasználó vs. admin chat-buborékok), `useTicketMessages`-ből
- **Válasz űrlap**: nagy textarea + „Válasz küldése" gomb, amely a `useSendTicketReply` hookot használja (ez automatikusan emailt is küld a felhasználónak a `send-ticket-reply-email` edge function-ön át)
- **Státusz vezérlés**: dropdown (open / in_progress / waiting_for_customer / resolved / closed), `useUpdateTicketStatus`-ból
- **Prioritás vezérlés**: dropdown (low / medium / high / urgent)
- **Vissza gomb**: a már meglévő `/admin/support` listához

### C) Bonusz: válasz a 4 nyitott ticketedre

Amint az admin felület működik, közvetlenül a működő admin oldalról fogok rövid magyar nyelvű választ küldeni (emailben is megérkezik) a 4 nyitott ticketedre, megerősítve hogy a panaszaid (Magyar nevek, Coach hiba, Karakternevek) javítva lettek vagy javítás alatt vannak.

---

## Érintett fájlok

- `src/hooks/useCoachToAutoWrite.ts` (paraméter-fix + start-book-writing meghívása)
- `src/pages/admin/AdminTicketDetail.tsx` (teljes újraírás)
- (opcionálisan) admin tickets listáról a row → detail oldal link ellenőrzése

## Tesztelés

1. **Coach end-to-end**: Új coach beszélgetés → összefoglaló elkészülte után „Indítás" gomb → projekt létrejön + chapters létrejönnek + writing_jobs bekerülnek → dashboard mutatja a haladást.
2. **Admin ticket válasz**: `/admin/support` → ticket sorra kattintás → detail oldal megnyílik → válasz beírása → küldés → email megy a felhasználónak + üzenet megjelenik a thread-ben.
