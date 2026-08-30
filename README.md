# AI Study Hub

A local-first AI learning assistant. Drop a PDF, DOCX, Markdown or text file
in, get a cheatsheet and practice questions, then highlight any passage you
don't understand and ask the AI to explain it — with citation back to the
source. Share your work, ask the community, study together in rooms.

**Latest features (v0.2):**

- **Account system** — register with email+password, or sign in with GitHub.
  Every user gets a private workspace; documents, highlights, Q&A, and
  generations are scoped to the owner.
- **Multi-provider AI** — three providers ship out of the box, pick your
  default in Settings:
  - **SenseNova** (商汤日问) — `https://api.sensenova.cn/compat-mode/v1/chat/completions`
  - **OpenRouter** (free models like Gemini 2.0 Flash) — `https://openrouter.ai/api/v1`
  - **Custom** — any OpenAI-compatible endpoint (OpenAI, DeepSeek, Ollama, LM Studio, vLLM, Together, Groq, …)
- **Cheatsheet share feed** — `/explore` shows public cheatsheets/summaries from the community, with upvotes.
- **Q&A forum** — `/community/questions` — ask questions, answer, vote, mark a best answer.
- **Study rooms** — `/community` — create a room, get an invite code, post questions inside.

All data lives in a local SQLite file. AI keys are yours (BYOK) and stored
on-disk only. Nothing leaves your machine unless you call an external AI
provider.

---

## Quick start (local)

```bash
# Node 22+ required (uses built-in node:sqlite)
npm install

# 1. Run
npm run dev
# open http://localhost:3000

# 2. Create your account
# open http://localhost:3000/register, sign up

# 3. Add an API key
# open http://localhost:3000/settings, paste your key, hit Save
```

For a free local model, install [Ollama](https://ollama.com), pull a model
(`ollama pull llama3.1`), then set:

- Provider: `Custom`
- Base URL: `http://localhost:11434/v1`
- Model: `llama3.1`
- API Key: `ollama`

---

## Deployment

See [`DEPLOY_COMPARISON.md`](./DEPLOY_COMPARISON.md) for a side-by-side
comparison of three approaches.

### Option A — ngrok tunnel (5 minutes, no server)

Quickest way to share a live demo. Public URL is regenerated each time unless
you pay for a reserved domain.

1. Install ngrok: <https://ngrok.com/download> (or `winget install ngrok` on Windows)
2. Sign up at <https://dashboard.ngrok.com/signup>, copy your authtoken
3. One-time setup: `ngrok config add-authtoken <your-token>`
4. Start the tunnel: `node scripts/start-ngrok.js` (or `scripts\start-ngrok.bat` on Windows)
5. The public URL is printed in the console — share it.

### Option B — VPS + Docker (production-grade, persistent)

The fastest path. The repo ships with a one-shot `deploy.sh` that installs
Docker, configures the firewall, builds the image, starts the container, and
(when given a domain) sets up Caddy for automatic HTTPS.

```bash
# 1. Buy a fresh Ubuntu 22.04 VPS (Vultr, DO, Hetzner, Linode, etc.)
# 2. SSH in as root
ssh root@YOUR_VPS_IP

# 3. Clone the repo and deploy (the script handles the rest)
git clone https://github.com/YOUR_USER/ai-study-hub.git /opt/ai-study-hub
cd /opt/ai-study-hub
# Without a domain (IP-only, HTTP):
bash deploy.sh
# Or with a domain + auto HTTPS:
bash deploy.sh --domain=study.example.com --email=you@example.com
```

The script:
- installs Docker if missing
- configures `ufw` (SSH + 80 + 443)
- generates a strong `AUTH_SECRET` for session cookies
- builds the image, starts the container, waits for the health check
- if `--domain=...` is given, installs Caddy and requests a Let's Encrypt cert

After it finishes you'll get a public URL. Open it, register an account, then
go to Settings and paste your AI key.

**Updating later**: `bash scripts/update.sh` (pulls, rebuilds, restarts).  
**Backups**: add `0 3 * * * /opt/ai-study-hub/scripts/backup.sh` to crontab.  
**Logs**: `bash scripts/logs.sh` or `docker compose logs -f app`.  
**First-run on a fresh server without a domain**: the app listens on
`http://YOUR_VPS_IP:3000` until you put a domain + Caddy in front of it.

For a more detailed walkthrough (firewall, swap to nginx, GitHub OAuth, etc.)
see [`DEPLOY_VPS.md`](./DEPLOY_VPS.md).

### Option C — Vercel + Turso (cloud, free tier)

Not yet wired up — would require swapping `node:sqlite` for `@libsql/client`.
Only do this if you want a global CDN and don't mind a third-party DB.

---

## Architecture

| Concern | Where |
|---|---|
| HTTP routes (API) | `src/app/api/**/route.ts` |
| DB schema | `src/lib/db.ts` |
| Auth (sessions) | `src/lib/auth.ts` + `src/lib/password.ts` |
| AI client (multi-provider) | `src/lib/ai.ts` |
| Prompt templates | `src/lib/prompts.ts` |
| File parsing | `src/lib/extract.ts` |
| UI shell | `src/app/layout.tsx` + `src/components/Header.tsx` |
| Home (upload + list) | `src/app/page.tsx` |
| Login / Register | `src/app/login/page.tsx`, `src/app/register/page.tsx` |
| Reader | `src/components/Reader.tsx` |
| Settings | `src/app/settings/page.tsx` |
| Explore feed | `src/app/explore/page.tsx` |
| Q&A forum | `src/app/community/questions/**` |
| Rooms | `src/app/community/**` |
| Profile | `src/app/u/[id]/page.tsx` |

## End-to-end QA

Two scripts cover the full stack:

```bash
node scripts/qa.js       # pure HTTP, no AI required
node scripts/qa-e2e.js   # full flow with mock-ai
node scripts/visual-qa.js # Playwright UI walk
node scripts/shellcheck.js # syntax check on deploy.sh + scripts/*.sh
```

Mock AI server: `node scripts/mock-ai.js` (port 9999).

## Server-side scripts (used on the VPS)

- `deploy.sh` — first-time install on a fresh Ubuntu 22.04+ server.
- `scripts/update.sh` — pull latest code, rebuild, restart.
- `scripts/backup.sh` — back up the SQLite database; intended for cron.
- `scripts/logs.sh` — tail the app container logs.
- `scripts/shellcheck.js` — sanity-check all shell scripts.

## License

MIT.
