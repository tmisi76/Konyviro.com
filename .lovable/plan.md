
# Email értesítés hozzáadása a könyvírás befejezéséhez

## Jelenlegi állapot

- A `send-completion-email` edge function már létezik és működik
- A régi `book-writer-process` már hívja, de az új `process-writing-job` nem
- Az `updateProjectProgress` function detektálja, amikor minden job kész (`isCompleted = true`)

## Szükséges változtatások

### 1. `supabase/functions/process-writing-job/index.ts`

Bővítsük az `updateProjectProgress` function-t, hogy befejezéskor hívja a `send-completion-email`-t:

```text
Módosítások az updateProjectProgress function-ben (326-366. sorok):
```

```typescript
// Projekt progress frissítése
async function updateProjectProgress(supabase: any, projectId: string) {
  // ... meglévő count lekérések ...
  
  // Projekt frissítése
  const isCompleted = pendingCount === 0;
  
  // Ha most fejeződött be, küldjünk email értesítést
  if (isCompleted) {
    await sendCompletionEmail(supabase, projectId);
  }
  
  // ... projekt update ...
}
```

**Új helper function hozzáadása a fájl végére:**

```typescript
// Email küldése a könyv befejezésekor
async function sendCompletionEmail(supabase: any, projectId: string) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Projekt és user adatok lekérése
    const { data: project } = await supabase
      .from("projects")
      .select("title, user_id")
      .eq("id", projectId)
      .single();
    
    if (!project?.user_id) {
      console.error("Project or user not found for email");
      return;
    }
    
    // User email lekérése az auth.users táblából
    const { data: userData } = await supabase.auth.admin.getUserById(project.user_id);
    
    if (!userData?.user?.email) {
      console.error("User email not found");
      return;
    }
    
    // Email küldése
    console.log(`Sending completion email to ${userData.user.email} for project "${project.title}"`);
    
    await fetch(`${supabaseUrl}/functions/v1/send-completion-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        email: userData.user.email,
        projectTitle: project.title,
        projectId: projectId
      })
    });
    
    console.log("Completion email sent successfully");
  } catch (error) {
    // Ne dobjunk hibát, csak loggoljuk - az email küldés nem kritikus
    console.error("Failed to send completion email:", error);
  }
}
```

## Alternatív megoldás (ha az auth.admin nem elérhető)

Ha a Supabase admin API nem használható, a profiles táblából is lekérhető az email:

```typescript
// Profiles táblából lekérés (ha van email mező)
const { data: authData } = await supabase
  .from("profiles")
  .select("user_id")
  .eq("user_id", project.user_id)
  .single();

// Vagy közvetlen auth.users lekérés RPC-vel
```

## Összefoglaló

| Fájl | Változtatás |
|------|-------------|
| `process-writing-job/index.ts` | Új `sendCompletionEmail` helper function + hívás `updateProjectProgress`-ből |

## Működési folyamat

```text
1. pg_cron triggereli a process-writing-job-ot (30 mp-ként)
2. Feldolgozza az utolsó pending job-ot
3. Frissíti a projekt progresst az updateProjectProgress-ben
4. Ha nincs több pending job (isCompleted = true):
   a. Lekéri a projekt címét és user_id-t
   b. Lekéri a user email címét
   c. Meghívja a send-completion-email edge function-t
   d. A user email-t kap a könyve elkészültéről
```

## Megjegyzések

- Az email küldés nem blokkolja a job feldolgozást (try-catch)
- Ha a küldés nem sikerül, csak logolunk, nem szakítjuk meg a folyamatot
- Az email tartalmazza a könyv címét és egy linket a projekt megnyitásához
