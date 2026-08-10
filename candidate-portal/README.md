# HireMind AI — Candidate Portal

Standalone candidate-facing interview app. Shares the same Supabase database as the admin dashboard — results appear in real-time with zero sync code.

## Architecture

```
┌──────────────────┐        ┌──────────────────┐        ┌──────────────┐
│  Admin Dashboard │        │ Candidate Portal │        │   Supabase   │
│  (localhost:3000)│───────▶│ (localhost:3001)  │───────▶│   Database   │
│                  │ token  │                  │  RLS   │              │
│  generates link  │ gen    │  validates token │ scoped │  shared data │
└──────────────────┘        └──────────────────┘        └──────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  DeepSeek AI │
                              │  (server-side)│
                              └──────────────┘
```

## Quick Start

```bash
# From this directory
npm install
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, and DeepSeek key
npm run dev
# → runs on http://localhost:3001
```

## Database Setup

Run the migration to create the `candidate_tokens` table:

```bash
# In Supabase SQL Editor, run:
# backend/migrations/005_candidate_tokens.sql
```

## How It Works

1. **Admin generates a link** — calls `POST /api/portal/generate-token` on the backend (or the portal's own `/api/generate-token` endpoint)
2. **Candidate clicks link** — e.g. `http://localhost:3001/interview?token=abc123`
3. **Token validated** — server checks expiry, marks used, loads candidate + job context
4. **AI interview starts** — DeepSeek generates adaptive questions (5-8 per round)
5. **Results written** — `ai_interview_rounds` table updated with transcript, score, summary
6. **Admin sees results** — the AI Intelligence view and Candidate dossier show the new data immediately

## Generating Test Tokens

### Via Admin Backend (demo mode)
```bash
curl -X POST http://localhost:8000/api/portal/generate-token \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_id": "<uuid>",
    "application_id": "<uuid>",
    "round_type": "tech",
    "expires_in_hours": 168
  }'
```

### Via Seed Script
```bash
npx tsx scripts/seed-test-candidate.ts
```

## Design System

Uses the same design tokens as the admin dashboard:
- Background: `#0A0A0A` / `#0D0D0D`
- Card panels: `#141414` with 1px `#262626` borders
- Accent: `#FF6B1A` (orange)
- Font: Space Mono (monospace throughout)
- All labels: UPPERCASE with letter-spacing
- Sharp corners (2px radius max)

Shared tokens live in `../shared/design-tokens.ts`.

## Security

- **No service-role key in the client bundle** — all Supabase writes go through Next.js API routes
- **DeepSeek API key server-side only** — client never sees it
- **Tokens are short-lived** (48h default) and single-use
- **RLS policies** ensure candidates can only see/update their own data
- **Token validation happens server-side** before any data is returned
