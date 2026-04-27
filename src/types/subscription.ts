export type SubscriptionTier = "free" | "hobby" | "writer" | "agency" | "pro";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due";
export type BillingPeriod = "monthly" | "yearly";

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyOriginalPrice: string;
  monthlyEquivalent: string;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
  features: string[];
  projectLimit: number | "unlimited";
  monthlyWordLimit: number | "unlimited";
  isPopular?: boolean;
  isFree?: boolean;
  isHidden?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "INGYENES",
    description: "Próbáld ki az alapfunkciókat",
    monthlyPrice: "0 Ft",
    yearlyPrice: "0 Ft",
    yearlyOriginalPrice: "0 Ft",
    monthlyEquivalent: "",
    features: [
      "1 aktív projekt",
      "10.000 szó / hó AI generálás",
      "❌ Nincs exportálás",
      "❌ Nincs borító tervező",
      "❌ Nincs támogatás",
    ],
    projectLimit: 1,
    monthlyWordLimit: 10000,
    isFree: true,
    isHidden: true,
  },
  {
    id: "hobby",
    name: "HOBBI",
    description: "Hobbi íróknak",
    monthlyPrice: "9.990 Ft/hó",
    yearlyPrice: "59.990 Ft/év",
    yearlyOriginalPrice: "119.880 Ft/év",
    monthlyEquivalent: "(havi 4.999 Ft)",
    monthlyPriceId: "price_1TQmGVBqXALGTPIrPvPRE6KC",
    yearlyPriceId: "price_1TQmGWBqXALGTPIr7S5g9RPw",
    features: [
      "5 aktív projekt",
      "100.000 szó / hó AI generálás",
      "1 mesekönyv / hó",
      "Exportálás (DOC, Epub, PDF, TXT)",
      "Nano Banana Könyvborító tervező",
      "Kreatív regényíró AI rendszer",
      "Email támogatás",
    ],
    projectLimit: 5,
    monthlyWordLimit: 100000,
  },
  {
    id: "writer",
    name: "PROFI",
    description: "Profi szerzőknek",
    monthlyPrice: "19.990 Ft/hó",
    yearlyPrice: "119.990 Ft/év",
    yearlyOriginalPrice: "239.880 Ft/év",
    monthlyEquivalent: "(havi 9.999 Ft)",
    monthlyPriceId: "price_1TQmGXBqXALGTPIrhCjEFaXk",
    yearlyPriceId: "price_1TQmGYBqXALGTPIrYIHATtgi",
    features: [
      "50 aktív projekt",
      "250.000 szó / hó AI generálás",
      "5 mesekönyv / hó",
      "Exportálás (DOC, Epub, PDF, TXT)",
      "Nano Banana Könyvborító tervező",
      "Kreatív regényíró AI rendszer",
      "Karakter & kutatás modul",
      "Minden műfaj (+18 tartalom)",
      "Email támogatás",
    ],
    projectLimit: 50,
    monthlyWordLimit: 250000,
    isPopular: true,
  },
  {
    id: "agency",
    name: "ÜGYNÖKSÉG",
    description: "Csapatoknak és kiadóknak",
    monthlyPrice: "59.990 Ft/hó",
    yearlyPrice: "359.990 Ft/év",
    yearlyOriginalPrice: "719.880 Ft/év",
    monthlyEquivalent: "(havi 29.999 Ft)",
    monthlyPriceId: "price_1TQmGaBqXALGTPIrc79f9jvx",
    yearlyPriceId: "price_1TQmGcBqXALGTPIrdfmuEjxH",
    features: [
      "250 aktív projekt",
      "1.250.000 szó / hó AI generálás",
      "25 mesekönyv / hó",
      "Csapat együttműködés (collaboration)",
      "Minden PROFI funkció",
      "Karakter & kutatás modul",
      "Minden műfaj (+18 tartalom)",
      "Prioritás support",
      "Dedikált account manager",
    ],
    projectLimit: 250,
    monthlyWordLimit: 1250000,
  },
  {
    id: "pro",
    name: "PRO",
    description: "Profi szerzőknek",
    monthlyPrice: "29.990 Ft/hó",
    yearlyPrice: "179.940 Ft/év",
    yearlyOriginalPrice: "359.880 Ft/év",
    monthlyEquivalent: "(havi 14.995 Ft)",
    monthlyPriceId: "price_pro_monthly",
    yearlyPriceId: "price_1Ss3QcBqXALGTPIrStgzIXPu",
    features: [
      "Korlátlan projekt",
      "Korlátlan AI generálás",
      "Minden funkció + API",
      "Dedikált támogatás",
    ],
    projectLimit: "unlimited",
    monthlyWordLimit: "unlimited",
    isHidden: true,
  },
];

// Legacy export for backward compatibility
export const FOUNDER_PLANS = SUBSCRIPTION_PLANS.filter(p => !p.isFree && !p.isHidden);

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isFounder: boolean;
  founderDiscountApplied: boolean;
  startDate: string | null;
  endDate: string | null;
  monthlyWordLimit: number;
  projectLimit: number;
  extraWordsBalance: number;
}

export interface FounderSpots {
  totalSpots: number;
  spotsTaken: number;
}

export interface UserUsage {
  wordsGenerated: number;
  projectsCreated: number;
}
