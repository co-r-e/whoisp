# WhoisP

WhoisP began as a prototype for researching public signals about people across the web. The live search functionality has now been retired; the project is kept here for reference along with supporting UI components such as the disclaimer pages and layout shell.

## Requirements

- Node.js 20.12 or newer
- npm (bundled with Node.js)

## Installation

```bash
npm install
```

## Environment Variables

The retired build does not require Google Gemini credentials. You can still create a `.env.local` file, but none of the variables are referenced at runtime.

## Development

Start the dev server (Next.js chooses an open port; 3000 by default):

```bash
npm run dev
```

## Usage Notes

- The top navigation links to the home page, the disclaimer, and the Japanese landing page.
- Search-related features, project lists, and API key storage have been removed.

For legal and privacy guidance, open **Usage notes & disclaimer** from the navigation bar or visit `/disclaimer` directly.
