export interface EmailVariable {
  name: string;
  description: string;
  category: 'user' | 'subscription' | 'project' | 'auth' | 'usage' | 'system';
  example: string;
}

export const EMAIL_VARIABLE_CATEGORIES = {
  user: { label: 'Felhasználó', icon: 'User' },
  subscription: { label: 'Előfizetés', icon: 'CreditCard' },
  project: { label: 'Projekt', icon: 'BookOpen' },
  auth: { label: 'Hitelesítés', icon: 'Lock' },
  usage: { label: 'Használat', icon: 'BarChart' },
  system: { label: 'Rendszer', icon: 'Settings' },
} as const;

export const EMAIL_VARIABLES: EmailVariable[] = [
  // User variables
  { name: 'user_name', description: 'Felhasználó teljes neve', category: 'user', example: 'Kovács János' },
  { name: 'email', description: 'Email cím', category: 'user', example: 'kovacs.janos@email.hu' },
  { name: 'display_name', description: 'Megjelenítési név', category: 'user', example: 'JánosK' },
  { name: 'first_name', description: 'Keresztnév', category: 'user', example: 'János' },
  
  // Subscription variables
  { name: 'subscription_tier', description: 'Előfizetési csomag neve', category: 'subscription', example: 'Író' },
  { name: 'subscription_status', description: 'Előfizetés státusza', category: 'subscription', example: 'Aktív' },
  { name: 'subscription_end_date', description: 'Előfizetés lejárata', category: 'subscription', example: '2026-02-25' },
  { name: 'plan_price', description: 'Csomag ára', category: 'subscription', example: '4990 Ft' },
  
  // Project variables
  { name: 'project_title', description: 'Projekt címe', category: 'project', example: 'Az elveszett királyság' },
  { name: 'project_genre', description: 'Projekt műfaja', category: 'project', example: 'Fantasy' },
  { name: 'chapter_count', description: 'Fejezetek száma', category: 'project', example: '12' },
  { name: 'word_count', description: 'Szószám', category: 'project', example: '45 000' },
  
  // Auth variables
  { name: 'reset_link', description: 'Jelszó visszaállítási link', category: 'auth', example: 'https://app.hu/reset?token=...' },
  { name: 'verification_link', description: 'Email megerősítési link', category: 'auth', example: 'https://app.hu/verify?token=...' },
  { name: 'magic_link', description: 'Bejelentkezési link', category: 'auth', example: 'https://app.hu/login?token=...' },
  
  // Usage variables
  { name: 'words_remaining', description: 'Hátralévő szavak', category: 'usage', example: '15 000' },
  { name: 'words_used', description: 'Felhasznált szavak', category: 'usage', example: '35 000' },
  { name: 'monthly_limit', description: 'Havi limit', category: 'usage', example: '50 000' },
  { name: 'projects_created', description: 'Létrehozott projektek', category: 'usage', example: '3' },
  
  // System variables
  { name: 'current_date', description: 'Mai dátum', category: 'system', example: '2026. január 25.' },
  { name: 'current_year', description: 'Aktuális év', category: 'system', example: '2026' },
  { name: 'app_name', description: 'Alkalmazás neve', category: 'system', example: 'KönyvÍró AI' },
  { name: 'support_email', description: 'Support email', category: 'system', example: 'support@konyviro.hu' },
];

export function getVariablesByCategory(category: EmailVariable['category']): EmailVariable[] {
  return EMAIL_VARIABLES.filter(v => v.category === category);
}

export function getTestValues(): Record<string, string> {
  return EMAIL_VARIABLES.reduce((acc, v) => {
    acc[v.name] = v.example;
    return acc;
  }, {} as Record<string, string>);
}

export function replaceVariablesWithTestData(html: string): string {
  const testValues = getTestValues();
  return html.replace(/\{\{(\w+)\}\}/g, (match, name) => testValues[name] || match);
}
