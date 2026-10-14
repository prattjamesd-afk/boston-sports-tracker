# Boston Sports Tracker — Project State

## 1. Core Parameters
* **Target Platform:** Mobile-first Progressive Web App (PWA)
* **Tech Stack:** Vanilla HTML/CSS/JS, Vercel Serverless Function (`/api/games.js`), ESPN public API endpoints
* **Version Control & CI/CD:** GitHub repository linked to Vercel production branch (`main`)
* **WIP Limit:** Maximum 2 active items

---

## 2. Kanban Board

### Live / Shipped
* **Team-Specific Filter Pill & Accent Styling:** Styled active filter pills and card headers to match team colors (Red Sox crimson `#BD3039`, Celtics green `#008348`, Bruins gold `#ffb81c` with dark navy text, and Patriots blue `#1d4ed8` / `#3b82f6`).
* **iOS Standalone PWA Data Refresh & Cache Busting:** Resolved WebKit standalone caching with `max-age=0, no-cache` headers in `api/games.js`, timestamp query cache-busting (`?_t=`) with live `SYNCED [Time]` indicator in `index.html`, and standalone touch pull-to-refresh gesture handling (commit `ad894d7`).
* **PWA Standalone App Icons & Polish:** Configured standalone PWA manifest, iOS home screen display, and dark status bar theme styling (commit `40efb71`).
* **Push / Game Start Badges:** Extracted `status` (`'pre'`, `'in'`, `'post'`) in `api/games.js`; implemented animated `.badge-live` indicator in `index.html` card footer.
* **PWA Offline Service Worker Caching:** Implemented network-first navigation fallback and stale-while-revalidate caching in `sw.js` (commit `2c7fc1b`).
* **TASK-15:** Stitch UI redesign (navy background, rounded cards, team color accents, badge glass styling).
* **Local Dev Runtime:** Established local testing environment via `npx vercel dev` on `http://localhost:3000` / `3001`.
* **Off-Season Fallback Handling:** Resolved syntax errors in `renderView()` and filtered single-team views using `isUpcoming`.

### In Progress (WIP)
* *None — All planned MVP features shipped!*

### Backlog
* Standalone splash screen optimization
* Push Notifications exploration

---

## 3. Current Session Checkpoint
* **Production State:** Deployed to `https://boston-sports-tracker.vercel.app/` and verified working across macOS Safari, iOS Safari, and iOS Home Screen standalone PWA.
* **iOS Cache Reset Procedure:** If iOS Safari or the Home Screen PWA ever holds onto an old Service Worker cache after a major update, remove the Home Screen icon, delete `vercel.app` and `vercel.com` under **iPhone Settings -> Apps -> Safari -> Advanced -> Website Data**, reload `https://boston-sports-tracker.vercel.app/` in Safari, and re-add to Home Screen.
