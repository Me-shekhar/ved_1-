# CathShield.ai Mobile Suite

Hospital-grade, mobile-first catheter surveillance workflow built with Next.js App Router, Prisma, and MySQL. The app enforces the mandatory sequence Patient → Consent → Capture → Dashboard → Alerts → Ward Analytics → Resource Module while keeping all UI spacing, typography, and colors consistent with the CathShield specification.

## Getting started

1. **Install dependencies**

	```bash
	npm install
	```

2. **Configure environment**

	Create `.env` with your MySQL connection:

	```bash
	DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
	```

3. **Create & seed the database**

	```bash
	npx prisma migrate dev --name init
	npm run db:seed
	```

	The seed script provisions sample patients, risk snapshots, ward metrics, and resource metrics so the dashboards render immediately.

4. **Run the dev server**

	```bash
	npm run dev
	```

5. **Build & start (Vercel parity)**

	```bash
	npm run build
	npm start
	```

## Key folders

- `app/` - App Router routes for each workflow step plus API handlers under `app/api/**` (Vercel-ready serverless functions).
- `components/` - Mobile-first UI primitives (cards, nav, modals, trend chart, alerts).
- `context/WorkflowContext.tsx` - Enforces sequential workflow state, persisted in localStorage.
- `lib/` - Prisma client, deterministic risk engine, alert helpers, fetch utilities.
- `prisma/` - Database schema + `seed.ts` for mock operational data.
- `public/audio/` - Placeholder consent audio assets (replace with validated recordings before production).

## Risk & analytics logic

- `lib/riskEngine.ts` contains deterministic heuristics for CLISA, traction, patient/systemic factors, and dwell time. Replace the TODO sections with AI/vision outputs when available.
- `lib/alerts.ts` derives CLABSI / venous / traction / dressing / resource alerts and feeds `/api/alerts`.
- `app/api/dashboard`, `app/api/ward-metrics`, and `app/api/resource-metrics` expose REST endpoints consumed via SWR on mobile screens.

## Deployment (Vercel)

1. **Configure environment variables** in the Vercel dashboard:
	- `DATABASE_URL` - production MySQL (PlanetScale, Neon for MySQL, etc.).

2. **Build command**: `npm run build`

3. **Install command**: `npm install`

4. **Run command**: `npm start`

5. **Prisma on Vercel**:
	- Run `npx prisma migrate deploy` against the production database after pushing migrations.
	- Seeding can be executed locally via `npm run db:seed` (avoid running in serverless environments by default).

## Audio consent

The repo ships with short placeholder WAV files to enforce the consent workflow. Replace `public/audio/consent-en.wav` and `public/audio/consent-vernacular.wav` with hospital-approved voiceovers before clinical use.

## Testing & linting

- `npm run lint` - Next.js + ESLint config.
- `npm run db:migrate` / `npm run db:deploy` - Prisma helpers for local vs production migrations.

## Notes

- Patient privacy banner appears on first load; patient identity is limited to Bed No. + initials across the UI.
- All layouts are tuned for 320-430 px mobile screens with consistent Tailwind spacing and teal/medical-blue + risk (G/Y/R) colors.
- Offline/poor connectivity states surface via inline status text; extend with real toasts as needed.
