export type SubscriptionTier = "free" | "hobby" | "writer" | "pro";
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "past_due";

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  originalPrice: string;
  discountedPrice: string;
  monthlyEquivalent: string;
  priceId: string;
  features: string[];
  projectLimit: number | "unlimited";
  monthlyWordLimit: number | "unlimited";
  isPopular?: boolean;
}

export const FOUNDER_PLANS: SubscriptionPlan[] = [
  {
    id: "hobby",
    name: "HOBBI",
    originalPrice: "59.880 Ft/év",
    discountedPrice: "29.940 Ft/év",
    monthlyEquivalent: "(havi 2.495 Ft)",
    priceId: "price_1Ss3QZBqXALGTPIr0z2uRD0a",
    features: [
      "1 aktív projekt",
      "50.000 szó/hó AI generálás",
      "Alap export (Word, TXT)",
      "Email támogatás",
      '"Alapító" badge',
    ],
    projectLimit: 1,
    monthlyWordLimit: 50000,
  },
  {
    id: "writer",
    name: "ÍRÓ",
    originalPrice: "179.880 Ft/év",
    discountedPrice: "89.940 Ft/év",
    monthlyEquivalent: "(havi 7.495 Ft)",
    priceId: "price_1Ss3QbBqXALGTPIrjbB9lSCI",
    features: [
      "5 aktív projekt",
      "200.000 szó/hó AI generálás",
      "Minden műfaj (+ erotikus 18+)",
      "Karakter & kutatás modul",
      "Minden export formátum",
      "Prioritás támogatás",
      '"Alapító" badge',
    ],
    projectLimit: 5,
    monthlyWordLimit: 200000,
    isPopular: true,
  },
  {
    id: "pro",
    name: "PRO",
    originalPrice: "359.880 Ft/év",
    discountedPrice: "179.940 Ft/év",
    monthlyEquivalent: "(havi 14.995 Ft)",
    priceId: "price_1Ss3QcBqXALGTPIrStgzIXPu",
    features: [
      "Korlátlan projekt",
      "Korlátlan AI generálás",
      "Minden funkció + API",
      "Dedikált támogatás",
      '"Alapító" badge',
    ],
    projectLimit: "unlimited",
    monthlyWordLimit: "unlimited",
  },
];

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isFounder: boolean;
  founderDiscountApplied: boolean;
  startDate: string | null;
  endDate: string | null;
  monthlyWordLimit: number;
  projectLimit: number;
}

export interface FounderSpots {
  totalSpots: number;
  spotsTaken: number;
}

export interface UserUsage {
  wordsGenerated: number;
  projectsCreated: number;
}
