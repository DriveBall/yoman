# Yoman: shared gym and food log

A Hebrew, right-to-left, phone-first web app that Victor and his partner Racheli use daily to log exercises, food and weight, and to see each other's progress. It is live with real data. Treat every change as a production change.

- Live site: https://driveball.github.io/yoman/ (GitHub Pages, deployed from `main`)
- Repository: DriveBall/yoman
- Data: Firebase project `yoman-kosher`, Cloud Firestore, Spark (free) plan

## Working with the owner

- Victor is the owner. Reply in Hebrew and address him in the masculine.
- In-app system text is gender-neutral. Text addressed to a named person uses that person's gender: Victor masculine, Racheli feminine.
- He prefers short answers, then a list of what to check on his iPhone. Do not run long exploratory test rounds: run the suites below and one look at screenshots.
- Before deploying anything that changes how data is written, tell him that both phones must close and reopen the app soon after, because an old cached copy could write in the old way.

## Hard rules

1. **Never write the access code into any file in this repository**, a commit message, or a test. The code is the only thing that protects the data: Firestore rules allow read and write only under `spaces/<code>/**`, and the repository is public. Tests use the fake codes `testcode123` and `auditcode1`.
2. **Writes are partial, never a whole day.** Add with `arrayUnion`, delete with `arrayRemove` of the exact stored item, edit with a batch of remove plus union, weight and note with `set(..., {merge:true})`, profile fields with `update`. Use the existing helpers (`patchDay`, `addItems`, `removeItem`, `replaceItem`, `setDayFields`, `addMeals`, `splitMeal`, `saveProfile(wire,local)`, `runOp`). Rewriting a whole day loses the other phone's entries.
3. **Bump the cache name in `sw.js`** (`const C='yoman-vN'`) on every deploy. Files in `vendor/`, `ex/` and the icons are served cache-first; if you add exercise photos, also raise the count in the `EX` list.
4. **Do not link a billing account** in Firebase. It would move the project to the paid Blaze plan.
5. Design follows the Hallmark rules (`theme: Sport, one colour per person`):
   - Colours only through tokens.
   - No middle-dot (" · ") strings, no eyebrow labels, no emoji as icons. The four reaction emoji are the one documented exception.
   - Targets at least 44px, inputs at least 16px.

   Lint with Hallmark's `sloplint.mjs` from https://github.com/nutlope/hallmark: run `node <hallmark>/skills/hallmark/scripts/sloplint.mjs index.html`; it must report 0 FAIL.

## Owner decisions

**Keep:**
- Exercise photos, templates, next-weight suggestion, PR marks (heaviest weight, or best reps for bodyweight; no volume PRs).
- Plate calculator, barcode scan with Open Food Facts, name search, household units, macros.
- Daily calorie and protein targets set once per person, weekly goal 1 to 7 workouts with goal history.
- Weekly barbell, reward, nudges, reactions, the year recap (hidden; it shows only 20 Dec to 10 Jan as a gold dot on the barbell).
- Shared meals, plates, shared table, home recipes.
- Fixed theme per person: Victor light (`concrete`), Racheli dark purple (`rose`).

**Do not add back:** workout duration or type, colour switcher, rest timer, water, body measurements, data export or backup, sharing or privacy controls, a login system.

**Food entry:** "לספר ל־Claude" is the main way in, alongside barcode scan, name or barcode search and the usual-food chips. Manual entry, "צלחת בלי Claude", "כמו ביום קודם" and saved recipes sit under collapsed sections.

## Files

- `index.html`: the whole app, with its inline CSS and JS.
- `sw.js`: the service worker:
  - precache, network-first navigation with a 3 second fallback
  - cache-first for `vendor/`, `ex/` and icons
  - fragments stripped from cache keys
- `manifest.json` and the `icon-*.png` files: the home-screen app.
- `vendor/`:
  - Firebase compat 10.14.1, self-hosted
  - `barcode-ponyfill.js` and `zxing_reader.wasm`, the barcode reader used when the browser has no native one
- `ex/NN.jpg`: exercise photos from free-exercise-db (public domain). The `EX_IMG` map in `index.html` links Hebrew names to files; `EXERCISES` holds the groups.
- `claude-pages/`: the source of the pages that run inside Claude (see below).
- `tests/`: Playwright suites (see below).

## Data model (Firestore, under `spaces/<code>/`)

- `people/{victor|racheli}`: name, slot, goals (`workouts`, `kcal`, `protein`, `weight`), `goalHistory`, templates, increments.
- `people/{id}/days/{YYYY-MM-DD}`: date, weight, weightAt, note, `exercises[]`, `meals[]`. `workouts[]` is legacy and only read.
  - **Exercise:** id, at, name, sets, `rows[{reps,kg}]`.
  - **Meal:** id, at, meal (בוקר/צהריים/ערב/נשנוש), name, kcal, protein, carbs, fat.
  - **Meal, optional fields:**
    - grams, qty, unit, barcode, recipe
    - share, sharedWith or sharedBy
    - `parts[]` for a plate: name, amount, grams, macros, `src`, size
    - table
- `products/{barcode}`: a product's per-100 values, units, last quantity. Shared by both people.
- `recipes/{id}`: name, servings, `ingredients[]` with per-100 values.
- `reactions/{from}_{itemId}`, `nudges/{to}`, `shared/reward`.
- `tables/{id}`: shared table. The owner's plate is saved for the owner; the partner gets a card on that date to choose a portion of each dish.

The app's day runs from 06:00 to 06:00 (`DAY_START_HOUR` in `index.html`): anything logged before 06:00 goes to the previous date, and the day rail, week counts and "today" follow the same rule.

Numbers from Firestore are coerced on read (`normDay`, `normItem` and the related helpers), and user text is always escaped with `esc()` before HTML.

## Pages inside Claude (`claude-pages/`)

These run inside claude.ai so they can use the viewer's Claude subscription at no extra cost. A page outside Claude cannot call Claude. They hand data to the app through a link.

- `tell-claude.html` is published at https://claude.ai/artifact/SJ29RfbqxbbN9kdiLwrpZN (`PHOTO_URL` in `index.html`).
  - Free text plus up to 3 photos. Claude returns a meal or a recipe, and may ask one question.
  - It sends the result to the app as `#ai=` + JSON `{v:1, kind:'meal'|'recipe', name, items:[{name, amount, grams, kcal, protein, carbs, fat}], servings, shared}`.
  - For a meal, item values are for the amount eaten. For a recipe, they are for the whole pot.
- `recipe-redirect.html` is published at https://claude.ai/artifact/NLQ4ctBxTjwHVFV1uQJnZf and only points to the page above.
- The app also accepts the older `#meal=` and `#recipe=` links, plus `#k=<code>`, which stores the code and is then stripped from the address.
- The pages are private claude.ai artifacts. To change one, edit the file here and republish it to the same URL with the Artifact tool. Racheli needs it shared with her from the page's Share menu.

## Tests

Install Playwright with `npm i playwright` (Chromium must be available). Then run, from `tests/`:

```
node logic-t.js
node model-t.js
node smoke-t.js
node plate-t.js
node night-t.js
cd real && node real-t.js
```

- **`harness.js`:** loads the real `index.html` with a mocked Firestore that has real-SDK write semantics, and mocked Open Food Facts.
  - `open({user, width, height, camera, date, seed, preinit, expose})`.
  - `expose:true` puts internals on `window.__t`.
- **`logic-t`:** one scenario per audit fix.
- **`model-t`:** two browser contexts writing to one fake server, for lost-update and race checks.
- **`smoke-t`:** 390 and 320 widths, both people, console errors, horizontal scroll.
- **`plate-t`:** plates, `#ai=` import, shared table.
- **`real/real-t`:** the real Firebase SDK from `vendor/` and the real `sw.js`, with Firestore unreachable. Covers offline writes, precache and the timeout. It makes its own TLS certificate with openssl.
- **`perf-t`:** 730 days of data; target under 100 ms per render on the log tab at 4x CPU throttle.

Nothing in the tests can reach the real project.

## Deploying

1. Run the suites and sloplint.
2. Bump the `sw.js` cache name.
3. Commit and push to `main`. The branch `wip-audit-fixes` is a backup and can be kept in step.
4. GitHub Pages sometimes fails with "Deployment failed, try again later". If the live `sw.js` still shows the old cache name a few minutes after a push, check https://github.com/DriveBall/yoman/actions and push an empty commit to retrigger.
5. Confirm by fetching `https://driveball.github.io/yoman/sw.js?v=<anything>` and reading the cache name.

## Open items

- **Pending decision, awaiting Victor's answer:** a meal marked "אכלנו ביחד" through Claude is saved only for the person who logged it. Racheli gets a "שולחן משותף" card only on her phone, only when she views that date, and nothing reaches her log until she accepts it. Victor expected it to appear in her log automatically. The proposed change:
  - Write the shared plate straight into the partner's day with a partial write, marked as coming from the other person, so it can be edited or deleted.
  - Open question: should the default be the same amounts as the logger's, or one portion of each dish?
- **Not yet checked on a real iPhone:**
  - offline force-quit recovery
  - camera and torch in home-screen mode
  - the keyboard over bottom sheets
  - swipe-back
  - wake lock
  - real Claude calls from the pages
  - two phones at once
- **Not done on purpose so far:**
  - expiry of a workout left open for hours
  - a first-run "Racheli has not joined" prompt
  - per-person last quantity of a product
  - a read window for history: all days are loaded, with a limit of 1000 days per person
  - a Content Security Policy
