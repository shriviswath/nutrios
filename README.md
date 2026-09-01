<<<<<<< HEAD
# Nutri OS

A local-first calorie, macro and weight tracker built around one idea:

> Don't just count calories. Learn how your body responds to what you eat.

Everything lives in your browser's IndexedDB. No account, no server, no sync, works offline
after the first load. The differentiator is the adaptive engine: after about two weeks of
logging it stops using a textbook formula for your maintenance calories and starts measuring
them from your own intake and weight trend.

Built with Next.js 15 (App Router, static export), TypeScript, Tailwind v4 and Dexie.
Runtime dependencies: `next`, `react`, `react-dom`, `dexie`, `dexie-react-hooks`. That's all.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 21 tests over the calculation engines
npm run build      # static export into ./out
```

Node 20 or newer.

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo.
3. Accept the defaults. Framework preset is detected as Next.js; there is no build
   configuration to change and no environment variables to set.
4. Deploy.

`next.config.mjs` sets `output: "export"`, so the whole app ships as static files. There is no
server runtime, no serverless function and no database bill — the app costs nothing to run
beyond bandwidth.

**Installing it as an app:** open the deployed URL on your phone and use *Add to Home Screen*.
The manifest and service worker are already in `public/`.

---

## What's in it

| Area | Status |
|---|---|
| Profile, BMR, TDEE, calorie and macro targets | Done |
| Food database (~125 foods, South Indian weighted) | Done |
| Search with recency/frequency ranking, favourites | Done |
| Diary with four meal slots, inline quantity editing | Done |
| Saved meals, copy yesterday's meal, copy whole day | Done |
| Custom foods with a "these numbers don't add up" check | Done |
| Recipe builder with cooked-weight correction | Done |
| Barcode scanning + Open Food Facts lookup | Done (needs network, degrades gracefully) |
| Voice and natural-language meal entry | Done, offline and rule-based |
| Weight logging, trend smoothing, goal projection | Done |
| Exercise logging with MET estimates | Done |
| Charts, weekly report, adherence | Done |
| Adaptive TDEE and calorie target recommendations | Done |
| Micronutrients with data-coverage reporting | Done |
| Backup export / restore / erase | Done |
| Photo meal recognition | Interface only — see below |

---

## How the numbers work

### Targets

Resting rate uses Mifflin-St Jeor. Maintenance starts as `BMR × activity factor`, and the goal
rate becomes a daily energy delta at 7,700 kcal per kilogram.

Two guards apply before a target is ever shown:

- The deficit is capped at 25% of maintenance, the surplus at 20%.
- The result is floored at 1,500 kcal (male) / 1,200 kcal (female).

Anything that gets clamped says so, in plain language, with the reason. Rates above 1% of body
weight per week and loss goals starting below a BMI of 18.5 produce a warning pointing at a
clinician rather than a silently accepted number.

### Weight trend

Day-to-day scale noise from water, glycogen and gut content is routinely ±1 kg, which is larger
than a week of real fat loss. Two separate things are computed:

- **Trend weight** — a time-aware exponentially weighted average, `alpha = 1 − 2^(−dt/7)`.
  Because alpha comes from the gap between weigh-ins, skipping days doesn't distort it.
- **Rate of change** — ordinary least squares over the *raw* weigh-ins, not over the smoothed
  line. Regressing the smoother is biased: it's seeded at your first reading and then lags a
  real trend, so a true 0.5 kg/week loss reads as roughly 0.35 kg/week for the first month.

### Adaptive TDEE

Energy balance, run backwards:

```
TDEE ≈ mean intake − (change in weight × 7700) / days
```

The weight change is read off the fitted regression line over the window rather than from two
smoothed endpoints, for the bias reason above. The estimate is then blended with the formula
prior in proportion to a confidence score built from three things: how long the window is, what
fraction of days were logged, and how densely you weighed in. Result is bounded to
`prior × [0.65, 1.45]` so a bad week of water retention can't produce a nonsense number, and
rounded to 5 kcal so it doesn't imply precision it doesn't have.

Minimum bar before any data is used: 14 days, 65% logging coverage, 6 weigh-ins. Below that the
app says exactly what's missing instead of guessing.

Verified against synthetic ground truth in `tests/engine.test.ts`: 28 days at 2,200 kcal while
losing 0.5 kg/week (true maintenance 2,750) recovers **2,740 kcal at 96% confidence**.

### Adaptive target

Compares your observed rate with your intended rate. Adjustments are:

- only made at confidence ≥ 0.45,
- capped at ±200 kcal,
- held for at least 7 days after any change,
- never applied silently — the reasoning is shown and you press the button.

Being within 25% of your goal rate (or 0.1 kg/week, whichever is larger) counts as on plan and
nothing moves.

### Exercise

MET-based, and deliberately *not* added back to your food target. MET tables run 20–30% high for
individuals, and the adaptive engine already picks up real training through the weight trend —
crediting it twice is the classic way to stall on a "deficit". Only the energy above resting is
counted, since sitting still is already inside your TDEE.

### Micronutrients

Summing micronutrients across a day where most calories came from foods with no data produces a
fake deficiency. Each row reports what share of the day's energy came from foods that actually
carry a value for that nutrient, and says so when coverage is below 60%. `undefined` is never
rendered as zero, anywhere in the app.

---

## Architecture

```
src/
├─ app/                      route per section, all client components
│  ├─ page.tsx               Home — gauge, meals, energy balance
│  ├─ log/                   food library, recipes, saved meals
│  ├─ insights/              charts, weekly report, adaptive engine
│  ├─ progress/              weigh-ins, trend, goal projection
│  ├─ profile/               profile, settings, backup
│  └─ onboarding/
├─ components/
│  ├─ AppShell.tsx           nav, onboarding gate, SW registration
│  ├─ ui/                    primitives.tsx, Chart.tsx
│  ├─ home/ log/ insights/ profile/
├─ lib/
│  ├─ db/                    db.ts (Dexie schema), repo.ts, backup.ts
│  ├─ nutrition/             energy, scaling, trend, adaptive, exercise, micros
│  ├─ nlp/parseMealText.ts
│  ├─ services/              openfoodfacts, barcode, speech, vision
│  ├─ report/weekly.ts
│  ├─ hooks.ts search.ts types.ts utils/
└─ data/foods.ts
```

Rules the codebase sticks to:

- **Calculation logic never touches the DOM.** Everything in `lib/nutrition` is pure functions
  over plain data, which is why it's testable without a browser.
- **Storage logic never touches React.** `lib/db/repo.ts` is the only module that writes.
  Components call it; nothing else does.
- **Nothing derived is stored.** Foods are held per 100 g/ml and scaled on read.
- **Network access is confined to `lib/services`.** Exactly one feature (barcode lookup) uses
  it, and the app is fully functional with it unavailable.

### Data model

Dexie schema in `src/lib/db/db.ts`:

| Table | Key | Notes |
|---|---|---|
| `foods` | `id` | per-100 macros + named portions; seeded once, user rows never overwritten |
| `logs` | `++id`, `[date+meal]` | snapshots name and macros so history survives food edits |
| `weights` | `++id`, `&date` | one reading per day, last write wins |
| `exercises` | `++id`, `date` | |
| `recipes` | `id` | mirrored into `foods` as `recipe_<id>` |
| `savedMeals` | `id` | |
| `usage` | `foodId` | count + lastUsed, drives search ranking |
| `profile` / `settings` | singleton | |
| `snapshots` | `++id`, `date` | audit trail for TDEE estimates |

### Why no charting library

Recharts is ~120 kB for four line plots. `components/ui/Chart.tsx` is 130 lines of SVG, matches
the design tokens, and handles gaps properly — a day with no log leaves a break in the line
instead of dropping to zero and dragging the average down.

---

## Extending it

**Photo meal recognition.** `src/lib/services/vision.ts` defines the interface and ships a
`nullVisionProvider` that throws. This is deliberate: a confident-looking wrong guess is worse
than no guess in a food log. To enable it, implement `VisionProvider`, call `setVisionProvider`,
and log results with `source: "ai"` so they're visibly marked as estimates. Note that adding a
model call means adding a server route, which ends the zero-backend property.

**Cloud sync.** The schema is already relational and every row is serialisable — see
`lib/db/backup.ts`. The clean seam is `repo.ts`: mirror writes to Supabase there, keep Dexie as
the source of truth, reconcile with `updatedAt`. Don't move reads off IndexedDB; that's what
makes it fast offline.

**IBM Plex instead of system fonts.** The layout uses system font stacks so first paint never
waits on a font CDN. To switch, add `next/font/google` imports for `IBM_Plex_Sans` and
`IBM_Plex_Mono` in `src/app/layout.tsx`, put their variables on `<html>`, and point
`--font-sans` / `--font-mono` in `globals.css` at them.

**More foods.** Add tuples to `SEED_FOODS` in `src/data/foods.ts`. New seed rows are inserted on
next launch without touching anything the user has edited. The test suite checks every entry's
macros against its calorie figure.

---

## Limitations, stated plainly

- Food values are estimates. Restaurant and home-cooked dishes vary enormously with oil; a
  kitchen scale beats any database, including this one.
- 7,700 kcal/kg treats all weight change as fat. Early changes are mostly water and glycogen,
  which is why the engine refuses to say anything for the first fortnight.
- Data lives in one browser profile. Clearing site data deletes it. Export backups.
- Barcode scanning uses the native `BarcodeDetector`, which iOS Safari doesn't implement; there
  it falls back to typing the number.
- This is a calculator and a diary, not medical advice.

## Licence

MIT.
=======
# nutrios
>>>>>>> a1760e9a3ff91aa23d48b487b201f62dea0a7665
