# AI Resume Tailor

Upload your resume + paste a job description → AI rewrites it to beat ATS filters.

Built with **Vue 3** + **Node.js** + **Claude API**.

## Quick Start

### 1. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env → add your ANTHROPIC_API_KEY
npm install
npm run dev
```

Runs on `http://localhost:3000`

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`

### 3. Open in Browser

Go to `http://localhost:5173` — upload a resume, paste a job description, see the magic.

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Claude API key (get from console.anthropic.com) |
| `PAYPAL_CLIENT_ID` | (optional) PayPal client ID for payments |
| `PAYPAL_CLIENT_SECRET` | (optional) PayPal secret |
| `PORT` | Backend port (default: 3000) |

## Project Structure

```
resume-tailor/
├── backend/
│   ├── server.js           # Express entry point
│   ├── routes/api.js       # Upload, tailor, payment routes
│   ├── services/claude.js  # Claude API integration
│   └── uploads/            # Temp file storage
├── frontend/
│   ├── src/
│   │   ├── App.vue         # Main app with step flow
│   │   └── components/
│   │       ├── UploadStep.vue
│   │       ├── PreviewStep.vue
│   │       └── ResultStep.vue
│   └── vite.config.js
└── README.md
```

## How It Works

1. **Upload** — User uploads resume (PDF/DOCX/TXT) + pastes job description
2. **Preview** — Claude rewrites first 30% for free, shows preview
3. **Pay** — $9.99 to unlock full tailored resume
4. **Download** — Download as TXT or copy to clipboard

## Tech Stack

- **Frontend**: Vue 3 + Vite
- **Backend**: Express.js
- **AI**: Claude API (Sonnet 4.6)
- **File Parsing**: pdf-parse, mammoth
- **Payments**: PayPal (coming soon)
