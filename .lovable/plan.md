

# Jelszó Visszaállítás - Race Condition Javítás

## Probléma

Amikor a felhasználó rákattint a jelszó-visszaállító linkre, automatikusan be lett léptetve ahelyett, hogy az új jelszó beállító űrlapot látta volna.

### Gyökérok: Versenyhelyzet (Race Condition)

Az Auth.tsx-ben két külön `useEffect` fut:
1. **onAuthStateChange figyelő** - ami a `PASSWORD_RECOVERY` eventre vár
2. **Redirect logika** - ami átirányít, ha van `user` és nincs `showPasswordReset`

A probléma: Az AuthContext hamarabb állítja be a `user`-t, mint ahogy a `PASSWORD_RECOVERY` event megérkezik az Auth.tsx-be, így a redirect elindul mielőtt a form megjelenne.

```text
Időrend:
1. Link kattintás
2. Supabase SDK feldolgozza a tokent
3. AuthContext → user = session.user ✅
4. Auth.tsx redirect useEffect → user létezik, showPasswordReset=false → REDIRECT ❌
5. Auth.tsx PASSWORD_RECOVERY event → túl késő!
```

## Megoldás

### 1. stratégia: A `mode=reset` paraméter azonnali ellenőrzése

Ha a URL-ben van `mode=reset`, **azonnal** állítsuk be a `showPasswordReset`-et, mielőtt a redirect logika lefut.

### Módosítandó fájl: `src/pages/Auth.tsx`

**Jelenlegi hibás logika:**
```javascript
const [showPasswordReset, setShowPasswordReset] = useState(false);
const mode = searchParams.get("mode");

useEffect(() => {
  // onAuthStateChange figyelés...
  if (mode === "reset") {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setShowPasswordReset(true);  // ← Túl késő, async
      }
    });
  }
}, [mode]);

useEffect(() => {
  if (!loading && user && !showPasswordReset) {
    navigate("/dashboard");  // ← Ez hamarabb fut
  }
}, [user, loading, navigate, showPasswordReset]);
```

**Javított logika:**
```javascript
// A mode=reset azonnali felismerése - SZINKRON, nem async!
const mode = searchParams.get("mode");
const [showPasswordReset, setShowPasswordReset] = useState(mode === "reset");

useEffect(() => {
  // PASSWORD_RECOVERY esemény figyelése (plusz biztosíték)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      setShowPasswordReset(true);
    }
  });

  return () => subscription.unsubscribe();
}, []);

useEffect(() => {
  // Csak akkor navigálj, ha:
  // 1. Nincs loading
  // 2. Van user
  // 3. NEM vagyunk reset mode-ban (se URL param, se event alapján)
  if (!loading && user && !showPasswordReset && mode !== "reset") {
    navigate("/dashboard");
  }
}, [user, loading, navigate, showPasswordReset, mode]);
```

### Kulcs változtatások

| Változás | Előtte | Utána |
|----------|--------|-------|
| `showPasswordReset` inicializálás | `useState(false)` | `useState(mode === "reset")` |
| Redirect feltétel | `!showPasswordReset` | `!showPasswordReset && mode !== "reset"` |
| `getSession()` hívás | Szükséges | Eltávolítva (nem kell, mert sync init) |

### Miért működik ez?

1. A `useState(mode === "reset")` **szinkron** - azonnal `true` lesz, ha van `mode=reset`
2. A redirect `useEffect` már **eleve tudja**, hogy reset módban vagyunk
3. A `PASSWORD_RECOVERY` event továbbra is működik backup-ként
4. Nincs versenyhelyzet, mert nincs async művelet a state inicializálásban

## Teljes javított Auth.tsx kód

```typescript
export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const mode = searchParams.get("mode");
  
  // SZINKRON inicializálás - nincs race condition!
  const [showPasswordReset, setShowPasswordReset] = useState(mode === "reset");

  useEffect(() => {
    // PASSWORD_RECOVERY event figyelése (backup)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordReset(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Csak akkor redirect, ha BIZTOSAN nem reset mode
    if (!loading && user && !showPasswordReset && mode !== "reset") {
      navigate("/dashboard");
    }
  }, [user, loading, navigate, showPasswordReset, mode]);

  // ... többi kód változatlan
}
```

## Érintett fájlok

| Fájl | Változtatás |
|------|-------------|
| `src/pages/Auth.tsx` | Race condition javítása |

## Tesztelési terv

1. Kérj jelszó-visszaállító emailt
2. Kattints a linkre az emailben
3. **Elvárt:** Új jelszó beállító űrlap jelenik meg (nem redirect!)
4. Írd be az új jelszót
5. **Elvárt:** Sikeres mentés, majd redirect a dashboard-ra

