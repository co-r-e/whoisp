/**
 * Timeout configurations in milliseconds
 */
export const TIMEOUT = {
  PLAN_GENERATION: 30000, // 30 seconds
  EVIDENCE_GATHERING: 60000, // 60 seconds (includes web search)
  REPORT_SYNTHESIS: 45000, // 45 seconds
  PARTIAL_REPORT: 5000, // 5 seconds for partial report generation
} as const;

/**
 * Cache TTL configurations in milliseconds
 */
export const CACHE_TTL = {
  SUBJECT_IMAGES: 5 * 60 * 1000, // 5 minutes
  SUBJECT_NAME: 30 * 60 * 1000, // 30 minutes
} as const;

/**
 * Retry configurations
 */
export const RETRY = {
  MAX_ATTEMPTS: 2,
  BASE_DELAY_MS: 1000,
} as const;

/**
 * Image search configurations
 */
export const IMAGE_SEARCH = {
  MAX_IMAGES: 9,
  THUMBNAIL_WIDTH: 512,
  WIKIMEDIA_SEARCH_LIMIT: 20,
} as const;
