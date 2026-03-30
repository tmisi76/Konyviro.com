

# Ebook Reader stílusú nyilvános könyvolvasó

## Mit csinálunk
A `PublicBookReader` oldalt átalakítjuk egy valódi ebook reader-szerű élménnyé:
1. **Betűtípus választó** (serif/sans-serif/monospace)
2. **Betűméret csúszka** (14px-28px)
3. **Sortávolság választó** (szűk/normál/tágas)
4. **Háttérszín váltó** (fehér/szépia/sötét)
5. **Szebb szövegtördelés** — bekezdések behúzással, sorkizártan, könyvszerűen

A beállítások egy kis toolbar-ban jelennek meg a fejlécben (egy "Aa" gombra kattintva popover-ben).

## Technikai változások

### 1. `src/components/reader/ReaderSettings.tsx` (új fájl)
- Popover komponens egy `Aa` gombbal
- Betűtípus: Georgia (serif), Inter (sans-serif), JetBrains Mono (mono)
- Betűméret: Slider 14–28px
- Sortávolság: 1.4 / 1.6 / 2.0
- Háttér téma: Fehér / Szépia / Sötét
- State `localStorage`-ben perzisztálva (`reader_settings` key)

### 2. `src/pages/PublicBookReader.tsx` (módosítás)
- Import és használat: `ReaderSettings` a header-be
- A reader beállításokat `useState`-tel kezelni, `localStorage`-ból inicializálni
- Az `article` elem `style` attribútumát dinamikusan beállítani:
  - `fontFamily`, `fontSize`, `lineHeight` a beállítások szerint
  - Háttérszín és szövegszín a téma szerint (szépia: `#f4ecd8` háttér, sötét: `#1a1a2e` háttér)
- A szövegtördelés CSS-t finomítani: `text-indent` a bekezdésekre, `text-align: justify`, `hyphens: auto`

