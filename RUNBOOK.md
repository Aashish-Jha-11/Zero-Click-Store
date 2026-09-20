# DukaanPilot — Runbook

Track 1 · Zero-Click Store Operator

## Run it

```bash
cd backend  && npx tsx src/server.ts     # :3001
cd frontend && npm run dev               # :3000
curl -s localhost:3001/api/health        # llmConfigured must be true
```

Before every rehearsal and before judging: `./backend/reset-demo.sh`
(each run really deducts stock, so bread hits 0 after ~4 takes and the demo breaks).

## One-time setup

| Where | What |
|---|---|
| Google Cloud → Credentials | Redirect URI: `https://bsdcklnrujljtfqmvsln.supabase.co/auth/v1/callback` |
| Supabase → Auth → URL Configuration | Site URL `https://dukaanpilot.vercel.app` · Redirect URLs `https://dukaanpilot.vercel.app/**` and `http://localhost:3000/**` (the `/**` matters) |
| Supabase → SQL Editor | Run `backend/fix-auth.sql` once |
| `backend/.env` | `GROQ_API_KEY` (any of ANTHROPIC / OPENAI / CEREBRAS / OPENROUTER / GEMINI also work) |

**Prod:** deploy backend to Render (`backend/render.yaml`), set `SUPABASE_URL`,
`SUPABASE_SECRET_KEY`, `GROQ_API_KEY` there. In Vercel set only
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_API_BASE_URL` → the Render URL. Never put the Groq or Supabase
secret key in Vercel.

## Demo · 3 minutes

Keep the Inventory tab open in a second window.

> "Kirana owners take Hinglish orders on WhatsApp, then check stock, price it,
> write the bill and update the register by hand. DukaanPilot does all of it.
> It's not a chatbot — every number comes out of Postgres and every action
> writes back to it."

1. **`Bhaiya 2 Maggi, 1 Amul Taaza milk aur 1 Britannia bread de do`**
   Walk the Execution Log: 3 lookups → 3 stock checks → DB pricing → one atomic
   transaction. Switch to Inventory: Maggi 37→35, Milk 18→17, Bread 4→3.
   *"That's the real table."*
2. **`10 Britannia bread chahiye`** — refuses, quotes the real 3 remaining.
3. **`mujhe milk chahiye`** — searched first, quotes both Amul variants with real prices.
4. **The resilience card:** if Groq rate-limits mid-demo, a deterministic Hinglish
   parser takes over — same tools, same atomic transaction, same audit trail. The
   badge flips to "Deterministic fallback". Call it out if it happens.

All three are tappable buttons on the empty state — no typing on stage.

## If it breaks

| Symptom | Fix |
|---|---|
| Stuck on sign-in after Google | Supabase Redirect URLs missing `/**` |
| Agent errors | `curl localhost:3001/api/health` → check `llmConfigured` |
| Always "Deterministic fallback" | Groq rate limit. Demo still works — own it |
| Empty inventory | Backend down or wrong `NEXT_PUBLIC_API_BASE_URL` (not RLS) |
| Stock wrong | `./backend/reset-demo.sh` |

## Docs

- `docs/HERO_VIDEO_GUIDE.md` — hero video prompts + ffmpeg scrub encoding
- `backend/DATABASE.md` — schema
- `docs/DukaanPilot_Track1_Hackathon_Execution_Plan.md` — original plan
