# HireMind AI – FastAPI Backend

FastAPI + Supabase (PostgreSQL) backend for the HireMind AI recruitment dashboard.

---

## Project structure

```
backend/
├── app/
│   ├── main.py            # FastAPI app, CORS, router registration
│   ├── config.py          # Pydantic settings (loaded from .env)
│   ├── database.py        # Supabase client singleton
│   ├── auth.py            # JWT verification + get_current_user dependency
│   ├── routers/
│   │   ├── dashboard.py   # GET /api/dashboard/stats, /activity-logs
│   │   ├── jobs.py        # CRUD  /api/jobs
│   │   ├── candidates.py  # CRUD  /api/candidates + /applications
│   │   ├── ai_reports.py  # CRUD  /api/ai-reports
│   │   ├── interviews.py  # CRUD  /api/interviews
│   │   ├── communications.py  # /api/communications/channels + /messages
│   │   └── settings.py    # /api/settings (ai_weights, notif prefs, integrations)
│   └── schemas/
│       ├── users.py
│       ├── jobs.py
│       ├── candidates.py
│       ├── applications.py
│       ├── ai_reports.py
│       ├── interviews.py
│       ├── communications.py
│       ├── settings.py
│       └── dashboard.py
├── migrations/
│   ├── 001_initial_schema.sql   # All tables, enums, indexes, seed data
│   └── 002_row_level_security.sql  # RLS policies + helper functions
├── requirements.txt
├── .env.example
└── README.md
```

---

## Quick start

### 1. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migrations in order:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_row_level_security.sql`
3. Enable **Email Auth** in Authentication → Providers.

### 2. Environment

```bash
cd backend
cp .env.example .env
```

Fill in your `.env`:

| Key | Where to find it |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Secret |
| `ALLOWED_ORIGINS` | Your frontend URL, e.g. `http://localhost:3000` |

### 3. Install & run

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs → **http://localhost:8000/docs**

---

## Authentication flow

1. The **frontend** calls `supabase.auth.signInWithPassword(...)` (Supabase client SDK).
2. Supabase returns a JWT (access token).
3. The frontend sends the JWT as `Authorization: Bearer <token>` on every API request.
4. FastAPI's `get_current_user` dependency verifies the JWT locally with `SUPABASE_JWT_SECRET`, then fetches the user's `role` from `public.users`.
5. Route handlers receive a typed `CurrentUser` object with `id`, `email`, `name`, `role`, and the raw `token`.
6. For RLS-enforced queries, pass `user.token` to `get_user_client(user.token)` to build a per-request Supabase client.

---

## Role permissions summary

| Role | Jobs | Candidates | AI Reports | Interviews | Settings write |
|---|---|---|---|---|---|
| `super_admin` | R/W | R/W | R/W | R/W | ✓ |
| `hr_manager` | R/W | R/W | R/W | R/W | ✗ |
| `recruiter` | R | R/W | R/W | R/W | ✗ |
| `interviewer` | R | R | R | R/W | ✗ |
| `candidate` | R (active only) | own only | own only | own only | ✗ |

---

## Next steps

Each router file has `# TODO: implement` stubs ready for you to fill in.
The pattern for every endpoint is:

```python
from app.database import get_user_client

async def my_endpoint(user: CurrentUserDep):
    client = get_user_client(user.token)   # respects RLS
    result = client.table("jobs").select("*").execute()
    return result.data
```
