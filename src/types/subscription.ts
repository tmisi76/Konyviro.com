export type SubscriptionTier = "free" | "hobby" | "writer" | "pro";
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
      "1.000 szó / hó AI generálás",
      "❌ Nincs exportálás",
      "❌ Nincs borító tervező",
      "❌ Nincs támogatás",
    ],
    projectLimit: 1,
    monthlyWordLimit: 1000,
    isFree: true,
  },
  {
    id: "hobby",
    name: "HOBBI",
    description: "Hobbi íróknak",
    monthlyPrice: "4.990 Ft/hó",
    yearlyPrice: "29.940 Ft/év",
    yearlyOriginalPrice: "59.880 Ft/év",
    monthlyEquivalent: "(havi 2.495 Ft)",
    monthlyPriceId: "price_1Ss8bGBqXALGTPIrOVHTHBPA",
    yearlyPriceId: "price_1Ss3QZBqXALGTPIr0z2uRD0a",
    features: [
      "5 aktív projekt",
      "100.000 szó / hó AI generálás",
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
    name: "ÍRÓ",
    description: "Komoly íróknak",
    monthlyPrice: "14.990 Ft/hó",
    yearlyPrice: "89.940 Ft/év",
    yearlyOriginalPrice: "179.880 Ft/év",
    monthlyEquivalent: "(havi 7.495 Ft)",
    monthlyPriceId: "price_1Ss8bHBqXALGTPIrEmUEe1Gw",
    yearlyPriceId: "price_1Ss3QbBqXALGTPIrjbB9lSCI",
    features: [
      "50 aktív projekt",
      "1.000.000 szó / hó AI generálás",
      "Exportálás (DOC, Epub, PDF, TXT)",
      "Nano Banana Könyvborító tervező",
      "Kreatív regényíró AI rendszer",
      "Karakter & kutatás modul",
      "Minden műfaj (+18 tartalom)",
      "Email támogatás",
    ],
    projectLimit: 50,
    monthlyWordLimit: 1000000,
    isPopular: true,
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
