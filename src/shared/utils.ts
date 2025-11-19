/**
 * Converts an unknown error to a user-friendly error message string
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected error";
}

/**
 * Gets an environment variable value, returning undefined if empty or unset
 */
export function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() ? value.trim() : undefined;
}

/**
 * Converts a string value to boolean
 */
export function asBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return value.toLowerCase() === "true";
}
