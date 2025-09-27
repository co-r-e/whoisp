import { z } from "zod";

const trimmed = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, "Value cannot be empty"));

const optionalTrimmed = trimmed.optional();

const envSchema = z.object({
  GOOGLE_GENAI_MODEL: trimmed,
  GOOGLE_GENAI_API_KEY: optionalTrimmed,
  GOOGLE_CLOUD_API_KEY: optionalTrimmed,
  GOOGLE_GENAI_CLOUD_API_KEY: optionalTrimmed,
  GOOGLE_VERTEX_API_KEY: optionalTrimmed,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const flattened = parsed.error.flatten();
  const details = [
    ...(flattened.fieldErrors.GOOGLE_GENAI_MODEL ?? []),
    ...(flattened.fieldErrors.GOOGLE_GENAI_API_KEY ?? []),
    ...(flattened.fieldErrors.GOOGLE_CLOUD_API_KEY ?? []),
    ...(flattened.fieldErrors.GOOGLE_GENAI_CLOUD_API_KEY ?? []),
    ...(flattened.fieldErrors.GOOGLE_VERTEX_API_KEY ?? []),
    ...flattened.formErrors,
  ]
    .filter(Boolean)
    .join("; ");
  throw new Error(`Environment validation failed: ${details || parsed.error.message}`);
}

export const serverEnv = parsed.data;

if (
  !serverEnv.GOOGLE_GENAI_API_KEY &&
  !serverEnv.GOOGLE_CLOUD_API_KEY &&
  !serverEnv.GOOGLE_GENAI_CLOUD_API_KEY &&
  !serverEnv.GOOGLE_VERTEX_API_KEY
) {
  console.warn(
    "[env] No Gemini API key configured in .env.local. Server-side search will respond with an error until a key is provided."
  );
}
