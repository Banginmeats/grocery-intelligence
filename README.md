# Grocery Intelligence — Automated ZIP 19966 Edition

This repository contains both the GitHub Pages dashboard and a scheduled Playwright ingestion pipeline for Giant, Harris Teeter, and Weis.

## What happens automatically

Every Wednesday morning, GitHub Actions:

1. opens each official weekly-ad page in Chromium;
2. attempts to set ZIP code `19966`;
3. captures relevant JSON network responses;
4. falls back to visible deal-card text when needed;
5. normalizes prices and promotions;
6. creates a new `data/week-YYYY-MM-DD.json` file;
7. updates `data/manifest.json`; and
8. republishes GitHub Pages.

The scraper has a safety stop: if fewer than 40 total offers are captured, it fails without replacing the existing dashboard data. Screenshots, HTML, and a JSON report are saved as workflow diagnostics.

## Put it on GitHub

1. Create an empty GitHub repository.
2. Upload the complete contents of this folder to the repository root.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. Open **Actions → Update weekly grocery ads → Run workflow** for the first test.
5. Download the diagnostic artifact if a store returns too few deals.

No secrets are required for the initial version.

## Important reliability note

Retailers can change page markup, store-selection flows, bot protections, or underlying APIs at any time. The pipeline is built to discover offers through both network data and DOM text, but it cannot guarantee that every retailer will remain scrapeable without occasional selector maintenance. It intentionally preserves the last good week when extraction fails.

## Commands

```bash
npm install
npx playwright install chromium
npm test
npm run scrape
```

Run one store while repairing an adapter:

```bash
npm run scrape:giant
npm run scrape:harris
npm run scrape:weis
```

## Current data

The existing Week 1 dataset remains included as the initial fallback so the dashboard is populated before the first successful automated run.
