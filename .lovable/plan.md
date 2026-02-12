

# Jelszóváltoztatás javítás -- beágyazott form hiba

## Gyökérok

A `ProfileSettings.tsx` egy nagy `<form>` elemen belül rendereli a `ChangePasswordSection` komponenst (316. sor). A `ChangePasswordSection` saját `<form>` elemet tartalmaz. Ez **beagyazott form-okat** eredmenyez, ami ervenytelen HTML -- a bongeszo nem tudja megbizhatoan kezelni, a submit esemenyek osszekeverednek vagy egyaltalan nem futnak le.

## Megoldas

Ket modositast kell vegrehajtani:

### 1. ProfileSettings.tsx -- ChangePasswordSection kiemelese a form-bol

A `<ChangePasswordSection />` komponenst a zaro `</form>` tag UTA kell athelyezni, igy a ket form fuggetlen lesz egymasbol.

### 2. ChangePasswordSection.tsx -- mar rendben van

A jelenlegi kod (delay + getSession + updateUser + AlertDialog) logikailag helyes. A problema kizarolag a beagyazott form volt.

## Technikai reszletek

| Fajl | Valtozas |
|------|---------|
| `src/components/settings/ProfileSettings.tsx` | `ChangePasswordSection` athelyezese a form-on kivulre, a komponenst Fragment-be (`<>...</>`) csomagolva |

### Jelenlegi struktura (hibas)

```text
<form onSubmit={handleSubmit}>        <-- profil form
  ... profil mezok ...
  <Button type="submit">Mentes</Button>
  <ChangePasswordSection />           <-- BENNE van a form-ban!
    <form onSubmit={handlePasswordSubmit}>  <-- BEAGYAZOTT FORM (HIBAS)
    </form>
  </ChangePasswordSection>
</form>
```

### Javitott struktura

```text
<>
  <form onSubmit={handleSubmit}>      <-- profil form
    ... profil mezok ...
    <Button type="submit">Mentes</Button>
  </form>
  <ChangePasswordSection />          <-- KULSO, fuggetlen
    <form onSubmit={handlePasswordSubmit}>  <-- SAJAT FORM (HELYES)
    </form>
  </ChangePasswordSection>
</>
```

Ez a modositas megoldja mind a ket problemat:
- A jelszomodositas tenylegesen vegrehajtodasik (a form submit rendesen mukodik)
- Az AlertDialog popup megjelenik sikeres modositas eseten
