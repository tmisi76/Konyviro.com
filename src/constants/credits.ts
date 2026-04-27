// Credit costs for various AI operations
export const COVER_GENERATION_COST = 2000;
export const COVER_EDIT_COST = 2000;
export const STORYBOOK_TEXT_COST = 3000;
export const STORYBOOK_ILLUSTRATION_COST = 500;

// 3 borító variáció (4K) – egy futtatás során 3 darab generálódik
export const COVER_VARIATIONS_COUNT = 3;
export const COVER_VARIATIONS_COST = COVER_GENERATION_COST * COVER_VARIATIONS_COUNT;

// AI vázlat generálása nyersanyagból (raw_sources)
export const OUTLINE_FROM_SOURCES_COST = 1000;
