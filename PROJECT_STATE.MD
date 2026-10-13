# Boston Sports Tracker — Project State

## 1. Core Parameters
* **Target Platform:** Mobile-first Progressive Web App (PWA)
* **Tech Stack:** Vanilla HTML/CSS/JS, Vercel Serverless Function (`/api/games.js`), ESPN public API endpoints
* **Version Control & CI/CD:** GitHub repository linked to Vercel production branch
* **WIP Limit:** Maximum 2 active items

---

## 2. Kanban Board

### Live / Shipped
* **TASK-15:** Stitch UI redesign (navy background, rounded cards, team color accents, badge glass styling).
* **Local Dev Runtime:** Established local testing environment via `npx vercel dev` on `http://localhost:3000`.
* **Off-Season Fallback Handling:** Resolved syntax errors in `renderView()` and filtered single-team views using `isUpcoming` so MLB off-season displays the fallback card instead of past games.

### In Progress (WIP 1)
* **Git Commit & Production Deployment:** Commit verified local changes in `index.html` and `api/games.js` to GitHub and verify automated Vercel production build.

### Next Up (WIP 2)
* **Multi-Team Live Schedule Audit:** Verify live schedule cards and broadcast badges across Celtics (NBA), Bruins (NHL), and Patriots (NFL) during active game weeks.

### Backlog
* **PWA Offline Service Worker Caching:** Verify cache strategies in `sw.js` for standalone home screen installs.
* **Push / Game Start Badges:** Explore visual status tags for in-progress games (Live / Final).

---

## 3. Current Session Checkpoint
* **Local State:** Tested and working on `http://localhost:3000` with 0 console/syntax errors.
* **Red Sox State:** Correctly displaying `"Red Sox are currently in the off-season"` with icon placeholders.
* **Next Action:** Push local changes to GitHub (`git add .`, `git commit`, `git push origin main`).
