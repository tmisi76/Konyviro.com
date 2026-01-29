// Audiobook credit packages and pricing
// Based on ElevenLabs API cost ~$0.20/minute, sold at 4x markup

export const AUDIOBOOK_CREDIT_PACKAGES = [
  {
    id: "audiobook_30",
    name: "Alap",
    minutes: 30,
    priceHuf: 9990,
    pricePerMinute: 333,
    description: "~1 novella",
    badge: null,
    stripePriceId: "",
  },
  {
    id: "audiobook_100",
    name: "Népszerű",
    minutes: 100,
    priceHuf: 29990,
    pricePerMinute: 300,
    description: "~1 regény",
    badge: "Népszerű" as const,
    stripePriceId: "",
  },
  {
    id: "audiobook_250",
    name: "Profi",
    minutes: 250,
    priceHuf: 69990,
    pricePerMinute: 280,
    description: "~2-3 regény",
    badge: "Legjobb ár" as const,
    stripePriceId: "",
  },
];

export type AudiobookCreditPackage = (typeof AUDIOBOOK_CREDIT_PACKAGES)[number];

// Conversion constants
export const CHARACTERS_PER_MINUTE = 1000; // ~1000 characters = ~1 minute of audio

// Estimate audio minutes from text
export function estimateAudioMinutes(text: string): number {
  const characterCount = text.length;
  return Math.ceil(characterCount / CHARACTERS_PER_MINUTE);
}

// Format minutes for display
export function formatAudioMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} perc`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} óra`;
  }
  return `${hours} óra ${remainingMinutes} perc`;
}
