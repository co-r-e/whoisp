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

Copy the sample file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

All variables below must be set in `.env.local` (or exported in your shell before running the dev server):

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_GENAI_MODEL` | Yes | Gemini model id that supports Search Grounding (e.g., `gemini-2.5-flash`). |
| `GOOGLE_GENAI_API_KEY` | One of these four | Gemini API key issued from Google AI Studio. |
| `GOOGLE_CLOUD_API_KEY` | One of these four | Gemini API key issued from Google Cloud (Generative Language API). |
| `GOOGLE_GENAI_CLOUD_API_KEY` | One of these four | Alias accepted for Google Cloud Gemini API keys. |
| `GOOGLE_VERTEX_API_KEY` | One of these four | Vertex AI Gemini API key. |

Provide at least one API key; `GOOGLE_GENAI_API_KEY` takes priority when multiple keys are present.

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
