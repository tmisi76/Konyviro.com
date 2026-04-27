
# Admin értesítések: új előfizetés + lemondás

## Cél
Minden új előfizetésnél **és** minden lemondásnál (akár azonnali, akár időszak végi) admin értesítő email menjen a **hello@freedombiznisz.hu** címre.

## Jelenlegi állapot
- A `stripe-webhook` Edge Function már most küld admin emailt új előfizetésnél (`checkout.session.completed`), de **a `tmisi76@gmail.com` címre**.
- **Lemondásnál nincs értesítés** — sem a `customer.subscription.updated` (cancel_at_period_end=true), sem a `customer.subscription.deleted` ágban.
- A `cancel-subscription` Edge Function (a felhasználói lemondás belépési pontja) szintén nem küld admin emailt.
- A küldés Resend API-n keresztül történik, közvetlen `fetch` hívással (lásd memória: `edge-functions/email-sending-standard`).
- Feladó: `KönyvÍró <noreply@digitalisbirodalom.hu>` (már bevált).

## Módosítások

### 1) `supabase/functions/stripe-webhook/index.ts`

**a) Új előfizetés email címzettjének cseréje**
- A 445. sorban a `to: ["tmisi76@gmail.com"]` helyett `to: ["hello@freedombiznisz.hu"]`.

**b) Lemondás-értesítő hozzáadása — `customer.subscription.updated` ágban**
- A `subscription.cancel_at_period_end === true` és **az új update** flag (azaz az előző állapotban még nem volt cancel) esetén küldjünk emailt.
- Detektálás: `event.data.previous_attributes?.cancel_at_period_end === false && subscription.cancel_at_period_end === true` → "Időszak végi lemondás" típus.
- Email tartalma: felhasználó neve, email, csomag (tier), időszak (havi/éves), lemondás dátuma, **érvényesség vége** (`current_period_end`), típus: "Időszak végi lemondás".

**c) Lemondás-értesítő hozzáadása — `customer.subscription.deleted` ágban**
- Minden végleges törlésnél (azonnali cancel, vagy a periódus lejárta után) küldjünk emailt.
- Email tartalma: felhasználó neve, email, korábbi csomag, dátum, típus: "Előfizetés véglegesen megszűnt".

**d) Közös segédfüggvény (DRY)**
- Egy `sendAdminNotification(type, data)` helper a fájl tetejére, ami a Resend hívást és a HTML sablon-választást összefogja. Kerüli a kódduplikációt a 3 értesítési típusnál (új / időszak végi lemondás / végleges lemondás).

**e) HTML sablonok**
- 3 sablon: új előfizetés (zöld 🎉), időszak végi lemondás (sárga ⚠️ "Lemondás bejelentve"), végleges lemondás (piros ❌ "Előfizetés megszűnt"). Konzisztens stílus a meglévő admin email design-nal.

### Pontos címzett
- Minden 3 típusnál: `to: ["hello@freedombiznisz.hu"]`.

## Mit NEM csinálunk
- A `cancel-subscription` Edge Function-t nem módosítjuk: az csak Stripe-on hív `subscriptions.update({cancel_at_period_end: true})`-t, ami **automatikusan kiváltja** a `customer.subscription.updated` webhook eseményt — így a webhook-ban elég egyszer kezelni.
- Nem érintjük a felhasználó felé menő emaileket (welcome, completion stb.).
- Nem váltunk át Lovable Email infrastruktúrára (a Resend + `digitalisbirodalom.hu` feladó már stabilan működik a projekten).

## Érintett fájl
- `supabase/functions/stripe-webhook/index.ts` (1 fájl, ~3 új email-blokk + 1 helper függvény)

## Megerősítendő
- A **régi** `tmisi76@gmail.com` címre is menjen a tájékoztatás párhuzamosan, vagy **csak** a `hello@freedombiznisz.hu` legyen a címzett? (Alapértelmezetten csak az új címet állítom be, a régit lecserélem.)
