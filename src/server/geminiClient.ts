import { GoogleGenAI, type GoogleGenAIOptions } from "@google/genai/node";
import { getEnv, asBoolean } from "@/shared/utils";

const DEFAULT_MODEL = "gemini-3-pro-preview";

type GeminiClientBundle = {
  client: GoogleGenAI;
  model: string;
  isVertex: boolean;
};

let cachedBundle: GeminiClientBundle | null = null;
let cachedKey: string | null = null;

function computeKey(parts: Record<string, string | boolean | undefined>): string {
  return JSON.stringify(parts);
}

function buildOptions(): { options: GoogleGenAIOptions; model: string; isVertex: boolean; key: string } {
  const model = getEnv("GEMINI_MODEL") ?? DEFAULT_MODEL;
  const googleApiKey = getEnv("GOOGLE_API_KEY");
  const geminiApiKey = getEnv("GEMINI_API_KEY");
  const apiKey = googleApiKey ?? geminiApiKey;

  const useVertex = asBoolean(getEnv("GOOGLE_GENAI_USE_VERTEXAI"));
  const project = getEnv("GOOGLE_CLOUD_PROJECT");
  const location = getEnv("GOOGLE_CLOUD_LOCATION");
  const googleCredentialsPath = getEnv("GOOGLE_APPLICATION_CREDENTIALS");

  if (!apiKey && !useVertex) {
    throw new Error(
      "Missing API key. Provide GOOGLE_API_KEY or GEMINI_API_KEY to call the Gemini API."
    );
  }

  if (useVertex && (!project || !location)) {
    throw new Error(
      "Vertex AI mode requires GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables."
    );
  }

  const options: GoogleGenAIOptions = useVertex
    ? {
        vertexai: true,
        project,
        location,
        apiKey: apiKey ?? undefined,
        googleAuthOptions: googleCredentialsPath
          ? { keyFile: googleCredentialsPath }
          : undefined,
      }
    : {
        apiKey: apiKey!,
      };

  const key = computeKey({
    model,
    useVertex,
    project,
    location,
    apiKey: apiKey ? "set" : "unset",
    googleCredentialsPath: googleCredentialsPath ? "set" : "unset",
  });

  return { options, model, isVertex: useVertex, key };
}

export function getGeminiClient(): GeminiClientBundle {
  const { options, model, isVertex, key } = buildOptions();
  if (!cachedBundle || cachedKey !== key) {
    cachedBundle = {
      client: new GoogleGenAI(options),
      model,
      isVertex,
    };
    cachedKey = key;
  }
  return cachedBundle;
}

export function getModel(): string {
  return getEnv("GEMINI_MODEL") ?? DEFAULT_MODEL;
}
