# EstateFlow CRM

A production-ready, mobile-first Real Estate CRM built with Next.js 15, Supabase, and Twilio. Manage leads, automate agent-to-lead bridge calls, share property photos in one click, track follow-ups, attendance, and social media — all from your phone.

## Architecture

```
src/
├── app/
│   ├── (auth)/              # Login, signup, invite accept (/invite/{token})
│   ├── (dashboard)/         # Protected CRM pages
│   ├── api/
│   │   ├── webhooks/leads/  # Lead intake webhook
│   │   ├── auth/            # Email verification OTP
│   │   └── twilio/          # Voice call callbacks
│   └── share/[token]/       # Public property share pages
├── components/
│   ├── ui/                  # shadcn-style components
│   ├── layout/              # Bottom nav, sidebar
│   └── [module]/            # Feature components
├── lib/
│   ├── supabase/            # Client, server, service clients
│   ├── services/            # External API adapters
│   │   ├── callService.ts
│   │   ├── messageService.ts
│   │   ├── brevoEmailService.ts
│   │   ├── invitationService.ts
│   │   ├── emailVerificationService.ts
│   │   ├── rateLimitService.ts
│   │   ├── leadAssignmentService.ts
│   │   ├── propertyShareService.ts
│   │   ├── attendanceService.ts
│   │   └── socialPostService.ts
│   ├── db/queries.ts        # Database queries
│   ├── actions/             # Server actions
│   ├── types/               # TypeScript types
│   └── validations/         # Zod schemas
supabase/migrations/         # Database schema + RLS
scripts/seed.ts              # Demo data seeder
```

## Features

- **Instant Call Bridge** — New webhook lead → calls agent first → bridges to lead via Twilio
- **Lead Management** — Full CRM with timeline, filters, status, temperature
- **One-Click Actions** — Call, WhatsApp, share property from lead detail
- **Property Inventory** — Listings with public share links
- **Follow-ups** — Templates, schedule, snooze, complete
- **Attendance** — GPS check-in/out with admin dashboard
- **Social Media** — Content calendar with AI caption helper
- **Reports** — Leads by source/status, agent performance
- **Multi-tenant** — Organization-scoped with RLS
- **Dry-run mode** — Full flow simulation without API keys

## Tech Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, Storage, Realtime-ready)
- Twilio Voice + WhatsApp/SMS
- Brevo SMTP (email verification) + OpenAI-compatible (AI captions)
- Vercel (hosting)

## Local Setup

### 1. Clone and install

```bash
cd RealEstateCrm
npm install
cp .env.example .env.local
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy URL and keys to `.env.local`
3. Run the migration in Supabase SQL Editor:

```bash
# Or with Supabase CLI:
supabase db push
```

Apply migrations in order through `supabase/migrations/006_verify_email_transaction.sql`

### 3. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
DRY_RUN_MODE=true
LEAD_WEBHOOK_SECRET=your-secret
```

With `DRY_RUN_MODE=true`, Twilio/WhatsApp/Email delivery is simulated — no API keys needed for development.

### Email verification (Brevo SMTP — optional API)

Used for the **email OTP verification API** (`/api/auth/request-verification-code`). This is separate from team invitations.

Add to `.env.local` (see `.env.example`):

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-smtp-user
SMTP_PASSWORD=your-brevo-smtp-key
SMTP_FROM_EMAIL=no-reply@yourdomain.com
SMTP_FROM_NAME="EstateFlow CRM"
OTP_SECRET=your-random-secret-at-least-32-chars
OTP_EXPIRY_MINUTES=10
```

Generate `OTP_SECRET`:

```bash
openssl rand -hex 32
```

Test SMTP delivery (development only):

```bash
npm run email:test -- you@example.com
```

Request and verify codes via API:

```bash
curl -X POST http://localhost:3000/api/auth/request-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

curl -X POST http://localhost:3000/api/auth/verify-email-code \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","code":"123456"}'
```

Run automated tests (SMTP is mocked):

```bash
npm test
```

### Team invitations (Brevo SMTP)

When an admin invites a member from **Team**, the app sends an **invitation email** (not an OTP). Flow:

1. Admin enters email + role on `/team` → invitation saved + email sent via Brevo
2. Invitee clicks **Accept invitation** in the email → `/invite/{token}`
3. Invitee enters name + password → account is created and linked to the organization
4. Invitee is signed in automatically (or redirected to `/login` if needed)
5. Future access uses **email + password** on `/login`

Requires `DRY_RUN_MODE=false` and valid Brevo SMTP settings (same vars as above, except `OTP_*` is only needed for the OTP API).

Test a real SMTP send:

```bash
npm run email:test -- you@example.com
```

### 4. Seed demo data

```bash
npm run db:seed
```

### 5. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo login:** `admin@estateflow.demo` / `demo123456`

## Webhook Testing

Send a test lead via curl:

```bash
curl -X POST http://localhost:3000/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "fullName": "Rahul Sharma",
    "phone": "+919999999999",
    "email": "rahul@example.com",
    "source": "36 Acre",
    "propertyType": "Apartment",
    "budgetMin": 7500000,
    "budgetMax": 12000000,
    "preferredLocation": "Gurgaon",
    "notes": "Looking for 3BHK near Golf Course Road"
  }'
```

Connect to Zapier, Make, Facebook Lead Ads, or website forms using this endpoint.

## Twilio Setup (Production)

1. Create a [Twilio account](https://twilio.com)
2. Buy a phone number with Voice capability
3. Configure in Settings → Integrations or env vars:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
4. Set webhook URLs in Twilio console to your deployed app:
   - Voice URL: `https://your-app.vercel.app/api/twilio/agent-answer`
5. Set `DRY_RUN_MODE=false` in production

### Call Bridge Flow

1. New lead arrives (webhook or manual)
2. System assigns agent (round-robin / least-busy)
3. Twilio calls the agent
4. Agent hears: "New lead from {source}. Press any key to connect."
5. Agent presses key → lead is dialed → calls bridged
6. Call logged with duration, recording, outcome
7. If no answer → next agent → else "Call Pending" + manager notification

## Deploy to Vercel + Supabase

### Vercel

```bash
npm i -g vercel
vercel
```

Add all env vars from `.env.example` in Vercel dashboard (Project → Settings → Environment Variables).

**Required for production email:**

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (your real Vercel URL) |
| `DRY_RUN_MODE` | `false` |
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Brevo SMTP login (`xxx@smtp-brevo.com`) |
| `SMTP_PASSWORD` | Your Brevo SMTP key (`xsmtpsib-...`) |
| `SMTP_FROM_EMAIL` | Verified sender in Brevo |
| `SMTP_FROM_NAME` | `EstateFlow CRM` (no quotes needed) |
| `OTP_SECRET` | 32+ char random string |

Also add all Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

After adding variables, **redeploy** (Deployments → ⋯ → Redeploy). Env changes do not apply to existing deployments until redeployed.

If invites still fail, check Vercel **Logs** for `[email] team invite failed:` — common causes:
- `DRY_RUN_MODE` still `true`
- Missing `SMTP_*` variables
- `SMTP_PASSWORD` is your Brevo account password instead of the SMTP key
- `SMTP_FROM_EMAIL` not verified in Brevo → Senders & Domains

Set `DRY_RUN_MODE=false` for Twilio and email in production.

### Supabase

- Enable Email auth in Authentication → Providers
- Run migration SQL
- Run seed script against production (optional)
- Configure Storage bucket `property-images` for photo uploads (future)

## Roles

| Role | Permissions |
|------|-------------|
| Admin | Full access, integrations, team management |
| Sales Manager | Leads, assignments, reports |
| Sales Agent | Assigned leads, calls, follow-ups, shares |
| Field Executive | Attendance, site visits |
| Social Media Manager | Content calendar |

## Service Adapters

All external integrations use adapter services with production + dry-run modes:

- `callService` — Twilio bridge calls
- `messageService` — WhatsApp/SMS via Twilio
- `brevoEmailService` — Brevo SMTP (team invites + transactional)
- `invitationService` — Invite token lookup + accept flow
- `emailVerificationService` — OTP request/verify API (separate from team invites)
- `leadAssignmentService` — Round-robin, least-busy, manual
- `propertyShareService` — Share links + messaging
- `attendanceService` — GPS check-in/out
- `socialPostService` — AI captions + webhook publish

## License

MIT
