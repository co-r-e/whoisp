# WhoisP

WhoisP is a Next.js application that now ships with a Gemini-powered “DeepResearch” workflow. Users can submit an investigative query and receive a multi-step research plan, streamed evidence summaries with grounded citations, and a final synthesis report.

## Requirements

- Node.js 20.12 or newer
- npm (bundled with Node.js)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env.local` (or reuse `.env.local.example`) and provide the following values. Keys that are commented out in the example file can be left unset when not needed.

| Variable | Description |
| --- | --- |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-2.5-flash-lite`. Override to swap models without code changes. |
| `GOOGLE_API_KEY` | Google Cloud Gemini API key. Takes precedence when both keys are present. |
| `GEMINI_API_KEY` | Google AI Studio API key. Used when `GOOGLE_API_KEY` is absent. |
| `GOOGLE_GENAI_USE_VERTEXAI` | Set to `true` to target Vertex AI endpoints. Requires the variables below. |
| `GOOGLE_CLOUD_PROJECT` | Required when Vertex mode is enabled. Provide the human-readable project ID. |
| `GOOGLE_CLOUD_LOCATION` | Required when Vertex mode is enabled (for example, `us-central1`). |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional. Absolute path to a service account JSON file used by Google Auth when running on Vertex AI without an API key. |

At least one API key (`GOOGLE_API_KEY` or `GEMINI_API_KEY`) must be defined unless you rely on Vertex AI service-account credentials.

## Development

Start the dev server (Next.js chooses an open port; 3000 by default):

```bash
npm run dev
```

## Usage Notes

- The home page now renders the DeepResearch UI with live Server-Sent Events streaming from `/api/deep-research`.
- Each request produces a plan, step-level evidence cards, and a synthesis section with references sourced from Gemini grounding metadata.
- The Japanese landing page (`/ja`) surfaces the same experience with localized copy.

For legal and privacy guidance, open **Usage notes & disclaimer** from the navigation bar or visit `/disclaimer` directly.
