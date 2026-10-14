# Boston Sports Tracker — Project State

## 1. Core Parameters
* **Target Platform:** Mobile-first Progressive Web App (PWA)
* **Tech Stack:** Vanilla HTML/CSS/JS, Vercel Serverless Function (`/api/games.js`), ESPN public API endpoints
* **Version Control & CI/CD:** GitHub repository linked to Vercel production branch (`main`)
* **WIP Limit:** Maximum 2 active items

---

## 2. Kanban Board

### Live / Shipped
* **PWA Standalone App Icons & Polish (WIP 2):** Configured standalone PWA manifest, iOS home screen display, and dark status bar theme styling (commit `40efb71`).
* **Push / Game Start Badges (WIP 1):** Extracted `status` (`'pre'`, `'in'`, `'post'`) in `api/games.js`; implemented animated `.badge-live` indicator in `index.html` card footer.
* **PWA Offline Service Worker Caching:** Implemented network-first navigation fallback and stale-while-revalidate caching in `sw.js` (commit `2c7fc1b`).
* **TASK-15:** Stitch UI redesign (navy background, rounded cards, team color accents, badge glass styling).
* **Local Dev Runtime:** Established local testing environment via `npx vercel dev` on `http://localhost:3000` / `3001`.
* **Off-Season Fallback Handling:** Resolved syntax errors in `renderView()` and filtered single-team views using `isUpcoming`.

### In Progress (WIP 1)
* **iOS Standalone PWA Data Refresh & Cache Busting:** Diagnosing and fixing iOS WebKit standalone caching. Implemented `visibilitychange` auto-sync, tap-to-sync pill on `.live-indicator`, and service worker update calls (commit `8789969`); diagnosing WebKit GET caching on `/api/games` and pull-to-refresh behavior.

### Next Up (WIP 2)
* **Scoreboard / Post-Game Final tag:** Add final game scores and completed game status indicators.

### Backlog
* Push Notifications exploration
* Standalone splash screen optimization

---

## 3. Current Session Checkpoint
* **Production State:** Commit `8789969` deployed to `main` with `sw.js` cache bypass and tap-to-sync header pill.
* **Active Issue:** Standalone iOS WebKit app does not refresh live game data reliably on reopen or manual trigger.
* **Root Hypotheses to Test in Next Session:**
  1. **WebKit HTTP GET Cache on API:** Mobile Safari caches `fetch('/api/games')` responses unless a timestamp query param (`/api/games?t=${Date.now()}`) or `Cache-Control: no-cache` header is passed.
  2. **Native Pull-to-Refresh Disabled by Standalone Mode:** iOS WebKit disables standard pull-to-refresh in standalone full-screen mode; requires either a dedicated refresh control or touch-event pull gesture implementation.
  3. **Visual Feedback Gap:** With no active games currently in progress, data updates may succeed without visible UI differences.
