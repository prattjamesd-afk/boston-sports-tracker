# Boston Sports Tracker — Project State

## 1. Core Parameters
* **Target Platform:** Mobile-first Progressive Web App (PWA)
* **Tech Stack:** Vanilla HTML/CSS/JS, Vercel Serverless Function (`/api/games.js`), ESPN public API endpoints
* **Version Control & CI/CD:** GitHub repository linked to Vercel production branch
* **WIP Limit:** Maximum 2 active items

---

## 2. Kanban Board

### Live / Shipped
* **Push / Game Start Badges (WIP 1):** Extracted `status` (`'pre'`, `'in'`, `'post'`) in `api/games.js`; implemented animated `.badge-live` indicator in `index.html` card footer.
* **PWA Offline Service Worker Caching:** Implemented network-first navigation fallback and stale-while-revalidate caching in `sw.js` (commit `2c7fc1b`).
* **TASK-15:** Stitch UI redesign (navy background, rounded cards, team color accents, badge glass styling).
* **Local Dev Runtime:** Established local testing environment via `npx vercel dev` on `http://localhost:3000` / `3001`.
* **Off-Season Fallback Handling:** Resolved syntax errors in `renderView()` and filtered single-team views using `isUpcoming`.

### In Progress (WIP 2)
* **PWA Standalone App Icons & Polish:** Verify Apple Touch Icons and splash manifest display for iOS Home Screen bookmarking.

### Backlog
* Push Notifications exploration
* Scoreboard / Post-Game Final tag


---

## 3. Current Session Checkpoint
* **Production State:** Commit ready for push with verified in-progress live badges.
* **Local Workspace:** `api/games.js`, `index.html`, and `PROJECT_STATE.MD` updated.
* **Active Task:** Transitioning to WIP 2 — PWA Standalone App Icons & Polish.
* **Next Action:** Verify `manifest.json` and Apple Touch Icon link tags in `index.html`.

