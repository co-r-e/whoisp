# WhoisP

WhoisP cross-searches publicly available profiles, social links, and company mentions using Google Gemini 2.5 Flash-Lite with Google Search grounding. Provide a full name plus supporting context (company, role, extra hints) and the app returns grounded web results grouped by domain.

## Requirements

- Node.js 20.12 or newer
- npm (bundled with Node.js)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env.local` file (or export variables in your shell) with one of the following API keys:

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_GENAI_API_KEY` | One of this or `GOOGLE_CLOUD_API_KEY` | Gemini API key issued from Google AI Studio. |
| `GOOGLE_CLOUD_API_KEY` | One of this or `GOOGLE_GENAI_API_KEY` | Gemini API key issued from Google Cloud (Generative Language API). `GOOGLE_GENAI_CLOUD_API_KEY` and `GOOGLE_VERTEX_API_KEY` are accepted aliases. |
| `GOOGLE_GENAI_MODEL` | Optional | Gemini model id. Defaults to `gemini-2.5-flash-lite`. |

When both keys are configured, `GOOGLE_GENAI_API_KEY` takes priority. If no environment variable is set, you can still add a per-browser key from **Settings → API Key** and it will be sent with each search request.

## Development

Start the dev server (Next.js chooses an open port; 3000 by default):

```bash
npm run dev
```

## Usage Notes

- The sidebar logo swaps between the primary logo and favicon as you collapse the navigation.
- Settings retains recent projects (stored locally) and allows you to switch languages or register your Gemini key.
- All results are grounded via Google Search through Gemini; if Gemini is unavailable, WhoisP falls back to Google/Bing links only.

For legal and privacy guidance, open **Usage notes & disclaimer** in the sidebar or at `/disclaimer`.
