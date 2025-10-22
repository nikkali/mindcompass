# MindCompass

MindCompass is a lightweight, client-side web app that turns the Solana scalp-wallet hunting
workflow into a repeatable pipeline. Capture candidates from Birdeye, verify activity with
Solscan, score them with a 10-point rubric, and promote the best performers into a follow list
with alert checklists—all inside a single dashboard that stores everything locally in your
browser.

## Features

- **Wallet pipeline.** Organise addresses into Watch (candidates) and Follow (proven) columns.
- **Discovery checklist.** Track repeat appearances, liquidity discipline, and other pass/fail
  heuristics from the scouting process.
- **10-point scoring card.** Rate activity rate, liquidity discipline, holding time, venue
  consistency, and drawdown control to decide when a wallet is ready to mirror.
- **Observations & trade log.** Record manual notes, import real trades from Birdeye/Solscan, or
  log paper-mirrored executions.
- **Follow-through alerts.** Mark when you have enabled Solscan watchlists, alerts, and Birdeye
  monitors, and copy a ready-made checklist for teammates.
- **Portable storage.** All data lives in `localStorage` with one-click JSON export/import.
- **Optional live data.** Provide Birdeye and Solscan API keys to pull recent trades directly into
  the trade log.

## Getting started

1. **Download or clone the repo.** Grab the project ZIP from GitHub (or run
   `git clone <repo-url>` if you have Git installed) and extract it somewhere convenient.
2. **Open the dashboard.** Double click `index.html` (or serve the folder with any static web
   server, e.g. `python -m http.server`) to launch the MindCompass UI in your browser.
3. **Optional: configure live data.** Expand “Configure live data” in the header to paste your
   Birdeye `x-api-key` and Solscan token. They never leave your machine and simply unlock the import
   buttons on each wallet card.
4. **Seed candidates.** Drop wallet addresses into the “Hunt & seed” form as you discover them on
   Birdeye. Use tags/labels to capture why the wallet looks interesting.
5. **Work the pipeline.** For every wallet card: tick the scouting checklist, assign scores across
   the rubric, add observations, and log trades (manual or imported). Promote the address to
   **Follow** once it hits your 7/10 threshold.
6. **Stay organised.** Copy the alert checklist when you enable Solscan watchlists or Birdeye live
   views, and periodically export your data as JSON so you can share or restore it later.

> **Note:** API integrations rely on Birdeye’s `/defi/wallet_trades` endpoint and Solscan’s
> `/account/transactions` endpoint. If a request fails (missing key, network, rate limit) the app
> simply reports the error and leaves your existing data untouched.

## Usage walkthrough

- **Header controls:** Manage storage (export/import/clear), toggle light/dark modes, and open the
  live data configuration modal.
- **Hunt & seed drawer:** Capture discovery context—source link, token, venue, ticket size, and
  first impressions.
- **Watch vs Follow columns:** Drag cards between stages as you validate performance. Each card
  preserves checklist status, scores, and trade history.
- **Trade logger:** Add manual entries or fetch recent activity via the Birdeye/Solscan import
  buttons once API keys are set.
- **Alerts & checklist:** Mark when you have created Solscan watchlists, enabled alerts, or pinned
  wallets in Birdeye so you always know which addresses are fully monitored.

## Development

The project is a static site—no build tooling required. Update the HTML/CSS/JS files directly and
open `index.html` to test changes.

## Repository status

This workspace only contains the local Git repository. The files are versioned with Git commits, but
they are not automatically pushed anywhere—you would still need to add a remote (e.g. your GitHub
fork) and `git push` if you want the app to appear on GitHub.

## License

This project is released under the MIT License.
